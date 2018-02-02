import { LayoutView } from './layout-view';
import { View } from './view';

export class Viewport {
  private bookContentView: LayoutView;

  private viewportSize: number;

  private contentViewOffset: number;

  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  public setView(v: LayoutView): void {
    this.bookContentView = v;
    this.bookContentView.attatchToHost(this.root);
  }

  public setViewportSize(size: number): void {
    this.viewportSize = size;
  }

  public async renderAtOffset(position: number): Promise<void> {
    await this.bookContentView.ensureConentLoadedAtRange(position, position + this.viewportSize);
    this.contentViewOffset = position;

    this.render();
  }

  public async renderAtSpineItem(spineItemIndex: number): Promise<void> {
    await this.bookContentView.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex);
    this.contentViewOffset = 0;

    this.render();
  }

  private render(): void {
    const containerElement = this.bookContentView.containerElement();
    containerElement.style.transform = `translateX(${-this.contentViewOffset}px)`;
  }
}
