import { triggerLayout } from '../../../utils/dom-utils';
import { Rect } from '../cfi/rect';
import { SettingName } from '../types';
import { ViewSettings } from '../view-settings';
import { R2ContentView } from './r2-content-view';

export class R2MultiPageContentView extends R2ContentView {

  private hostWidth: number;
  private hostHeight: number;

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

  public getOffsetFromCfi(cfi: string): number {
    const offset = this.cfiNavLogic.getOffsetByCfi(cfi);
    if (offset === null) {
      return -1;
    }

    return offset[0];
  }

  public getOffsetFromElementId(cfi: string): number {
    const offset = this.cfiNavLogic.getOffsetFromElementId(cfi);
    if (offset === null) {
      return -1;
    }

    return offset[0];
  }

  public getPageIndexOffsetFromCfi(cfi: string): number {
    const offset = this.cfiNavLogic.getOffsetByCfi(cfi);
    if (offset === null) {
      return -1;
    }

    return Math.floor(offset[0] / this.hostWidth);
  }

  public getPageIndexOffsetFromElementId(elementId: string): number {
    const offset = this.cfiNavLogic.getOffsetFromElementId(elementId);
    if (offset === null) {
      return -1;
    }

    return Math.floor(offset[0] / this.hostWidth);
  }

  public getCfi(offsetMain: number, offset2nd: number): string {
    const right = offsetMain + this.hostWidth;
    const bottom = offset2nd + this.hostHeight;
    const cfi = this.cfiNavLogic.getFirstVisibleCfi(new Rect(offsetMain, offset2nd, right, bottom));

    return cfi ? cfi : '';
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

    this.setViewSettings(this.vs);

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

    this.hostWidth = hostSize[0];
    this.hostHeight = hostSize[1];

    // Need to set the iframe width to default value
    // so resize can work properly
    this.iframe.width = '100%';
    this.iframe.style.height = `${this.hostHeight}px`;

    this.ePubHtml.style.height = `${this.hostHeight}px`;

    this.ePubHtml.style.margin = '0px';
    this.ePubHtml.style.padding = '0px';
    this.ePubHtml.style.border = '0px';

    this.ePubBody.style.margin = '0px';
    this.ePubBody.style.padding = '0px';

    const gapValue = this.vs.getSetting<number>(SettingName.ColumnGap);
    const columnGap = gapValue === undefined ? 0 : gapValue;
    const columnWidth = this.hostWidth - columnGap;
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

    // Use Element.getBoundingClientRect() instead of Element.scrollWidth
    // since scrollWidth will round the value to an integer
    const fullWidth = this.ePubHtml.getBoundingClientRect().width;
    this.iframe.width = `${fullWidth}px`;

    this.spineItemPgCount = Math.round((fullWidth + columnGap) / this.hostWidth);
  }
}
