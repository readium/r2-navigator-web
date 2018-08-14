import { Publication } from '../streamer';
import { LayoutView } from './views/layout-view';
import { ZoomOptions } from './views/types';
import { Viewport } from './views/viewport';

export enum SpreadMode {
  Freeform,
  FitViewportAuto,
  FitViewportSingleSpread,
  FitViewportDoubleSpread,
}

// tslint:disable-next-line:interface-name
export interface PageLayoutSettings {
  spreadMode: SpreadMode;
  pageWidth?: number;
  pageHeight?: number;
}

export class Rendition {
  public viewport: Viewport;

  private bookView: LayoutView;

  private pub: Publication;

  private pageWidth: number;
  private pageHeight: number;
  private spreadMode: SpreadMode = SpreadMode.FitViewportAuto;
  private numOfPagesPerSpread: number = 0;

  private viewAsVertical: boolean = false;

  constructor(pub: Publication, viewport: HTMLElement) {
    this.pub = pub;
    this.viewport = new Viewport(viewport);
  }

  public setPageLayout(layoutSetting: PageLayoutSettings): void {
    const spreadMode = layoutSetting.spreadMode;
    const viewportSize = this.viewport.getViewportSize();
    let pageWidth = this.viewAsVertical ? this.viewport.getViewportSize2nd() : viewportSize;
    let pageHeight = this.viewAsVertical ? viewportSize : this.viewport.getViewportSize2nd();

    let numOfPagesPerSpread: number = 1;
    if (spreadMode === SpreadMode.Freeform) {
      numOfPagesPerSpread = 0;
      if (layoutSetting.pageWidth && layoutSetting.pageHeight) {
        pageWidth = layoutSetting.pageWidth;
        pageHeight = layoutSetting.pageHeight;
      } else {
        console.warn('Missing page width or height for freeform layout');
      }
    } else if (spreadMode === SpreadMode.FitViewportAuto) {
      if (viewportSize > 1200) {
        if (this.viewAsVertical) {
          pageHeight = viewportSize / 2;
        } else {
          pageWidth = viewportSize / 2;
        }
        numOfPagesPerSpread = 2;
      }
    } else if (spreadMode === SpreadMode.FitViewportDoubleSpread) {
      if (this.viewAsVertical) {
        pageHeight = viewportSize / 2;
      } else {
        pageWidth = viewportSize / 2;
      }
      numOfPagesPerSpread = 2;
    }

    this.spreadMode = spreadMode;
    this.numOfPagesPerSpread = numOfPagesPerSpread;

    if (this.bookView) {
      this.bookView.setNumberOfPagesPerSpread(numOfPagesPerSpread);
    }

    this.setPageSize(pageWidth, pageHeight);
  }

  public refreshPageLayout(): void {
    if (this.spreadMode === SpreadMode.Freeform) {
      return;
    }

    this.setPageLayout({ spreadMode: this.spreadMode });
  }

  public updateViewSettings(viewSettings: object): void {
    if (this.bookView) {
      this.bookView.updateViewSettings(viewSettings);
    }
  }

  // tslint:disable-next-line:no-any
  public viewSettings(): any {
    if (this.bookView) {
      return this.bookView.viewSettings();
    }

    return undefined;
  }

  public setZoom(option: ZoomOptions, scale: number): void {
    if (this.bookView) {
      this.bookView.setZoom(option, scale);
    }
  }

  public getZoomScale(): number {
    if (this.bookView) {
      return this.bookView.getZoomScale();
    }

    return 1;
  }

  public getZoomOption(): ZoomOptions {
    if (this.bookView) {
      return this.bookView.getZoomOption();
    }

    return ZoomOptions.FitByPage;
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

  // tslint:disable-next-line:no-any
  public getReadiumPackageDocument(): any {
    return this.bookView.getRsjPackageDocument();
  }

  // tslint:disable-next-line:no-any
  public getReadiumPackage(): any {
    return this.bookView.getRsjPackage();
  }

  public render(): Promise<void> {
    this.bookView = new LayoutView(this.pub);
    this.bookView.setPageSize(this.pageWidth, this.pageHeight);
    this.bookView.setNumberOfPagesPerSpread(this.numOfPagesPerSpread);
    this.bookView.setVerticalLayout(this.viewAsVertical);

    this.viewport.setView(this.bookView);

    return Promise.resolve();
  }

  // tslint:disable-next-line:no-any
  public setIframeLoader(iframeLoader: any): void {
    this.bookView.setIframeLoader(iframeLoader);
  }

  private setPageSize(pageWidth: number, pageHeight: number): void {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;

    if (this.bookView) {
      this.bookView.setPageSize(this.pageWidth, this.pageHeight);
    }
  }
}
