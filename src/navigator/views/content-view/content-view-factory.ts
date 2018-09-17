import { IContentView } from './content-view';

export interface IContentViewFactory {
  createContentView(isFixedLayout: boolean, isVertical: boolean): IContentView;
}
