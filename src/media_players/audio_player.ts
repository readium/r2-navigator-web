//  LauncherOSX
//
//  Created by Boris Schneiderman.
// Modified by Daniel Weck, Andrey Kavarma
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

interface MOAudio extends HTMLAudioElement {
  moSeeking: Object | undefined;
}

/**
 *
 * @param onStatusChanged
 * @param onPositionChanged
 * @param onAudioEnded
 * @param onAudioPlay
 * @param onAudioPause
 * @constructor
 */
// tslint:disable:align
export class AudioPlayer {
  private isIOS: boolean = navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false;
  private isAndroid: boolean = navigator.userAgent.toLowerCase().indexOf('android') > -1;
  private isMobile: boolean = this.isIOS || this.isAndroid;
  private DEBUG: boolean = false;
  private audioElement: MOAudio = <MOAudio> new Audio();
  private currentEpubSrc?: string;
  private currentSmilSrc?: string;
  private rate: number = 1.0;
  private volume: number = 1.0;
  private intervalTimerSkips: number = 0;
  private intervalTimer?: NodeJS.Timeout;
  private touchInited: boolean = false;
  private playId: number = 0;
  private seekQueuing: number = 0;
  private readyEvent: string = this.isAndroid ? 'canplaythrough' : 'canplay';
  private seekedEvent1: string = this.isIOS ? 'canplaythrough' : 'seeked';
  private seekedEvent2: string = this.isIOS ? 'timeupdate' : 'seeked';
  private onStatusChanged: Function;
  private onPositionChanged: Function;
  private onAudioEnded: Function;
  private onAudioPlay: Function;
  private onAudioPause: Function;
  private onReadyToSeekRemover: Function;
  private onSeekedRemover: Function;
  readonly maxSeekRetries: number = 10;

  constructor(
    onStatusChanged: Function,
    onPositionChanged: Function,
    onAudioEnded: Function,
    onAudioPlay: Function,
    onAudioPause: Function,
  ) {
    this.setRate(this.rate);
    this.setVolume(this.volume);
    this.bindOwnMethods();
    this.addAudioElementListeners();

    this.onStatusChanged = onStatusChanged;
    this.onPositionChanged = onPositionChanged;
    this.onAudioEnded = onAudioEnded;
    this.onAudioPlay = onAudioPlay;
    this.onAudioPause = onAudioPause;

    if (this.DEBUG) {
      this.enableDebugListeners();
    }
  }

  private enableDebugListeners(): void {
    this.audioElement.addEventListener('load', () => {
      console.debug('0) load');
    });

    this.audioElement.addEventListener('loadstart', () => {
      console.debug('1) loadstart');
    });

    this.audioElement.addEventListener('durationchange', () => {
      console.debug('2) durationchange');
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      console.debug('3) loadedmetadata');
    });

    this.audioElement.addEventListener('loadeddata', () => {
      console.debug('4) loadeddata');
    });

    this.audioElement.addEventListener('progress', () => {
      console.debug('5) progress');
    });

    this.audioElement.addEventListener('canplay', () => {
      console.debug('6) canplay');
    });

    this.audioElement.addEventListener('canplaythrough', () => {
      console.debug('7) canplaythrough');
    });

    this.audioElement.addEventListener('play', () => {
      console.debug('8) play');
    });

    this.audioElement.addEventListener('pause', () => {
      console.debug('9) pause');
    });

    this.audioElement.addEventListener('ended', () => {
      console.debug('10) ended');
    });

    this.audioElement.addEventListener('seeked', () => {
      console.debug('X) seeked');
    });

    this.audioElement.addEventListener('timeupdate', () => {
      console.debug('Y) timeupdate');
    });

    this.audioElement.addEventListener('seeking', () => {
      console.debug('Z) seeking');
    });
  }

  public getCurrentSmilSrc(): string {
    return this.currentSmilSrc || '';
  }

  public setRate(newRate: number): void {
    this.rate = newRate;
    if (this.rate < 0.5) {
      this.rate = 0.5;
    } else if (this.rate > 4.0) {
      this.rate = 4.0;
    }

    this.audioElement.playbackRate = this.rate;
  }

  public getRate(): number {
    return this.rate;
  }

  public setVolume(newVol: number): void {
    this.volume = newVol;
    if (this.volume < 0.0) {
      this.volume = 0.0;
    } else if (this.volume > 1.0) {
      this.volume = 1.0;
    }

    this.audioElement.volume = this.volume;
  }

  public getVolume(): number {
    return this.volume;
  }

  public play(): boolean {
    if (this.DEBUG) {
      console.error('this.play()');
    }

    if (!this.currentEpubSrc) {
      return false;
    }

    this.startTimer();
    this.setVolume(this.volume);
    this.setRate(this.rate);
    this.audioElement.play();

    return true;
  }

  public pause(): void {
    if (this.DEBUG) {
      console.error('this.pause()');
    }

    this.stopTimer();
    this.audioElement.pause();
  }

  private addAudioElementListeners(): void {
    this.audioElement.addEventListener('play', this.onPlay, false);
    this.audioElement.addEventListener('pause', this.onPause, false);
    this.audioElement.addEventListener('ended', this.onEnded, false);
    this.audioElement.addEventListener('loadstart', () => {
      this.touchInited = true;
    });
  }

  private bindOwnMethods(): void {
    this.onPlayToForcePreload = this.onPlayToForcePreload.bind(this);
    this.onReadyToSeek = this.onReadyToSeek.bind(this);
    this.onPlay = this.onPlay.bind(this);
    this.onPause = this.onPause.bind(this);
    this.onEnded = this.onEnded.bind(this);
  }

  private onPlay(): void {
    this.onStatusChanged({ isPlaying: true });
    this.onAudioPlay();
  }

  private onPause(): void {
    this.onAudioPause();
    this.onStatusChanged({ isPlaying: false });
  }

  private onEnded(): void {
    if (this.audioElement.moSeeking) {
      if (this.DEBUG) {
        console.debug('onEnded() skipped (still seeking...)');
      }

      return;
    }

    this.stopTimer();

    this.onAudioEnded();
    this.onStatusChanged({ isPlaying: false });
  }

  private startTimer(): void {
    if (this.intervalTimer) {
      return;
    }

    this.intervalTimer = setInterval(() => {
      if (this.audioElement.moSeeking) {
        this.intervalTimerSkips += 1;
        if (this.intervalTimerSkips > 1000) {
          this.intervalTimerSkips = 0;
          this.stopTimer();
        }
        return;
      }

      let currentTime = undefined;
      try {
        currentTime = this.audioElement.currentTime;
      } catch (ex) {
        console.error(ex.message);
      }

      if (currentTime) {
        this.onPositionChanged(currentTime, 1);
      }
    }, 20);
  }

  private stopTimer(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    this.intervalTimer = undefined;
  }

  public isPlaying(): boolean {
    return this.intervalTimer !== undefined;
  }

  public reset(): void {
    if (this.DEBUG) {
      console.error('this.reset()');
    }

    this.pause();

    this.audioElement.moSeeking = undefined;
    this.currentSmilSrc = undefined;
    this.currentEpubSrc = undefined;

    setTimeout(() => {
      this.audioElement.setAttribute('src', '');
    }, 1);
  }

  public touchInit(): boolean {
    if (!this.isIOS) {
      return false;
    }

    if (this.touchInited) {
      return false;
    }

    this.touchInited = true;

    this.audioElement.setAttribute('src', 'touch/init/html5/audio.mp3');
    this.audioElement.load();

    return true;
  }

  public playFile(smilSrc: string, epubSrc: string, seekBegin: number): void {
    this.playId += 1;
    if (this.playId > 99999) {
      this.playId = 0;
    }

    if (this.audioElement.moSeeking) {
      this.seekQueuing += 1;
      if (this.seekQueuing > this.maxSeekRetries) {
        this.seekQueuing = 0;
        return;
      }

      if (this.DEBUG) {
        console.debug(`this.playFile(${epubSrc}) @${seekBegin} (POSTPONE, SEEKING...)`);
      }

      setTimeout(() => {
        this.playFile(smilSrc, epubSrc, seekBegin);
      }, 20);

      return;
    }

    this.audioElement.moSeeking = {};

    if (this.DEBUG) {
      console.debug(`this.playFile(${epubSrc}) @${seekBegin} #${this.playId}`);
    }

    const audioNeedsNewSrc = !this.currentEpubSrc || this.currentEpubSrc !== epubSrc;

    if (!audioNeedsNewSrc) {
      if (this.DEBUG) {
        console.debug('this.playFile() SAME SRC');
      }

      this.pause();

      this.currentSmilSrc = smilSrc;
      this.currentEpubSrc = epubSrc;

      this.playSeekCurrentTime(seekBegin, this.playId, false);

      return;
    }

    if (this.DEBUG) {
      console.debug('this.playFile() NEW SRC');
      console.debug(`currentEpubSrc: ${this.currentEpubSrc}`);
      console.debug(`epubSrc: ${epubSrc}`);
    }

    this.reset();
    this.audioElement.moSeeking = {};

    this.currentSmilSrc = smilSrc;
    this.currentEpubSrc = epubSrc;

    if (!this.isAndroid) {
      this.audioElement.addEventListener('play', this.onPlayToForcePreload, false);
    }

    const onReadyToSeekFunc = () => {
      this.onReadyToSeek({ seekBegin, playId: this.playId });
    };
    this.audioElement.addEventListener(this.readyEvent, onReadyToSeekFunc);
    this.onReadyToSeekRemover = () => {
      this.audioElement.removeEventListener(this.readyEvent, onReadyToSeekFunc);
    };

    setTimeout(() => {
      if (this.currentEpubSrc) {
        this.audioElement.setAttribute('src', this.currentEpubSrc);
      }
      this.audioElement.load();

      if (!this.isAndroid) {
        this.playToForcePreload();
      }
    }, 1);
  }

  private playToForcePreload(): void {
    if (this.DEBUG) {
      console.debug('playToForcePreload');
    }

    const vol = this.volume;
    this.volume = 0;
    this.play();
    this.volume = vol;
  }

  private onPlayToForcePreload(): void {
    this.audioElement.removeEventListener('play', this.onPlayToForcePreload, false);

    if (this.DEBUG) {
      console.debug('onPlayToForcePreload');
    }
    this.audioElement.pause(); // note: interval timer continues (immediately follows self.play())
  }

  private onReadyToSeek_(data: any): void {
    if (this.DEBUG) {
      console.debug(`onReadyToSeek #${data.playId}`);
    }
    this.playSeekCurrentTime(data.seekBegin, data.playId, true);
  }

  private onReadyToSeek(data: any): void {
    this.onReadyToSeekRemover();

    if (!this.isAndroid) {
      this.onReadyToSeek_(data);
    } else {
      if (this.DEBUG) {
        console.debug(`onReadyToSeek ANDROID ... waiting a bit ... #${data.playId}`);
      }

      this.playToForcePreload();

      setTimeout(() => {
        this.onReadyToSeek_(data);
      }, 1000);
    }
  }

  private playSeekCurrentTime(
    newCurrentTimeParam: number,
    playId: number,
    isNewSrc: boolean,
  ): void {
    if (this.DEBUG) {
      console.debug(`playSeekCurrentTime() #${playId}`);
    }

    let newCurrentTime = newCurrentTimeParam;
    if (newCurrentTime === 0) {
      newCurrentTime = 0.01;
    }

    if (Math.abs(newCurrentTime - this.audioElement.currentTime) < 0.3) {
      if (this.DEBUG) {
        console.debug('playSeekCurrentTime() CONTINUE');
      }

      this.audioElement.moSeeking = undefined;
      this.play();
      return;
    }

    const ev = isNewSrc ? this.seekedEvent1 : this.seekedEvent2;

    if (this.DEBUG) {
      console.debug(`playSeekCurrentTime() NEED SEEK, EV: ${ev}`);
    }

    this.pause();

    const onSeekedFunc = () => {
      this.onSeeked({ newCurrentTime, playId, isNewSrc });
    };
    this.audioElement.addEventListener(ev, onSeekedFunc);
    this.onSeekedRemover = () => {
      this.audioElement.removeEventListener(ev, onSeekedFunc);
    };

    try {
      this.audioElement.currentTime = newCurrentTime;
    } catch (ex) {
      console.error(ex.message);

      setTimeout(() => {
        try {
          this.audioElement.currentTime = newCurrentTime;
        } catch (ex) {
          console.error(ex.message);
        }
      }, 5);
    }
  }

  private onSeeked(data: any): void {
    const ev = data.isNewSrc ? this.seekedEvent1 : this.seekedEvent2;

    const notRetry = data.seekRetries === undefined;

    if (notRetry || data.seekRetries === this.maxSeekRetries) {
      this.onSeekedRemover();
    }

    if (this.DEBUG) {
      console.debug(`onSeeked() #${data.playId} FIRST? ${notRetry} EV: ${ev}`);
    }

    const curTime = this.audioElement.currentTime;
    const diff = Math.abs(data.newCurrentTime - curTime);

    if (
      (notRetry || data.seekRetries >= 0) &&
      diff >= 1
    ) {
      if (this.DEBUG) {
        // tslint:disable-next-line:max-line-length
        console.debug(`onSeeked() time diff: ${data.newCurrentTime} vs. ${curTime} (${diff})`);
      }

      if (notRetry) {
        data.seekRetries = this.maxSeekRetries;
        data.isNewSrc = false;
      } else {
        data.seekRetries -= 1;

        if (this.DEBUG) {
          console.debug('onSeeked() FAIL => retry again (timeout)');
        }

        setTimeout(() => {
          this.onSeeked(event);
        }, this.isAndroid ? 1000 : 200);
      }

      setTimeout(() => {
        this.audioElement.pause();
        try {
          this.audioElement.currentTime = data.newCurrentTime;
        } catch (ex) {
          console.error(ex.message);

          setTimeout(() => {
            try {
              this.audioElement.currentTime = data.newCurrentTime;
            } catch (ex) {
              console.error(ex.message);
            }
          }, 4);
        }
      }, 5);
    } else {
      if (this.DEBUG) {
        console.debug('onSeeked() STATE:');
        console.debug(notRetry);
        console.debug(data.seekRetries);
        console.debug(diff);
      }

      if (diff >= 1) {
        if (this.DEBUG) {
          console.debug('onSeeked() ABORT, TRY AGAIN FROM SCRATCH!');
        }

        const smilSrc = this.currentSmilSrc;
        const epubSrc = this.currentEpubSrc;
        const seekBegin = data.newCurrentTime;

        this.reset();

        setTimeout(() => {
          if (smilSrc && epubSrc) {
            this.playFile(smilSrc, epubSrc, seekBegin);
          }
        }, 10);

        return;
      }

      if (this.DEBUG) {
        console.debug('onSeeked() OKAY => play!');
      }

      data.seekRetries = undefined;

      this.play();

      this.audioElement.moSeeking = undefined;
    }
  }
}
