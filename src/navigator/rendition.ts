import { Publication } from '../streamer/publication';
import { PackageDocument } from '../streamer/readium-share-js-impl/package-document';
import { LayoutView } from './views/layout-view';
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

  public setVeiwAsVertical(v: boolean): void {
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
