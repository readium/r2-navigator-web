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
  private bookContentView;
  private viewportSize;
  private contentViewOffset;
  private root;
  constructor(root: HTMLElement);
  setView(v: LayoutView): void;
  setViewportSize(size: number): void;
  renderAtOffset(position: number): Promise<void>;
  renderAtSpineItem(spineItemIndex: number): Promise<void>;
  nextScreen(): Promise<void>;
  prevScreen(): Promise<void>;
  private render();
}
}