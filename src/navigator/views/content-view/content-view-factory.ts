import { IContentView } from './content-view';

export interface IContentViewFactory {
  createContentView(isFixedLayout: boolean, isVertical: boolean): IContentView;

  // tslint:disable-next-line:no-any
  viewSettings(): any;
}
