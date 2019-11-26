import { Publication } from '../streamer';
import { IContentViewFactory } from './views/content-view/content-view-factory';
import { LayoutView } from './views/layout-view';
import { ISettingEntry, SettingName, ZoomOptions } from './views/types';
import { ViewSettings } from './views/view-settings';
import { Viewport } from './views/viewport';

export enum SpreadMode {
  Freeform,
  FitViewportAuto,
  FitViewportSingleSpread,
  FitViewportDoubleSpread,
}

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

  private contentViewFactory: IContentViewFactory;

  private viewAsVertical: boolean = false;

  private vs: ViewSettings = new ViewSettings();

  constructor(pub: Publication, viewport: HTMLElement, cvFactory: IContentViewFactory) {
    this.pub = pub;
    this.viewport = new Viewport(viewport);
    this.contentViewFactory = cvFactory;

    this.initDefaultViewSettings();
  }

  public reset(): void {
    if (this.bookView) {
      this.bookView.reset();
    }
    this.viewport.reset();
  }

  public setPageLayout(layoutSetting: PageLayoutSettings): void {
    let spreadMode = layoutSetting.spreadMode;
    if (this.pub.metadata.rendition && this.pub.metadata.rendition.spread === 'none') {
      spreadMode = SpreadMode.FitViewportSingleSpread;
    }
    const viewportSize = this.viewport.getViewportSize();
    let pageWidth = this.viewAsVertical ? this.viewport.getViewportSize2nd() : viewportSize;
    let pageHeight = this.viewAsVertical ? viewportSize : this.viewport.getViewportSize2nd();

    const maxColWidth = this.vs.getSettingWithDefaultValue<number>(SettingName.MaxColumnWidth, 700);
    const minColWidth = this.vs.getSettingWithDefaultValue<number>(SettingName.MinColumnWidth, 400);
    const colGap = this.vs.getSettingWithDefaultValue<number>(SettingName.ColumnGap, 0);

    const minPageWidth = minColWidth + colGap;
    let maxPageWidth;
    if (this.pub.metadata.rendition && this.pub.metadata.rendition.layout === 'fixed') {
      maxPageWidth = Number.MAX_SAFE_INTEGER;
    } else {
      maxPageWidth = maxColWidth + colGap;
    }

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
      if (viewportSize > minPageWidth * 2) {
        if (this.viewAsVertical) {
          pageHeight = viewportSize / 2;
        } else {
          pageWidth = Math.min(viewportSize / 2, maxPageWidth);
        }
        numOfPagesPerSpread = 2;
      } else {
        pageWidth = Math.min(pageWidth, maxPageWidth);
      }
    } else if (spreadMode === SpreadMode.FitViewportDoubleSpread) {
      if (this.viewAsVertical) {
        pageHeight = viewportSize / 2;
      } else {
        pageWidth = Math.min(viewportSize / 2, maxPageWidth);
      }
      numOfPagesPerSpread = 2;
    } else if (spreadMode === SpreadMode.FitViewportSingleSpread) {
      pageWidth = Math.min(viewportSize, maxPageWidth);
    }

    this.spreadMode = spreadMode;
    this.numOfPagesPerSpread = numOfPagesPerSpread;

    if (this.bookView) {
      this.bookView.setNumberOfPagesPerSpread(numOfPagesPerSpread);
    }

    this.setPageSize(pageWidth, pageHeight);
    this.viewport.onPageSizeChanged(pageWidth, numOfPagesPerSpread);
  }

  public refreshPageLayout(): void {
    if (this.spreadMode === SpreadMode.Freeform) {
      return;
    }

    this.setPageLayout({ spreadMode: this.spreadMode });
  }

  public updateViewSettings(settings: ISettingEntry[]): void {
    this.vs.updateSetting(settings);

    let spreadMode: SpreadMode | null = null;
    for (const s of settings) {
      if (s.name === SettingName.SpreadMode) {
        spreadMode = this.stringToSpreadMode(s.value);
        if (!spreadMode && spreadMode === this.spreadMode) {
          spreadMode = null;
        }
      }
    }

    if (this.bookView) {
      this.bookView.beginViewUpdate();
    }

    if (spreadMode !== null) {
      this.setPageLayout({ spreadMode });
    }

    if (this.bookView) {
      this.bookView.updateViewSettings();
      this.bookView.endViewUpdate();
    }
  }

  public viewSettings(): ViewSettings {
    return this.vs;
  }

  public isVerticalLayout(): boolean {
    return this.bookView.isVerticalLayout();
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
    if (this.bookView) {
      this.bookView.setVerticalLayout(v);
    }
  }

  public getPageWidth(): number {
    return this.pageWidth;
  }

  public getPublication(): Publication {
    return this.pub;
  }

  public getCfiFromAnchor(href: string, elementId: string): string | undefined {
    if (!this.bookView) {
      return undefined;
    }

    return this.bookView.getCfiFromAnchor(href, elementId);
  }

  public getNumOfPagesPerSpread(): number {
    return this.numOfPagesPerSpread;
  }

  // // tslint:disable-next-line:no-any
  // public getReadiumPackageDocument(): any {
  //   return this.bookView.getRsjPackageDocument();
  // }

  // // tslint:disable-next-line:no-any
  // public getReadiumPackage(): any {
  //   return this.bookView.getRsjPackage();
  // }

  public render(): Promise<void> {
    this.bookView = new LayoutView(this.pub, this.vs, this.contentViewFactory);
    this.bookView.setVerticalLayout(this.viewAsVertical);
    this.bookView.setPageSize(this.pageWidth, this.pageHeight);
    this.bookView.setNumberOfPagesPerSpread(this.numOfPagesPerSpread);

    this.viewport.setView(this.bookView);

    return Promise.resolve();
  }

  private initDefaultViewSettings(): void {
    const columnGapSetting = { name: SettingName.ColumnGap, value: 20 };
    const settings = [];
    settings.push(columnGapSetting);
    if (this.pub.metadata.rendition && this.pub.metadata.rendition.spread === 'none') {
      const spreadSetting = { name: SettingName.SpreadMode, value: SpreadMode.FitViewportSingleSpread };
      settings.push(spreadSetting);
    }
    this.vs.updateSetting(settings);
  }

  private setPageSize(pageWidth: number, pageHeight: number): void {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;

    if (this.bookView) {
      this.bookView.setPageSize(this.pageWidth, this.pageHeight);
    }
  }

  private stringToSpreadMode(val: string): SpreadMode | null {
    let mode: SpreadMode | null = null;
    if (val === 'auto') {
      mode = SpreadMode.FitViewportAuto;
    } else if (val === 'single') {
      mode = SpreadMode.FitViewportSingleSpread;
    } else if (val === 'double') {
      mode = SpreadMode.FitViewportDoubleSpread;
    }

    return mode;
  }
}
