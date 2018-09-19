import { triggerLayout } from '../../../utils/dom-utils';
import { SettingName } from '../types';
import { ViewSettings } from '../view-settings';
import { R2ContentView } from './r2-content-view';

export class R2MultiPageContentView extends R2ContentView {

  public render(): void {
    this.iframeContainer = document.createElement('div');
    this.iframe = document.createElement('iframe');

    this.iframeContainer.appendChild(this.iframe);
    this.iframeContainer.style.position = 'absolute';

    this.host.appendChild(this.iframeContainer);

    this.setupIframe();

    this.useReadiumCss = true;
  }

  public setViewSettings(viewSetting: ViewSettings): void {
    super.setViewSettings(viewSetting);
    this.paginate();
  }

  public onResize(): void {
    this.paginate();
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

    const gapValue = this.vs.getSetting<number>(SettingName.ColumnGap);
    const columnGap = gapValue === undefined ? 0 : gapValue;
    const columnWidth = hostWidth - columnGap;
    const edgeMargin = columnGap / 2;

    this.iframeContainer.style.left = `${edgeMargin}px`;
    this.iframeContainer.style.right = `${edgeMargin}px`;

    // Have to set width to make Firefox paginate correctly
    this.ePubHtml.style.width = `${columnWidth}px`;
    this.ePubHtml.style.columnWidth = `${columnWidth}px`;
    this.ePubHtml.style.columnGap = `${columnGap}px`;
    this.ePubHtml.style.columnCount = 'auto';
    this.ePubHtml.style.columnFill = 'auto';

    // This workaround is required for triggering layout changes in Safari
    triggerLayout(this.iframe);

    const fullWidth = this.ePubHtml.scrollWidth;
    this.iframe.width = `${fullWidth}px`;

    this.spineItemPgCount = Math.round((fullWidth + columnGap) / hostWidth);
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
