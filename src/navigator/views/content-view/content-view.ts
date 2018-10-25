import { Link } from 'r2-webpub-model-js/lib/models/link';
import { CancellationToken } from '../types';
import { ViewSettings } from '../view-settings';

export interface IContentView {
  render(): void;

  loadSpineItem(spineItem: Link, spineItemIndex: number,
                viewSettings: ViewSettings,
                token?: CancellationToken): Promise<void>;

  spineItemLoadedPromise(token?: CancellationToken): Promise<void>;

  unloadSpineItem(): void;

  attachToHost(host: HTMLElement): void;

  setViewSettings(viewSetting: ViewSettings): void;
  scale(scale: number): void;

  element(): HTMLElement;
  metaWidth(): number;
  metaHeight(): number;
  calculatedHeight(): number;

  spineItemPageCount(): number;

  getOffsetFromCfi(cfi: string): number;
  getOffsetFromElementId(cfi: string): number;

  getPageIndexOffsetFromCfi(cfi: string): number;
  getPageIndexOffsetFromElementId(elementId: string): number;
  getCfi(offsetMain: number, offset2nd: number, backward: boolean): string;

  onResize(): void;
}
