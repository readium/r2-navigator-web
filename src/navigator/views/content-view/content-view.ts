import { Link } from '@readium/shared-models/lib/models/publication/link';
import { CancellationToken } from '../types';
import { ViewSettings } from '../view-settings';

export type SelfResizeCallback = (spineItemIndex: number) => void;

export interface IContentView {
  render(): void;

  loadSpineItem(
    spineItem: Link,
    spineItemIndex: number,
    viewSettings: ViewSettings,
    token?: CancellationToken,
  ): Promise<void>;

  getSpineItem(): Link;

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

  getFragments(cfi: string): string[];

  getPageIndexOffsetFromCfi(cfi: string): number;
  getPageIndexOffsetFromElementId(elementId: string): number;
  getCfi(offsetMain: number, offset2nd: number, backward: boolean): string;
  getCfiFromElementId(elementId: string): string;
  getElementById(elementId: string): HTMLElement | null;
  getElementByCfi(cfi: string): HTMLElement | null;

  onResize(): void;

  onSelfResize(callback: SelfResizeCallback): void;
}
