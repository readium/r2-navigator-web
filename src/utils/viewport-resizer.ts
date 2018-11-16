import {
  RenditionContext,
  Location,
} from '@evidentpoint/r2-navigator-web';

type OnSizeUpdateCallback = () => void;

export class ViewportResizer {
  private rendCtx: RenditionContext;
  private updateCallback: OnSizeUpdateCallback;

  private resizeListener: EventCallback;

  private location: Location | null | undefined;

  public constructor(rendCtx: RenditionContext, updateCallback: OnSizeUpdateCallback) {
    this.rendCtx = rendCtx;
    this.updateCallback = updateCallback;

    this.registerResizeHandler();
  }

  public stopListenResize(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  private registerResizeHandler(): void {
    this.resizeListener = extendedThrottle(
      this.handleViewportResizeStart.bind(this),
      this.handleViewportResizeTick.bind(this),
      this.handleViewportResizeEnd.bind(this),
      250, 1000, this);

    window.addEventListener('resize', this.resizeListener);
  }

  private handleViewportResizeStart(): void {
    this.location = this.rendCtx.navigator.getCurrentLocation();
  }

  private handleViewportResizeTick(): void {
    // this.resize();
  }

  private async handleViewportResizeEnd(): Promise<void> {
    this.updateCallback();

    if (this.location) {
      await this.rendCtx.rendition.viewport.renderAtLocation(this.location);
    }
  }
}

type EventCallback = (evt: UIEvent) => void;

function extendedThrottle(startCb: EventCallback, tickCb: EventCallback, endCb: EventCallback,
                          delay?: number, waitThreshold?: number,
                          context?: any): EventCallback {
  const aDelay = delay === undefined ? 250 : delay;
  const aWaitThreshold = waitThreshold === undefined ? aDelay : waitThreshold;

  let first = true;
  let last: number | undefined;
  let deferTimer: number | undefined;

  return function (event: UIEvent): void {
    const ctx = context;
    const now = (Date.now && Date.now()) || new Date().getTime();

    if (!(last && now < last + aDelay)) {
      last = now;
      if (first) {
        startCb.apply(ctx, event);
        first = false;
      } else {
        tickCb.apply(ctx, event);
      }
    }

    clearTimeout(deferTimer);
    deferTimer = window.setTimeout(
      () => {
        last = now;
        first = true;
        endCb.apply(ctx, event);
      },
      aWaitThreshold);
  };
}
