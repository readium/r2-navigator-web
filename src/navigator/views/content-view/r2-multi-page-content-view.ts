import { R2ContentView } from './r2-content-view';

export class R2MultiPageContentView extends R2ContentView {

  public render(): void {
    this.iframeContainer = document.createElement('div');
    this.iframe = document.createElement('iframe');

    this.iframeContainer.appendChild(this.iframe);

    this.host.appendChild(this.iframeContainer);

    this.setupIframe();
  }

  protected onIframeLoaded(success: boolean): void {
    this.showIFrame();
    super.onIframeLoaded(success);
  }
}
