import { R2ContentView } from './r2-content-view';

export class R2MultiPageContentView extends R2ContentView {
  protected ePubHtml: HTMLHtmlElement | null = null;
  protected ePubBody: HTMLBodyElement | null = null;

  public render(): void {
    this.iframeContainer = document.createElement('div');
    this.iframe = document.createElement('iframe');

    this.iframeContainer.appendChild(this.iframe);

    this.host.appendChild(this.iframeContainer);

    this.setupIframe();
  }

  protected onIframeLoaded(success: boolean): void {
    const epubContentDocument = this.iframe.contentDocument;
    if (epubContentDocument) {
      this.ePubHtml = epubContentDocument.querySelector('html');
      if (this.ePubHtml) {
        this.ePubBody = this.ePubHtml.querySelector('body');
      }
    }

    this.paginate();

    this.showIFrame();
    super.onIframeLoaded(success);
  }

  private paginate(): void {
    if (!this.ePubHtml || !this.ePubBody) {
      return;
    }

    const hostSize = this.getHostSize();
    if (hostSize === null) {
      return;
    }

    const [hostWidth, hostHeight] = hostSize;

    this.iframe.style.height = `${hostHeight}px`;

    this.ePubHtml.style.height = `${hostHeight}px`;

    this.ePubHtml.style.margin = '0px';
    this.ePubHtml.style.padding = '0px';
    this.ePubHtml.style.border = '0px';

    this.ePubBody.style.margin = '0px';
    this.ePubBody.style.padding = '0px';

    this.ePubHtml.style.columnWidth = `${hostWidth}px`;
    this.ePubHtml.style.columnGap = '0px';
    this.ePubHtml.style.columnCount = 'auto';
    this.ePubHtml.style.columnFill = 'auto';

    const fullWidth = this.ePubHtml.scrollWidth;
    this.iframe.width = `${fullWidth}px`;

    this.spineItemPgCount = Math.round(fullWidth / hostWidth);
  }

  private getHostSize(): [number, number] | null {
    if (!this.host.style.width || !this.host.style.height) {
      return null;
    }

    const width = parseFloat(this.host.style.width);
    const height = parseFloat(this.host.style.height);

    return [width, height];
  }
}
