import { RenditionContext } from '../navigator';
import { AudioPlayer } from './audio_player';
import { SmilIterator } from './smil_iterator';
import { MediaOverlayElementHighlighter } from './media_overlay_element_highlighter';
import { ParNode } from './smil_model';
import * as EPUBcfi from 'readium-cfi-js';
import { resolveContentRef } from './helpers';

//  LauncherOSX
//
//  Created by Boris Schneiderman.
// Modified by Daniel Weck
//  Copyright (c) 2014 Readium Foundation and/or its licensees. All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without modification,
//  are permitted provided that the following conditions are met:
//  1. Redistributions of source code must retain the above copyright notice, this
//  list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice,
//  this list of conditions and the following disclaimer in the documentation and/or
//  other materials provided with the distribution.
//  3. Neither the name of the organization nor the names of its contributors may be
//  used to endorse or promote products derived from this software without specific
//  prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
//  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
//  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
//  BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
//  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
//  OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
//  OF THE POSSIBILITY OF SUCH DAMAGE.

// tslint:disable-next-line:max-line-length
// define(["../globals", "jquery", "../helpers", "./audio_player", "./media_overlay_element_highlighter", "../models/smil_iterator", 'readium_cfi_js', './scroll_view'],
// tslint:disable-next-line:max-line-length
//     function(Globals, $, Helpers, AudioPlayer, MediaOverlayElementHighlighter, SmilIterator, EPUBcfi, ScrollView) {
/**
 *
 * @param reader
 * @param onStatusChanged
 * @constructor
 */

// tslint:disable:align
export class MediaOverlayPlayer {
  private smilIterator?: SmilIterator;
  private audioPlayer: AudioPlayer;

  private ttsIsPlaying: boolean = false;
  private currentTTS?: string;
  // set to false to force "native" platform TTS engine, rather than HTML Speech API
  private enableHTMLSpeech: boolean = true
    && typeof window.speechSynthesis !== 'undefined'
    && speechSynthesis != null;

  private speechSynthesisUtterance?: SpeechSynthesisUtterance;
  private tokenizeTTS: boolean = false;

  private embeddedIsPlaying: boolean = false;
  private currentEmbedded?: HTMLAudioElement;

  private package = reader.package();
  private settings = reader.viewerSettings();
  private elementHighlighter: MediaOverlayElementHighlighter;
  private wasPlayingAtDocLoadStart: boolean = false;
  private lastPaginationData?: any;
  private clipBeginOffset: number = 0.0;
  private blankPagePlayer: NodeJS.Timeout | undefined = undefined;

  private skipAudioEnded: boolean = false;
  private audioCurrentTime: number = 0.0;
  private directionMark: number = -999;
  private ttsStyle?: any;
  private timerTick?: number;
  private wasPlayingScrolling: boolean = false;
  private wasPausedBecauseNoAutoNextSmil: boolean = false;
  private autoNextSmil: boolean = true;
  private onStatusChanged: Function;

  constructor(rendCtx: RenditionContext, onStatusChanged: Function) {
    this.onSettingsApplied();
    this.initialzieListeners();

    this.onStatusChanged = onStatusChanged;
    this.audioPlayer = new AudioPlayer(
      this.onStatusChanged,
      this.onAudioPositionChanged,
      this.onAudioEnded,
      this.onPlay,
      this.onPause,
    );
    this.elementHighlighter = new MediaOverlayElementHighlighter(rendCtx);
  }

  public isPlaying(): boolean {
    return this.audioPlayer.isPlaying()
      || this.ttsIsPlaying
      || this.embeddedIsPlaying
      || !!this.blankPagePlayer;
  }

  private initialzieListeners(): void {
    reader.on(Globals.Events.READER_VIEW_DESTROYED, () => {
      Globals.logEvent('READER_VIEW_DESTROYED', 'ON', 'media_overlay_player.js');

      this.reset();
    });

    reader.on(Globals.Events.SETTINGS_APPLIED, () => {
      Globals.logEvent('SETTINGS_APPLIED', 'ON', 'media_overlay_player.js');
      this.onSettingsApplied();
    }, this);
  }

  public applyStyles(): void {
    this.elementHighlighter.reDo();
  }

  private onSettingsApplied(): void {
    this.audioPlayer.setRate(this.settings.mediaOverlaysRate);
    this.audioPlayer.setVolume(this.settings.mediaOverlaysVolume / 100.0);
  }

  public onDocLoadStart(): void {
    // 1) Globals.Events.CONTENT_DOCUMENT_LOAD_START
    // (maybe 2-page fixed-layout or reflowable spread == 2 documents == 2x events)
    // MOPLayer.onDocLoad()

    // 2) Globals.Events.CONTENT_DOCUMENT_LOADED
    // (maybe 2-page fixed-layout or reflowable spread == 2 documents == 2x events)
    // _mediaOverlayDataInjector.attachMediaOverlayData($iframe, spineItem, _viewerSettings);

    // 3) Globals.Events.PAGINATION_CHANGED (layout finished, notified before rest of app,
    // just once)
    // MOPLayer.onPageChanged()

    const wasPlaying = this.isPlaying();
    if (wasPlaying) {
      this.wasPlayingAtDocLoadStart = true;
      this.pause();
    }
  }

  public onPageChanged(paginationData: any): void {
    this.lastPaginationData = paginationData;

    const wasPausedBecauseNoAutoNextSmil = this.wasPausedBecauseNoAutoNextSmil;
    this.wasPausedBecauseNoAutoNextSmil = false;

    const wasPlayingAtDocLoadStart = this.wasPlayingAtDocLoadStart;
    this.wasPlayingAtDocLoadStart = false;

    if (!paginationData) {
      this.reset();
      return;
    }

    let element = undefined;
    const isCfiTextRange = false;

    const fakeOpfRoot = '/99!';
    const epubCfiPrefix = 'epubcfi';

    if (paginationData.elementId || paginationData.initiator === this) {
      const spineItems = reader.getLoadedSpineItems();

      const rtl = reader.spine().isRightToLeft();

      for (let i = (rtl ? (spineItems.length - 1) : 0);
        rtl && i >= 0 || !rtl && i < spineItems.length;
        i += (rtl ? -1 : 1)
      ) {
        const spineItem = spineItems[i];
        if (paginationData.spineItem && paginationData.spineItem !== spineItem) {
          continue;
        }

        if (paginationData.elementId && paginationData.elementId.indexOf(epubCfiPrefix) === 0) {
          this.elementHighlighter.reset(); // ensure clean DOM (no CFI span markers)

          let partial = paginationData.elementId.substr(
            epubCfiPrefix.length + 1,
            paginationData.elementId.length - epubCfiPrefix.length - 2,
          );

          if (partial.indexOf(fakeOpfRoot) === 0) {
            partial = partial.substr(fakeOpfRoot.length, partial.length - fakeOpfRoot.length);
          }
          const parts = partial.split(',');
          if (parts && parts.length === 3) {
            try {
              const cfi = parts[0] + parts[1];
              const $element = reader.getElementByCfi(
                spineItem.idref, cfi,
                ['cfi-marker', 'mo-cfi-highlight'],
                [],
                ['MathJax_Message'],
              );

              element = ($element && $element.length > 0) ? $element[0] : undefined;
              if (element) {
                if (element.nodeType === Node.TEXT_NODE) {
                  element = element.parentNode;
                }
                break;
              }
            } catch (error) {
              console.error(error);
            }
          } else {
            try {
              const $element = reader.getElementByCfi(spineItem.idref, partial,
                ['cfi-marker', 'mo-cfi-highlight'],
                [],
                ['MathJax_Message'],
              );

              element = ($element && $element.length > 0) ? $element[0] : undefined;
              if (element) {
                if (element.nodeType === Node.TEXT_NODE) {
                  element = element.parentNode;
                }
                break;
              }
            } catch (error) {
              console.error(error);
            }
          }
        }

        if (!element) {
          if (paginationData.initiator === this && !paginationData.elementId) {
            const $element = reader.getElement(spineItem.idref, 'body');
            element = ($element && $element.length > 0) ? $element[0] : undefined;
          } else {
            const $element = reader.getElementById(spineItem.idref, paginationData.elementId);
            element = ($element && $element.length > 0) ? $element[0] : undefined;
          }

          if (element) {
            break;
          }
        }
      }

      if (!element) {
        console.error(`paginationData.elementId BUT !element: ${paginationData.elementId}`);
      }
    }

    const wasPlaying = this.isPlaying() || wasPlayingAtDocLoadStart;

    // @ts-ignore
    if (!this.smilIterator || !this.smilIterator.currentPar) {
      if (paginationData.initiator !== this) {
        this.clipBeginOffset = 0.0;
        this.reset();

        if (paginationData.elementId && element) {
          if (wasPlaying || wasPausedBecauseNoAutoNextSmil) {
            paginationData.elementIdResolved = element;
            this.toggleMediaOverlayRefresh(paginationData);
          }
        } else if (wasPlaying || wasPausedBecauseNoAutoNextSmil) {
          this.toggleMediaOverlay();
        }
        return;
      }

      if (!element) {
        console.error(`!element: ${paginationData.elementId}`);
        this.clipBeginOffset = 0.0;
        return;
      }

      const moData = $(element).data('mediaOverlayData');
      if (!moData) {
        console.error(`!moData: ${paginationData.elementId}`);
        this.clipBeginOffset = 0.0;
        return;
      }

      let parToPlay = moData.par ? moData.par : moData.pars[0];

      if (moData.pars) {
        for (let iPar = 0; iPar < moData.pars.length; iPar += 1) {
          const p = moData.pars[iPar];

          if (paginationData.elementId === p.cfi.smilTextSrcCfi) {
            parToPlay = p;
            break;
          }
        }
      }

      this.playPar(parToPlay);
      return;
    }

    const noReverseData = !this.smilIterator.currentPar.element
      && !this.smilIterator.currentPar.cfi;
    if (noReverseData) {
      console.error('!! this.smilIterator.currentPar.element ??');
    }

    if (paginationData.initiator === this) {
      const notSameTargetID = paginationData.elementId
        && paginationData.elementId !== this.smilIterator.currentPar.text.srcFragmentId;

      if (notSameTargetID) {
        // tslint:disable-next-line:max-line-length
        console.error('!! paginationData.elementId !== this.smilIterator.currentPar.text.srcFragmentId');
      }

      if (notSameTargetID || noReverseData) {
        this.clipBeginOffset = 0.0;
        return;
      }

      if (wasPlaying) {
        this.highlightCurrentElement();
      } else {
        this.playCurrentPar();
      }
    } else {
      if (!wasPlaying && !wasPausedBecauseNoAutoNextSmil) {
        this.reset();
        return;
      }

      if (paginationData.elementId && !element) {
        return;
      }

      if (paginationData.elementId) {
        paginationData.elementIdResolved = element;
      }

      this.toggleMediaOverlayRefresh(paginationData);
    }
  }

  public playPar(par: ParNode): void {
    const parSmil = par.getSmil();
    if (!this.smilIterator || this.smilIterator.smil !== parSmil) {
      this.smilIterator = new SmilIterator(parSmil);
    } else {
      this.smilIterator.reset();
    }

    this.smilIterator.goToPar(par);

    if (!this.smilIterator.currentPar) {
      console.error('playPar !this.smilIterator.currentPar');
      return;
    }

    this.playCurrentPar();
  }

  private initBlankPagePlayer(): void {
    this.resetBlankPage();

    this.blankPagePlayer = setTimeout(() => {
      if (!this.blankPagePlayer) {
        return;
      }

      this.resetBlankPage();

      if (!this.smilIterator || !this.smilIterator.currentPar) {
        this.reset();
        return;
      }

      this.audioCurrentTime = 0.0;
      const audioNode = this.smilIterator.currentPar.audio;
      if (audioNode) {
        this.onAudioPositionChanged(audioNode.clipEnd + 0.1, 2);
      }
    }, 2000);

    this.onStatusChanged({ isPlaying: true });
  }

  public playCurrentPar(): void {
    this.wasPlayingScrolling = false;

    if (!this.smilIterator || !this.smilIterator.currentPar) {
      console.error('playCurrentPar !this.smilIterator || !this.smilIterator.currentPar ???');
      return;
    }

    if (!this.smilIterator.smil.id) {
      this.audioPlayer.reset();

      this.resetTTS();
      this.resetEmbedded();

      setTimeout(() => {
        this.initBlankPagePlayer();
      }, 100);

      return;
    }
    if (this.smilIterator.currentPar.audio && !this.smilIterator.currentPar.audio.src) {
      this.clipBeginOffset = 0.0;
      this.audioPlayer.reset();

      const element = this.smilIterator.currentPar.element;
      if (element) {
        this.audioCurrentTime = 0.0;
        const name = element.nodeName ? element.nodeName.toLowerCase() : undefined;

        if (name === 'audio' || name === 'video') {
          this.resetTTS();
          this.resetBlankPage();

          if (this.currentEmbedded) {
            this.resetEmbedded();
          }

          this.currentEmbedded = <HTMLAudioElement> element;
          this.currentEmbedded.pause();

          this.currentEmbedded.currentTime = 0;

          this.currentEmbedded.play();

          this.currentEmbedded.addEventListener('ended', this.onEmbeddedEnd.bind(this));

          this.embeddedIsPlaying = true;

          // gives the audio player some dispatcher time to raise the onPause event
          setTimeout(() => {
            this.onStatusChanged({ isPlaying: true });
          }, 80);
        } else {
          this.resetEmbedded();
          this.resetBlankPage();

          // .innerText (CSS display sensitive + script + style tags)
          this.currentTTS = element.textContent;
          if (!this.currentTTS || this.currentTTS === '') {
            this.currentTTS = undefined;
          } else {
            this.speakStart(this.currentTTS);
          }
        }
      }

      const cfi = this.smilIterator.currentPar.cfi;
      if (cfi) {
        this.audioCurrentTime = 0.0;
        this.resetEmbedded();
        this.resetBlankPage();

        this.elementHighlighter.reset(); // ensure clean DOM (no CFI span markers)

        const doc = cfi.cfiTextParent.ownerDocument;

        const startCFI = `epubcfi(${cfi.partialStartCfi})`;
        const infoStart = EPUBcfi.getTextTerminusInfoWithPartialCFI(startCFI, doc,
                ['cfi-marker', 'mo-cfi-highlight'],
                [],
                ['MathJax_Message']);

        const endCFI = `epubcfi(${cfi.partialEndCfi})`;
        const infoEnd = EPUBcfi.getTextTerminusInfoWithPartialCFI(endCFI, doc,
                ['cfi-marker', 'mo-cfi-highlight'],
                [],
                ['MathJax_Message']);

        // TODO: get string range to speak
        this.currentTTS = undefined;

        if (!this.currentTTS || this.currentTTS === '') {
          this.currentTTS = undefined;
        } else {
          this.speakStart(this.currentTTS);
        }
      }
    } else {
      this.resetTTS();
      this.resetEmbedded();
      this.resetBlankPage();

      const audio = this.smilIterator.currentPar.audio;
      if (audio) {
        const clipEnd = audio.clipEnd;
        const clipBegin = audio.clipBegin;
        const dur = clipEnd - clipBegin;
        if (dur <= 0 || this.clipBeginOffset > dur) {
          console.error(`### MO XXX PAR OFFSET: ${this.clipBeginOffset} / ${dur}`);
          this.clipBeginOffset = 0.0;
        }

        const audioContentRef = resolveContentRef(
          audio.src || '',
          this.smilIterator.smil.href,
        );
        const audioSource = this.package.resolveRelativeUrlMO(audioContentRef);
        const startTime = audio.clipBegin + this.clipBeginOffset;

        this.audioPlayer.playFile(audio.src || '', audioSource, startTime);
      }
    }

    this.clipBeginOffset = 0.0;

    this.highlightCurrentElement();
  }

  public nextSmil(goNext): void {
    if (!this.smilIterator) {
      return;
    }
    this.pause();

    const nextSmil = goNext
      ? this.package.media_overlay.getNextSmil(this.smilIterator.smil)
      : this.package.media_overlay.getPreviousSmil(this.smilIterator.smil);
    if (nextSmil) {
      this.smilIterator = new SmilIterator(nextSmil);
      if (this.smilIterator.currentPar) {
        if (!goNext) {
          while (!this.smilIterator.isLast()) {
            this.smilIterator.next();
          }
        }

        reader.openContentUrl(
          this.smilIterator.currentPar.text.src,
          this.smilIterator.smil.href,
          this,
        );
      }
    } else {
      console.log('No more SMIL');
      this.reset();
    }
  }

  // from
  // 1 = audio player
  // 2 = blank page
  // 3 = video/audio embbeded
  // 4 = TTS
  // 5 = audio end
  // 6 = user previous/next/escape
  private onAudioPositionChanged(position: number, from: any, skipping?: any): void { // noLetPlay
    this.audioCurrentTime = position;
    this.skipAudioEnded = false;

    if (!this.smilIterator || !this.smilIterator.currentPar) {
      return;
    }

    const parFrom = this.smilIterator.currentPar;
    const audio = this.smilIterator.currentPar.audio;
    if (!audio) {
      return;
    }

    if (position > this.directionMark && position <= audio.clipEnd) {
      return;
    }

    this.skipAudioEnded = true;

    const isPlaying = this.audioPlayer.isPlaying();
    if (isPlaying && from === 6) {
      console.debug('from userNav audioPlayer.isPlaying() ???');
    }

    const goNext = position > audio.clipEnd;

    let doNotNextSmil = !this.autoNextSmil && from !== 6 && goNext;

    // tslint:disable-next-line:max-line-length
    const spineItemIdRef = (this.smilIterator && this.smilIterator.smil && this.smilIterator.smil.spineItemId) ? this.smilIterator.smil.spineItemId : ((this.lastPaginationData && this.lastPaginationData.spineItem && this.lastPaginationData.spineItem.idref) ? this.lastPaginationData.spineItem.idref : undefined);

    if (doNotNextSmil && spineItemIdRef
      && this.lastPaginationData
      && this.lastPaginationData.paginationInfo
      && this.lastPaginationData.paginationInfo.openPages
      && this.lastPaginationData.paginationInfo.openPages.length > 1
    ) {
      const iPage = 0;

      const openPage = this.lastPaginationData.paginationInfo.openPages[iPage];
      if (spineItemIdRef === openPage.idref) {
        doNotNextSmil = false;
      }
    }

    if (goNext) {
      this.smilIterator.next();
    // position <= directionMark
    } else {
      this.smilIterator.previous();
    }

    if (!this.smilIterator.currentPar) {
      if (doNotNextSmil) {
        this.wasPausedBecauseNoAutoNextSmil = true;
        this.reset();
      } else {
        this.nextSmil(goNext);
      }
      return;
    }

    if (!this.smilIterator.currentPar.audio) {
      this.pause();
      return;
    }

    if (this.settings.mediaOverlaysSkipSkippables) {
      let skip = false;
      let parent = this.smilIterator.currentPar;
      while (parent) {
        if (parent.isSkippable && parent.isSkippable(this.settings.mediaOverlaysSkippables)) {
          skip = true;
          break;
        }
        parent = parent.parent;
      }

      if (skip) {
        console.log(`MO SKIP: ${parent.epubtype}`);

        this.pause();

        const pos = goNext
          ? this.smilIterator.currentPar.audio.clipEnd + 0.1
          : this.directionMark - 1;

        this.onAudioPositionChanged(pos, from, true); // noLetPlay
        return;
      }
    }

    if (!isPlaying &&
      (this.smilIterator.currentPar.element
        || this.smilIterator.currentPar.cfi
        && this.smilIterator.currentPar.cfi.cfiTextParent
      )
    ) {
      // tslint:disable-next-line:max-line-length
      const scopeTo = this.elementHighlighter.adjustParToSeqSyncGranularity(this.smilIterator.currentPar);
      if (scopeTo && scopeTo !== this.smilIterator.currentPar) {
        const scopeFrom = this.elementHighlighter.adjustParToSeqSyncGranularity(parFrom);
        if (scopeFrom && (scopeFrom === scopeTo || !goNext)) {
          if (scopeFrom === scopeTo) {
            do {
              if (goNext) {
                this.smilIterator.next();
              } else {
                this.smilIterator.previous();
              }
            // tslint:disable-next-line:max-line-length
            } while (this.smilIterator.currentPar && this.smilIterator.currentPar.hasAncestor(scopeFrom));

            if (!this.smilIterator.currentPar) {
              if (doNotNextSmil) {
                this.wasPausedBecauseNoAutoNextSmil = true;
                this.reset();
              } else {
                this.nextSmil(goNext);
              }

              return;
            }
          }

          if (!goNext) {
            const landed = this.elementHighlighter.adjustParToSeqSyncGranularity(
              this.smilIterator.currentPar,
            );
            if (landed && landed !== this.smilIterator.currentPar) {
              const backup = this.smilIterator.currentPar;

              let innerPar = undefined;
              do {
                innerPar = this.smilIterator.currentPar;
                this.smilIterator.previous();
              } while (
                this.smilIterator.currentPar
                && this.smilIterator.currentPar.hasAncestor(landed)
              );

              if (this.smilIterator.currentPar) {
                this.smilIterator.next();

                if (!this.smilIterator.currentPar.hasAncestor(landed)) {
                  // tslint:disable-next-line:max-line-length
                  console.error('adjustParToSeqSyncGranularity !this.smilIterator.currentPar.hasAncestor(landed) ???');
                }
              } else {
                this.smilIterator.reset();
                if (this.smilIterator.currentPar !== innerPar) {
                  // tslint:disable-next-line:max-line-length
                  console.error('adjustParToSeqSyncGranularity this.smilIterator.currentPar !=== innerPar???');
                }
              }

              if (!this.smilIterator.currentPar) {
                console.error('adjustParToSeqSyncGranularity !this.smilIterator.currentPar ?????');
                this.smilIterator.goToPar(backup);
              }
            }
          }
        }
      }
    }

    if (this.audioPlayer.isPlaying()
        && this.smilIterator.currentPar.audio.src
        && this.smilIterator.currentPar.audio.src === this.audioPlayer.getCurrentSmilSrc()
            && position >= this.smilIterator.currentPar.audio.clipBegin
            && position <= this.smilIterator.currentPar.audio.clipEnd
    ) {
      this.highlightCurrentElement();
      return;
    }

    this.playCurrentPar();
  }

  public touchInit(): boolean {
    return this.audioPlayer.touchInit();
  }

  private tokeniseTTS(element: any): any {
    const BLOCK_DELIMITERS = ['p', 'div', 'pagenum', 'td', 'table', 'li', 'ul', 'ol'];
    const BOUNDARY_PUNCTUATION = [',', ';', '.', '-', '??', '??', '?', '!'];
    const IGNORABLE_PUNCTUATION = ['"', '\'', '??', '??', '??', '??'];

    const flush = (t: any, r: any) => {
      if (t.word.length <= 0) {
        return;
      }

      const pos = t.text.length;
      r.spanMap[pos] = t.counter;
      t.text += t.word;
      t.markup +=
        `${t.html.substring(0, t.wordStart)}
          <span class="tts_off" id="tts_${t.counter}">
            ${t.html.substring(t.wordStart, t.wordEnd)}
          </span>
          ${t.html.substring(t.wordEnd, t.html.length)}
        `;
      t.word = '';
      t.html = '';
      t.wordStart = -1;
      t.wordEnd = -1;
      t.counter += 1;
    };

    const r = {
      element,
      innerHTML_tts : '',
      spanMap : {},
      text : '',
      lastCharIndex : undefined,
    };
    r.element.innerHTML_original = element.innerHTML;

    const t = {
      inTag : false,
      counter : 0,
      wordStart : -1,
      wordEnd : -1,
      text : '',
      markup : '',
      word : '',
      html : '',
    };

    const limit = r.element.innerHTML_original.length;
    let i = 0;
    while (i <= limit) {
      if (t.inTag) {
        t.html += r.element.innerHTML_original[i];
        if (r.element.innerHTML_original[i] === '>') {
          t.inTag = false;
          // if it's a block element delimiter, flush
          const blockCheck = t.html.match(/<\/(.*?)>$/);
          if (blockCheck && BLOCK_DELIMITERS.indexOf(blockCheck[1]) > -1) {
            flush(t, r);
            t.text += ' ';
          }
        }
      } else {
        if (i === limit || r.element.innerHTML_original[i].match(/\s/)) {
          flush(t, r);

          // append the captured whitespace
          if (i < limit) {
            t.text += r.element.innerHTML_original[i];
            t.markup += r.element.innerHTML_original[i];
          }
        } else if (BOUNDARY_PUNCTUATION.indexOf(r.element.innerHTML_original[i]) > -1) {
          flush(t, r);

          t.wordStart = t.html.length;
          t.wordEnd = t.html.length + 1;
          t.word += r.element.innerHTML_original[i];
          t.html += r.element.innerHTML_original[i];

          flush(t, r);
        } else if (r.element.innerHTML_original[i] === '<') {
          t.inTag = true;
          t.html += r.element.innerHTML_original[i];
        } else {
          if (t.word.length === 0) {
            t.wordStart = t.html.length;
          }
          t.wordEnd = t.html.length + 1;
          t.word += r.element.innerHTML_original[i];
          t.html += r.element.innerHTML_original[i];
        }
      }
      i += 1;
    }

    r.text = t.text;
    r.innerHTML_tts = t.markup;
    r.element.innerHTML = r.innerHTML_tts;

    return r;
  }

  private ensureTTSStyle($element: any): void {
    if (this.ttsStyle && this.ttsStyle[0].ownerDocument === $element[0].ownerDocument) {
      return;
    }

    const style = '.tts_on{background-color:red;color:white;} .tts_off{}';

    const $head = $('head', $element[0].ownerDocument.documentElement);

    this.ttsStyle = $('<style type="text/css"> </style>').appendTo($head);

    this.ttsStyle.append(style);
  }

  public speakStart(txt?: string, volume?: number): void {
    let tokenData: any = undefined;
    const curPar = this.smilIterator && this.smilIterator.currentPar
      ? this.smilIterator.currentPar
      : undefined;
    const element = curPar ? curPar.element : undefined;
    const cfi = curPar ? curPar.cfi : undefined;

    if (!volume || volume > 0) {
      // gives the audio player some dispatcher time to raise the onPause event
      setTimeout(() => {
        this.onStatusChanged({ isPlaying: true });
      }, 80);

      this.ttsIsPlaying = true;

      if (this.tokenizeTTS && element) {
        const $el = $(element);
        this.ensureTTSStyle($el);

        if (element.innerHTML_original) {
          element.innerHTML = element.innerHTML_original;
          element.innerHTML_original = undefined;
        }
        tokenData = this.tokeniseTTS(element);
      }
    }

    if (!this.enableHTMLSpeech) {
      Globals.logEvent('MEDIA_OVERLAY_TTS_SPEAK', 'EMIT', 'media_overlay_player.js');
      // resume if txt == undefined
      reader.emit(Globals.Events.MEDIA_OVERLAY_TTS_SPEAK, { tts: txt });
      return;
    }

    if (!txt && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();

      return;
    }

    const text = txt || this.currentTTS;

    if (text) {
      if (this.speechSynthesisUtterance) {
        if (this.tokenizeTTS) {
          if (this.speechSynthesisUtterance.onend) {
            this.speechSynthesisUtterance.onend({
              forceSkipEnd: true,
              target: this.speechSynthesisUtterance,
            });
          }

          this.speechSynthesisUtterance.tokenData = undefined;

          this.speechSynthesisUtterance.onboundary = undefined;
        }

        this.speechSynthesisUtterance.onend = undefined;
        this.speechSynthesisUtterance.onerror = undefined;
        this.speechSynthesisUtterance = undefined;
      }

      console.debug(`paused: ${window.speechSynthesis.paused}`);
      console.debug(`speaking: ${window.speechSynthesis.speaking}`);
      console.debug(`pending: ${window.speechSynthesis.pending}`);

      const cancelTTS = (first: any) => {
        if (first || window.speechSynthesis.pending) {
          console.debug('TTS cancel before speak');
          window.speechSynthesis.cancel();

          setTimeout(() => {
            cancelTTS(false);
          }, 5);
        } else {
          updateTTS();
        }
      };
      cancelTTS(true);

      const updateTTS = () => {
        this.speechSynthesisUtterance = new SpeechSynthesisUtterance();

        if (this.tokenizeTTS && tokenData) {
          this.speechSynthesisUtterance.tokenData = tokenData;
          this.speechSynthesisUtterance.onboundary = (event) => {
            if (!this.speechSynthesisUtterance) {
              return;
            }

            console.debug(`TTS boundary: ${event.name} / ${event.charIndex}`);
            const tokenised = event.target.tokenData;

            if (!tokenised || !tokenised.spanMap.hasOwnProperty(event.charIndex)) {
              return;
            }

            if (false && tokenised.lastCharIndex) {
              const id = `tts_${tokenised.spanMap[tokenised.lastCharIndex]}`;
              const spanPrevious = tokenised.element.querySelector(`#${id}`);
              if (spanPrevious) {
                spanPrevious.className = 'tts_off';
              }
            } else {
              [].forEach.call(
                tokenised.element.querySelectorAll('.tts_on'),
                (el: any) => {
                  console.debug(`TTS OFF ${el.id}`);
                  el.className = 'tts_off';
                },
              );
            }

            const id = `tts_${tokenised.spanMap[event.charIndex]}`;
            console.debug(`TTS charIndex ID: ${id}`);
            const spanNew = tokenised.element.querySelector(`#${id}`);
            if (spanNew) {
              console.debug('TTS ON');
              spanNew.className = 'tts_on';
            }

            tokenised.lastCharIndex = event.charIndex;
          };
        }

        this.speechSynthesisUtterance.onend = (event: {forceSkipEnd: string, target: any}) => {
          if (!this.speechSynthesisUtterance) {
            return;
          }

          console.debug('TTS ended');
          if (this.tokenizeTTS) {
            const tokenised = event.target.tokenData;

            const doEnd = !event.forceSkipEnd
              && (this.speechSynthesisUtterance === event.target)
              && (!tokenised || tokenised.element.innerHTML_original);

            if (tokenised) {
              if (tokenised.element.innerHTML_original) {
                tokenised.element.innerHTML = tokenised.element.innerHTML_original;
              } else {
                [].forEach.call(
                  tokenised.element.querySelectorAll('.tts_on'),
                  (el: any) => {
                    console.debug(`TTS OFF (end) ${el.id}`);
                    el.className = 'tts_off';
                  },
                );
              }

              tokenised.element.innerHTML_original = undefined;
            }

            if (doEnd) {
              this.onTTSEnd();
            } else {
              console.debug('TTS end SKIPPED');
            }
          } else {
            this.onTTSEnd();
          }
        };

        this.speechSynthesisUtterance.onerror = (event) => {
          if (!this.speechSynthesisUtterance) {
            return;
          }

          console.error('TTS error');
          console.debug(this.speechSynthesisUtterance.text);
          console.debug(window.speechSynthesis.paused);
          console.debug(window.speechSynthesis.pending);
          console.debug(window.speechSynthesis.speaking);

          if (this.tokenizeTTS) {
            const tokenised = event.target.tokenData;
            if (tokenised) {
              if (tokenised.element.innerHTML_original) {
                tokenised.element.innerHTML = tokenised.element.innerHTML_original;
              } else {
                [].forEach.call(
                  tokenised.element.ownerDocument.querySelectorAll('.tts_on'),
                  (el) => {
                    console.debug(`TTS OFF (error) ${el.id}`);
                    el.className = 'tts_off';
                  },
                );
              }
              tokenised.element.innerHTML_original = undefined;
            }
          }
        };

        const vol = volume || this.audioPlayer.getVolume();
        this.speechSynthesisUtterance.volume = vol;

        this.speechSynthesisUtterance.rate = this.audioPlayer.getRate();
        this.speechSynthesisUtterance.pitch = 1;

        this.speechSynthesisUtterance.text = text;

        window.speechSynthesis.speak(this.speechSynthesisUtterance);

        if (window.speechSynthesis.paused) {
          console.debug('TTS resume');
          window.speechSynthesis.resume();
        }

      };
    }
  }

  public speakStop(): void {
    const wasPlaying = this.ttsIsPlaying;

    if (wasPlaying) {
      this.onStatusChanged({ isPlaying: false });
    }

    this.ttsIsPlaying = false;

    if (!this.enableHTMLSpeech) {
      if (wasPlaying) {
        Globals.logEvent('MEDIA_OVERLAY_TTS_STOP', 'EMIT', 'media_overlay_player.js');
        reader.emit(Globals.Events.MEDIA_OVERLAY_TTS_STOP, undefined);
      }
      return;
    }

    window.speechSynthesis.pause();
  }

  private onPlay(): void {
    this.onPause();

    const func = () => {
      if (!this.smilIterator || !this.smilIterator.currentPar) {
        return;
      }

      const smil = this.smilIterator.smil; // currentPar.getSmil();
      if (!smil.mo || this.smilIterator.currentPar.audio) {
        return;
      }

      const playPosition = this.audioCurrentTime - this.smilIterator.currentPar.audio.clipBegin;
      if (playPosition <= 0) {
        return;
      }

      const smilIndex = smil.mo.smil_models.indexOf(smil);

      const smilIteratorTemp = new SmilIterator(smil);
      let parIndex = -1;
      while (smilIteratorTemp.currentPar) {
        parIndex += 1;
        if (smilIteratorTemp.currentPar === this.smilIterator.currentPar) {
          break;
        }
        smilIteratorTemp.next();
      }

      this.onStatusChanged({ playPosition, smilIndex, parIndex });
    };

    setTimeout(func, 500);

    this.timerTick = setInterval(func, 1500);
  }

  private onPause(): void {
    this.audioCurrentTime = 0.0;
    if (this.timerTick !== undefined) {
      clearInterval(this.timerTick);
    }
    this.timerTick = undefined;
  }

  private onEmbeddedEnd(): void {
    this.audioCurrentTime = 0.0;

    this.embeddedIsPlaying = false;
    if (!this.smilIterator || !this.smilIterator.currentPar) {
      this.reset();
      return;
    }

    if (this.smilIterator.currentPar.audio) {
      this.onAudioPositionChanged(this.smilIterator.currentPar.audio.clipEnd + 0.1, 3);
    }
  }

  private onTTSEnd(): void {
    this.audioCurrentTime = 0.0;

    this.ttsIsPlaying = false;

    if (!this.smilIterator || !this.smilIterator.currentPar) {
      this.reset();
      return;
    }

    if (this.smilIterator.currentPar.audio) {
      this.onAudioPositionChanged(this.smilIterator.currentPar.audio.clipEnd + 0.1, 4);
    }
  }

  private onAudioEnded(): void {
    this.onPause();

    if (this.skipAudioEnded) {
      this.skipAudioEnded = false;
      return;
    }

    if (!this.smilIterator || !this.smilIterator.currentPar) {
      this.reset();
      return;
    }

    if (this.smilIterator.currentPar.audio) {
      this.onAudioPositionChanged(this.smilIterator.currentPar.audio.clipEnd + 0.1, 5);
    }
  }

  public highlightCurrentElement(): void {
    if (!this.smilIterator) {
      return;
    }

    if (!this.smilIterator.currentPar) {
      return;
    }

    if (this.smilIterator.currentPar.text.srcFragmentId
      && this.smilIterator.currentPar.text.srcFragmentId.length > 0
    ) {
      if (this.smilIterator.currentPar.element) {

        if (!this.elementHighlighter.isElementHighlighted(this.smilIterator.currentPar)) {
          this.elementHighlighter.highlightElement(
            this.smilIterator.currentPar,
            this.package.media_overlay.activeClass,
            this.package.media_overlay.playbackActiveClass,
          );

          if (!this.wasPlayingScrolling) {
            reader.insureElementVisibility(
              this.smilIterator.currentPar.getSmil().spineItemId,
              this.smilIterator.currentPar.element,
              this,
            );
          }
        }

        return;
      }
      if (this.smilIterator.currentPar.cfi) {
        if (!this.elementHighlighter.isCfiHighlighted(this.smilIterator.currentPar)) {
          this.elementHighlighter.highlightCfi(
            this.smilIterator.currentPar,
            this.package.media_overlay.activeClass,
            this.package.media_overlay.playbackActiveClass,
          );

          if (!this.wasPlayingScrolling) {
            reader.insureElementVisibility(
              this.smilIterator.currentPar.getSmil().spineItemId,
              this.smilIterator.currentPar.cfi.cfiTextParent,
              this,
            );
          }
        }

        return;
      }
    }

    // body (not FRAG ID)
    if (this.smilIterator.currentPar.element) {
      return;
    }
    const src = this.smilIterator.currentPar.text.src;
    const base = this.smilIterator.smil.href;

    this.smilIterator = undefined;

    reader.openContentUrl(src, base, this);
  }

  public escape(): void {
    if (!this.smilIterator || !this.smilIterator.currentPar) {
      this.toggleMediaOverlay();
      return;
    }

    if (!this.isPlaying()) {
      this.play();
      return;
    }

    if (this.settings.mediaOverlaysEscapeEscapables) {
      let parent = this.smilIterator.currentPar;
      while (parent) {
        if (parent.isEscapable && parent.isEscapable(this.settings.mediaOverlaysEscapables)) {
          do {
            this.smilIterator.next();
          } while (
            this.smilIterator.currentPar
            && this.smilIterator.currentPar.hasAncestor(parent)
          );

          if (!this.smilIterator.currentPar) {
            this.nextSmil(true);
            return;
          }

          this.playCurrentPar();
          return;
        }

        parent = parent.parent;
      }
    }

    this.nextMediaOverlay();
  }

  public playUserPar(parNode: ParNode): void {
    if (this.isPlaying()) {
      this.pause();
    }
    let par = parNode;

    if (par.element || par.cfi && par.cfi.cfiTextParent) {
      const seq = this.elementHighlighter.adjustParToSeqSyncGranularity(par);
      if (seq && seq !== par) {
        const findFirstPar = (smilNode: any): any => {
          if (smilNode.nodeType && smilNode.nodeType === 'par') {
            return smilNode;
          }

          if (!smilNode.children || smilNode.children.length <= 0) {
            return undefined;
          }

          for (let i = 0; i < smilNode.children.length; i += 1) {
            const child = smilNode.children[i];
            const inPar = findFirstPar(child);
            if (inPar) {
              return inPar;
            }
          }
        };
        const firstPar = findFirstPar(seq);
        if (firstPar) {
          par = firstPar;
        }
      }
    }

    this.playPar(par);
  }

  public resetTTS(): void {
    this.currentTTS = undefined;
    this.speakStop();
  }

  public resetBlankPage(): void {
    let wasPlaying = false;

    if (this.blankPagePlayer) {
      wasPlaying = true;

      const timer = this.blankPagePlayer;
      this.blankPagePlayer = undefined;
      clearTimeout(timer);
    }
    this.blankPagePlayer = undefined;

    if (wasPlaying) {
      this.onStatusChanged({ isPlaying: false });
    }
  }

  public resetEmbedded(): void {
    const wasPlaying = this.embeddedIsPlaying;

    if (this.currentEmbedded) {
      this.currentEmbedded.removeEventListener('ended', this.onEmbeddedEnd);
      this.currentEmbedded.pause();
    }
    this.currentEmbedded = undefined;

    if (wasPlaying) {
      this.onStatusChanged({ isPlaying: false });
    }
    this.embeddedIsPlaying = false;
  }

  public reset(): void {
    this.clipBeginOffset = 0.0;
    this.audioPlayer.reset();
    this.resetTTS();
    this.resetEmbedded();
    this.resetBlankPage();
    this.elementHighlighter.reset();
    this.smilIterator = undefined;
    this.skipAudioEnded = false;
  }

  public play(): void {
    if (this.smilIterator && this.smilIterator.smil && !this.smilIterator.smil.id) {
      this.initBlankPagePlayer();
      return;
    }
    if (this.currentEmbedded) {
      this.embeddedIsPlaying = true;
      this.currentEmbedded.play();
      this.onStatusChanged({ isPlaying: true });
    } else if (this.currentTTS) {
      this.speakStart(undefined);
    } else {
      if (!this.audioPlayer.play()) {
        console.log('Audio player was dead, reactivating...');

        this.reset();
        this.toggleMediaOverlay();
        return;
      }
    }

    this.highlightCurrentElement();
  }

  public pause(): void {
    this.wasPlayingScrolling = false;

    if (this.blankPagePlayer) {
      this.resetBlankPage();
    } else if (this.embeddedIsPlaying) {
      this.embeddedIsPlaying = false;
      if (this.currentEmbedded) {
        this.currentEmbedded.pause();
      }
      this.onStatusChanged({ isPlaying: false });
    } else if (this.ttsIsPlaying) {
      this.speakStop();
    } else {
      this.audioPlayer.pause();
    }

    this.elementHighlighter.reset();
  }

  public isMediaOverlayAvailable(): boolean {
    const visibleMediaElement = reader.getFirstVisibleMediaOverlayElement();

    return typeof visibleMediaElement !== 'undefined';
  }

  public nextOrPreviousMediaOverlay(previous: any): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      if (this.smilIterator && this.smilIterator.currentPar) {
        this.play();
        return;
      }
    }

    if (!this.smilIterator) {
      this.toggleMediaOverlay();
      return;
    }

    const position = previous
      ? this.directionMark - 1
      : this.smilIterator.currentPar.audio.clipEnd + 0.1;

    this.onAudioPositionChanged(position, 6);
  }

  public nextMediaOverlay(): void {
    this.nextOrPreviousMediaOverlay(false);
  }

  public previousMediaOverlay(): void {
    this.nextOrPreviousMediaOverlay(true);
  }

  public mediaOverlaysOpenContentUrl(
    contentRefUrl: string,
    sourceFileHref: string,
    offset: number,
  ): void {
    this.clipBeginOffset = offset;
    this.smilIterator = undefined;
    reader.openContentUrl(contentRefUrl, sourceFileHref, this);
  }

  public toggleMediaOverlay(): void {
    if (this.isPlaying()) {
      this.pause();
      return;
    }

    if (this.smilIterator) {
      this.play();
      return;
    }

    this.toggleMediaOverlayRefresh(undefined);
  }

  public toggleMediaOverlayRefresh(paginationData: any): void {
    const spineItems = reader.getLoadedSpineItems();
    const rtl = reader.spine().isRightToLeft();

    let playingPar = undefined;
    const wasPlaying = this.isPlaying();
    if (wasPlaying && this.smilIterator) {
      const isScrollView = paginationData.initiator
        && paginationData.initiator instanceof ScrollView;
      if (isScrollView && this.settings.mediaOverlaysPreservePlaybackWhenScroll) {
        this.wasPlayingScrolling = true;
        return;
      }

      playingPar = this.smilIterator.currentPar;
      this.pause();
    }

    this.wasPlayingScrolling = false;
    let element = (paginationData && paginationData.elementIdResolved)
      ? paginationData.elementIdResolved
      : undefined;
    const id = (paginationData && paginationData.elementId) ? paginationData.elementId : undefined;

    if (!element) {
      if (id) {
        console.error('[WARN] id did not resolve to element?');
      }

      for (
        let i = (rtl ? (spineItems.length - 1) : 0);
        (rtl && i >= 0) || (!rtl && i < spineItems.length);
        i += (rtl ? -1 : 1)
      ) {
        const spineItem = spineItems[i];
        if (!spineItem) {
          console.error('spineItems[i] is undefined??');
          continue;
        }

        if (paginationData && paginationData.spineItem && paginationData.spineItem !== spineItem) {
          continue;
        }

        if (id) {
          const $element = reader.getElementById(spineItem.idref, id);
          element = ($element && $element.length > 0) ? $element[0] : undefined;
        } else if (spineItem.isFixedLayout()) {
          if (paginationData
            && paginationData.paginationInfo
            && paginationData.paginationInfo.openPages
          ) {
            // openPages are sorted by spineItem index, so the smallest index on display is the one
            // we need to play (page on the left in LTR, or page on the right in RTL progression)
            const index = 0;

            if (paginationData.paginationInfo.openPages[index]
              && paginationData.paginationInfo.openPages[index].idref
              && paginationData.paginationInfo.openPages[index].idref === spineItem.idref
            ) {
              const $element = reader.getElement(spineItem.idref, 'body');
              element = ($element && $element.length > 0) ? $element[0] : undefined;
            }
          }
        }

        if (element) {
          break;
        }
      }
    }

    if (!element) {
      element = reader.getFirstVisibleMediaOverlayElement();
    }

    if (!element) {
      this.reset();
      return;
    }

    let moData = $(element).data('mediaOverlayData');

    if (!moData) {
      let foundMe = false;
      const depthFirstTraversal = (elements: any[]) => {
        if (!elements) {
          return false;
        }

        for (let i = 0; i < elements.length; i += 1) {
          if (element === elements[i]) {
            foundMe = true;
          }

          if (foundMe) {
            const d = $(elements[i]).data('mediaOverlayData');
            if (d) {
              moData = d;
              return true;
            }
          }

          const found = depthFirstTraversal(elements[i].children);
          if (found) {
            return true;
          }
        }

        return false;
      };

      let root = element;
      while (root && root.nodeName.toLowerCase() !== 'body') {
        root = root.parentNode;
      }

      if (!root) {
        this.reset();
        return;
      }

      depthFirstTraversal([root]);
    }

    if (!moData) {
      this.reset();
      return;
    }

    const zPar = moData.par ? moData.par : moData.pars[0];
    const parSmil = zPar.getSmil();
    if (!this.smilIterator || this.smilIterator.smil !== parSmil) {
      this.smilIterator = new SmilIterator(parSmil);
    } else {
      this.smilIterator.reset();
    }

    this.smilIterator.goToPar(zPar);

    if (!this.smilIterator.currentPar && id) {
      this.smilIterator.reset();
      this.smilIterator.findTextId(id);
    }

    if (!this.smilIterator.currentPar) {
      this.reset();
      return;
    }

    if (wasPlaying && playingPar && playingPar === this.smilIterator.currentPar) {
      this.play();
    } else {
      this.playCurrentPar();
    }
  }

  public isPlayingCfi(): boolean {
    return this.smilIterator && this.smilIterator.currentPar && this.smilIterator.currentPar.cfi;
  }

  public setAutomaticNextSmil(autoNext: boolean): void {
    this.autoNextSmil = autoNext;
  }
}
