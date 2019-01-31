import { SeqNode, ParNode } from './smil_model';
import { RenditionContext } from '../navigator';

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

/**
 *
 * @param reader
 * @constructor
 */
export class MediaOverlayElementHighlighter {

  public includeParWhenAdjustingToSeqSyncGranularity: boolean = true;

  readonly defaultMOActiveClass: string = 'mo-active-default';
  readonly defaultMOSubSyncClass: string = 'mo-sub-sync';

  private highlightedElementPar?: ParNode;
  private highlightedCfiPar?: ParNode;

  private activeClass: string = '';
  private playbackActiveClass: string = '';

  private reader = undefined;

  readonly highlightID: string = 'MO_SPEAK';

  private $userStyle?: any;

  public isElementHighlighted(par: ParNode): boolean {
    return !!this.highlightedElementPar && par === this.highlightedElementPar;
  }

  public isCfiHighlighted(par: ParNode): boolean {
    return !!this.highlightedCfiPar && par === this.highlightedCfiPar;
  }

  constructor(rendCtx: RenditionContext) {
    this.reader = undefined;
  }

  public reDo(): void {
    if (this.$userStyle) {
      this.$userStyle.remove();
    }
    this.$userStyle = undefined;

    const he = this.highlightedElementPar;
    const hc = this.highlightedCfiPar;
    const c1 = this.activeClass;
    const c2 = this.playbackActiveClass;

    if (this.highlightedElementPar) {
      this.reset();

      this.highlightElement(he, c1, c2);
    } else if (this.highlightedCfiPar) {
      this.reset();

      this.highlightCfi(hc, c1, c2);
    }
  }

  public ensureUserStyle($element: any, hasAuthorStyle: boolean, overrideWithUserStyle: any): void {
    if (this.$userStyle) {
      try {
        if (this.$userStyle[0].ownerDocument === $element[0].ownerDocument) {
          return;
        }
      } catch (e) {
      }
    }

    const $head = $('head', $element[0].ownerDocument.documentElement);

    this.$userStyle = $("<style type='text/css'> </style>");

    this.$userStyle.append(`.${this.defaultMOActiveClass} {`);

    const fallbackUserStyle = `
      background-color: yellow !important;
      color: black !important;
      border-radius: 0.4em;
    `;

    const style = overrideWithUserStyle;
    if (style) {
      let atLeastOne = false;
      for (const prop in style.declarations) {
        if (!style.declarations.hasOwnProperty(prop)) {
          continue;
        }

        atLeastOne = true;
        this.$userStyle.append(`${prop} : ${style.declarations[prop]}; `);
      }

      if (!atLeastOne && !hasAuthorStyle) {
        this.$userStyle.append(fallbackUserStyle);
      }
    } else if (!hasAuthorStyle) {
      this.$userStyle.append(fallbackUserStyle);
    }

    this.$userStyle.append('}');

    this.$userStyle.appendTo($head);
  }

  public highlightElement(
    par: ParNode | undefined,
    activeClass: string,
    playbackActiveClass: string,
  ): void {
    if (!par || par === this.highlightedElementPar) {
      return;
    }

    this.reset();

    this.highlightedElementPar = par;
    this.highlightedCfiPar = undefined;

    this.activeClass = activeClass;
    this.playbackActiveClass = playbackActiveClass;

    const seq = this.adjustParToSeqSyncGranularity(this.highlightedElementPar);
    const element = seq && seq.element;

    if (this.playbackActiveClass && this.playbackActiveClass !== '') {
      $(element.ownerDocument.documentElement).addClass(this.playbackActiveClass);
    }

    const $hel = $(element);

    const hasAuthorStyle = !!this.activeClass && this.activeClass !== '';
    const overrideWithUserStyle =
      this.reader.userStyles().findStyle(`.${this.defaultMOActiveClass}`);

    this.ensureUserStyle($hel, hasAuthorStyle, overrideWithUserStyle);

    if (overrideWithUserStyle || !hasAuthorStyle) {
      if (hasAuthorStyle) {
        $hel.addClass(this.activeClass);
      }

      $hel.addClass(this.defaultMOActiveClass);
    } else {
      $hel.addClass(activeClass);
    }

    if (this.includeParWhenAdjustingToSeqSyncGranularity || this.highlightedElementPar !== seq) {
      $(this.highlightedElementPar.element).addClass(this.defaultMOSubSyncClass);
    }
  }

  public highlightCfi(
    par: ParNode | undefined,
    activeClass: string,
    playbackActiveClass: string,
  ): void {
    if (!par || par === this.highlightedCfiPar) {
      return;
    }

    this.reset();

    this.highlightedElementPar = undefined;
    this.highlightedCfiPar = par;

    this.activeClass = activeClass;
    this.playbackActiveClass = playbackActiveClass;

    const $hel = $(this.highlightedCfiPar.cfi.cfiTextParent);

    const hasAuthorStyle = !!this.activeClass && this.activeClass !== '';
    const overrideWithUserStyle =
      this.reader.userStyles().findStyle(`.${this.defaultMOActiveClass}`);

    this.ensureUserStyle($hel, hasAuthorStyle, overrideWithUserStyle);

    const clazz = (overrideWithUserStyle || !hasAuthorStyle)
      ? ((hasAuthorStyle ? (`${this.activeClass} `) : ' ') + this.defaultMOActiveClass)
      : this.activeClass;

    if (this.reader.plugins.highlights) {
      try {
        const id = par.getSmil().spineItemId;
        this.reader.plugins.highlights.addHighlight(
          id,
          par.cfi.partialRangeCfi,
          this.highlightID,
          'highlight',
          undefined, // styles
        );
      } catch (error) {
        console.error(error);
      }
    // legacy
    } else if (this.reader.plugins.annotations) {
      try {
        const id = par.getSmil().spineItemId;
        this.reader.plugins.annotations.addHighlight(
          id,
          par.cfi.partialRangeCfi,
          this.highlightID,
          'highlight', // "underline"
          undefined, // styles
        );
      } catch (error) {
        console.error(error);
      }
    }
  }

  public reset(): void {
    if (this.highlightedCfiPar) {
      const doc = this.highlightedCfiPar.cfi.cfiTextParent.ownerDocument;

      if (this.reader.plugins.highlights) {
        try {
          this.reader.plugins.highlights.removeHighlight(this.highlightID);

          let toRemove = undefined;
          while ((toRemove = doc.getElementById(`start-${this.highlightID}`)) !== null) {
            console.log('toRemove START');
            console.log(toRemove);
            toRemove.parentNode.removeChild(toRemove);
          } while ((toRemove = doc.getElementById(`end-${this.highlightID}`)) !== null) {
            console.log('toRemove END');
            console.log(toRemove);
            toRemove.parentNode.removeChild(toRemove);
          }
        } catch (error) {
          console.error(error);
        }
      // legacy
      } else if (this.reader.plugins.annotations) {
        try {
          this.reader.plugins.annotations.removeHighlight(this.highlightID);

          let toRemove = undefined;
          while ((toRemove = doc.getElementById(`start-${this.highlightID}`)) !== null) {
            console.log('toRemove START');
            console.log(toRemove);
            toRemove.parentNode.removeChild(toRemove);
          } while ((toRemove = doc.getElementById(`end-${this.highlightID}`)) !== null) {
            console.log('toRemove END');
            console.log(toRemove);
            toRemove.parentNode.removeChild(toRemove);
          }
        } catch (error) {
          console.error(error);
        }
      }

      this.highlightedCfiPar = undefined;
    }

    if (this.highlightedElementPar) {

      const seq = this.adjustParToSeqSyncGranularity(this.highlightedElementPar);
      const element = seq && seq.element;
      if (this.includeParWhenAdjustingToSeqSyncGranularity || this.highlightedElementPar !== seq) {
        $(this.highlightedElementPar.element).removeClass(this.defaultMOSubSyncClass);
      }

      if (this.playbackActiveClass && this.playbackActiveClass !== '') {
        $(element.ownerDocument.documentElement).removeClass(this.playbackActiveClass);
      }

      if (this.activeClass && this.activeClass !== '') {
        $(element).removeClass(this.activeClass);
      }
      $(element).removeClass(this.defaultMOActiveClass);

      this.highlightedElementPar = undefined;
    }

    this.activeClass = '';
    this.playbackActiveClass = '';
  }

  public adjustParToSeqSyncGranularity(par: ParNode): SeqNode | ParNode | undefined {
    if (!par) return undefined;

    const sync = this.reader.viewerSettings().mediaOverlaysSynchronizationGranularity;
    if (sync && sync.length > 0) {
      const element = par.element || (par.cfi ? par.cfi.cfiTextParent : undefined);
      if (!element) {
        console.error('adjustParToSeqSyncGranularity !element ???');
        return par; // should never happen!
      }

      const seq = <SeqNode> par.getFirstSeqAncestorWithEpubType(
        sync,
        this.includeParWhenAdjustingToSeqSyncGranularity,
      );
      if (seq && seq.element) {
        return seq;
      }
    }

    return par;
  }
}
