import { LayoutView, Rendition, SettingName } from '../../src/navigator';
import { IFrameLoader } from '../../src/navigator/iframe-loader';
import {
  ElementBlacklistedChecker,
} from '../../src/navigator/views/cfi/element-checker';
import { IContentViewFactory } from '../../src/navigator/views/content-view/content-view-factory';
// tslint:disable-next-line:max-line-length
import { R1ContentViewFactory } from '../../src/navigator/views/content-view/r1-content-view-factory';
// tslint:disable-next-line:max-line-length
import { R2ContentViewFactory } from '../../src/navigator/views/content-view/r2-content-view-factory';
import { SpineItemView } from '../../src/navigator/views/spine-item-view';
import { ViewSettings } from '../../src/navigator/views/view-settings';
import { Publication } from '../../src/streamer';

export class HostEnv {
  private pubUrl: string;
  private publication: Publication;

  private viewportDiv: HTMLElement;

  private cvFactory: IContentViewFactory;
  private viewSettings: ViewSettings;
  private eleChecker: ElementBlacklistedChecker;

  private layoutView?: LayoutView;

  private rendition?: Rendition;

  public constructor() {
    this.initViewport();
  }

  public getElementChecker(): ElementBlacklistedChecker {
    return this.eleChecker;
  }

  public getViewportDiv(): HTMLElement {
    return this.viewportDiv;
  }

  public getViewSettings(): ViewSettings {
    return this.viewSettings;
  }

  public async openPublicationR1(pubUrl: string): Promise<void> {
    this.pubUrl = pubUrl;
    this.publication = await Publication.fromURL(this.pubUrl);

    this.cvFactory = new R1ContentViewFactory(this.publication);
    this.viewSettings = new ViewSettings();
    this.eleChecker = new ElementBlacklistedChecker([], [], []);
  }

  public async openPublicationR2(pubUrl: string): Promise<void> {
    this.pubUrl = pubUrl;
    this.publication = await Publication.fromURL(this.pubUrl);

    const loader = new IFrameLoader(this.publication.getBaseURI());
    loader.setReadiumCssBasePath('/fixtures/readium-css');

    this.cvFactory = new R2ContentViewFactory(loader);
    this.viewSettings = new ViewSettings();
    this.eleChecker = new ElementBlacklistedChecker([], [], []);
  }

  public createSpineItemView(pageWidth: number, pageHeight: number): SpineItemView {
    const spineItemView = new SpineItemView(this.publication.Spine,
                                            false,
                                            false,
                                            this.cvFactory);
    const spineItemViewContainer = document.createElement('div');
    spineItemViewContainer.setAttribute('id', 'spine-item-view');
    spineItemViewContainer.style.position = 'absolute';
    spineItemViewContainer.style.width = `${pageWidth}px`;
    spineItemViewContainer.style.height = `${pageHeight}px`;

    spineItemView.attachToHost(spineItemViewContainer);

    this.viewportDiv.appendChild(spineItemViewContainer);

    return spineItemView;
  }

  public async loadSpineItem(siView: SpineItemView, siIndex: number): Promise<void> {
    await siView.loadSpineItem(this.publication.Spine[siIndex], this.viewSettings);
  }

  public getLayoutView(): LayoutView {
    if (!this.layoutView) {
      this.layoutView = new LayoutView(this.publication, this.viewSettings, this.cvFactory);
      this.layoutView.attachToHost(this.viewportDiv);
    }

    return this.layoutView;
  }

  public getRendition(): Rendition {
    if (!this.rendition) {
      this.rendition = new Rendition(this.publication, this.viewportDiv, this.cvFactory);
    }

    return this.rendition;
  }

  public getIframe(): HTMLIFrameElement {
    return <HTMLIFrameElement>(this.viewportDiv.querySelector('iframe'));
  }

  public clear(): void {
    document.body.removeChild(this.viewportDiv);
  }

  public setColumnGap(gap: number): void {
    this.viewSettings.updateSetting([{ name: SettingName.ColumnGap, value: gap }]);
  }

  private initViewport(): void {
    this.viewportDiv = document.createElement('div');
    this.viewportDiv.setAttribute('id', 'viewport');

    document.body.appendChild(this.viewportDiv);
  }
}
