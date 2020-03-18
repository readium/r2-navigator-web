import { Publication } from '../../streamer';
import { IContentViewFactory } from './content-view/content-view-factory';
import { SpineItemView } from './spine-item-view';

export class SpineItemViewFactory {
  private publication: Publication;

  private contentViewFactory: IContentViewFactory;

  private isFixedLayout: boolean = false;

  private isVertical: boolean = false;

  // tslint:disable-next-line:no-any
  public constructor(pub: Publication, isFixedLayout: boolean, cvFactory: IContentViewFactory) {
    this.publication = pub;
    this.isFixedLayout = isFixedLayout;
    this.contentViewFactory = cvFactory;
  }

  public setVerticalLayout(v: boolean): void {
    this.isVertical = v;
  }

  public createSpineItemView(pageWidth: number, pageHeight: number): [SpineItemView, HTMLElement] {
    const spineItemView = new SpineItemView(
      this.publication.spine,
      this.isVertical,
      this.isFixedLayout,
      this.contentViewFactory,
    );
    const spineItemViewContainer = document.createElement('div');
    spineItemViewContainer.style.position = 'absolute';
    spineItemViewContainer.style.width = `${pageWidth}px`;
    if (!this.isVertical) {
      spineItemViewContainer.style.height = `${pageHeight}px`;
    }
    spineItemView.attachToHost(spineItemViewContainer);

    return [spineItemView, spineItemViewContainer];
  }
}
