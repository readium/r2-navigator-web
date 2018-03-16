import { Publication } from '../streamer';
import { LayoutView } from './views/layout-view';
import { ZoomOptions } from './views/types';
import { Viewport } from './views/viewport';

export class Rendition {
  public viewport: Viewport;

  private bookView: LayoutView;

  private pub: Publication;

  private pageWidth: number;
  private pageHeight: number;

  private viewAsVertical: boolean = false;

  constructor(pub: Publication, viewport: HTMLElement) {
    this.pub = pub;
    this.viewport = new Viewport(viewport);
  }

  public setPageSize(pageWidth: number, pageHeight: number): void {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;

    if (this.bookView) {
      this.bookView.setPageSize(this.pageWidth, this.pageHeight);
    }
  }

  public async updateViewSettings(viewSettings: object): Promise<void> {
    if (this.bookView) {
      await this.bookView.updateViewSettings(viewSettings);
    }
  }

  public zoom(scale: number): void {
    if (this.bookView) {
      this.bookView.zoom(scale);
    }
  }

  public setZoomOption(option: ZoomOptions): void {
    if (this.bookView) {
      this.bookView.setZoomOption(option);
    }
  }

  public setViewAsVertical(v: boolean): void {
    this.viewAsVertical = v;
  }

  public getPageWidth(): number {
    return this.pageWidth;
  }

  public getPublication(): Publication {
    return this.pub;
  }

  public render(): Promise<void> {
    this.bookView = new LayoutView(this.pub);
    this.bookView.setPageSize(this.pageWidth, this.pageHeight);
    this.bookView.setVerticalLayout(this.viewAsVertical);

    this.viewport.setView(this.bookView);

    return Promise.resolve();
  }
}
