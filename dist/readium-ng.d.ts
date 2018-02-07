declare module 'readium-ng' {

export class PublicationBase {
}

export class Publication extends PublicationBase {
  baseUri: string;
  private webpub;
  constructor(webpub: string);
  getManifestJSON(): string;
}

export class StreamerClient {
  openPublicationFromUrl(epubUrl: string): Promise<Publication>;
  openPublicationFromJson(webpub: string): Publication;
}

export abstract class View {
  parent: View;
  abstract render(): void;
  abstract attatchToHost(host: HTMLElement): void;
}

export class PaginationInfo {
  spineItemIndex: number;
  spineItemPageCount: number;
  pageIndex: number;
  contentCfi: string;
}

export class LayoutView extends View {
  private spineItemViewStatus;
  private host;
  private layoutRoot;
  private publication;
  private rsjPackage;
  private iframeLoader;
  private loadedContentRange;
  private pageWidth;
  private pageHeight;
  constructor(pub: Publication);
  setPageSize(width: number, height: number): void;
  render(): void;
  attatchToHost(host: HTMLElement): void;
  containerElement(): HTMLElement;
  hasMoreAfterEnd(): boolean;
  hasMoreBeforeStart(): boolean;
  getLoadedStartPostion(): number;
  getLoadedEndPosition(): number;
  isEmpty(): boolean;
  getPaginationInfoAtOffset(offset: number): PaginationInfo[];
  ensureConentLoadedAtRange(start: number, end: number): Promise<void>;
  ensureContentLoadedAtSpineItemRange(startIndex: number, endIndex: number): Promise<void>;
  private clearLoadedContent();
  private initSpineItemViews();
  private startViewStatus();
  private endViewStatus();
  private loadNewSpineItemAtEnd();
  private loadNewSpineItemIndexAtEnd(index);
  private loadNewSpineItemAtStart();
  private loadNewSpineItemIndexAtStart(index);
  private loadNewSpineItem(index);
}

export class Viewport {
    private bookView;
    private viewportSize;
    private viewOffset;
    private startPos?;
    private endPos?;
    private root;
    constructor(root: HTMLElement);
    setView(v: LayoutView): void;
    getViewportSize(): number;
    setViewportSize(size: number): void;
    getStartPosition(): PaginationInfo | undefined;
    getEndPosition(): PaginationInfo | undefined;
    renderAtOffset(position: number): Promise<void>;
    renderAtSpineItem(spineItemIndex: number): Promise<void>;
    nextScreen(): Promise<void>;
    prevScreen(): Promise<void>;
    private updatePositions();
    private render();
}

export class Rendition {
  viewport: Viewport;
  private pub;
  private pageWidth;
  private pageHeight;
  constructor(pub: Publication, viewport: HTMLElement);
  setPageSize(pageWidth: number, pageHeight: number): void;
  getPageWidth(): number;
  getPublication(): Publication;
  render(): Promise<void>;
}

export class Navigator {
  private viewport;
  private rendition;
  private pub;
  constructor(rendition: Rendition);
  nextScreen(): Promise<void>;
  previousScreen(): Promise<void>;
  getCurrentLocation(): Location | undefined | null;
  gotoLocation(loc: Location): Promise<void>;
  getScreenBegin(): Location | undefined | null;
  getScreenEnd(): Location | undefined | null;
  isFirstScreen(): boolean;
  isLastScreen(): boolean;
  isFirstScreenSpine(): boolean;
  isFinalScreenSpine(): boolean;
  getScreenCountSpine(): number;
}
}