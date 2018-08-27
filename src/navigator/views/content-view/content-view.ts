import { PublicationLink } from '@evidentpoint/r2-shared-js';
import { CancellationToken } from '../types';

export interface IContentView {
  render(): void;

  loadSpineItem(spineItem: PublicationLink, spineItemIndex: number,
                token?: CancellationToken): Promise<void>;

  spineItemLoadedPromise(token?: CancellationToken): Promise<void>;

  unloadSpineItem(): void;

  attachToHost(host: HTMLElement): void;

  setViewSettings(viewSetting: object): void;
  scale(scale: number): void;

  element(): HTMLElement;
  metaWidth(): number;
  metaHeight(): number;
  calculatedHeight(): number;

  spineItemPageCount(): number;

  getPageIndexOffsetFromCfi(cfi: string): number;
  getPageIndexOffsetFromElementId(elementId: string): number;
  getCfi(offsetMain: number, offset2nd: number): string;

  onResize(): void;
}
