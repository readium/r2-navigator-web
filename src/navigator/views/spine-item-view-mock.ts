import { PublicationLink } from 'r2-shared-js';
import { SpineItemView } from './spine-item-view';

class ReflowableViewMock {

  public constructor(spineItem: PublicationLink, host: HTMLElement) {
    const div = document.createElement('div');
    div.style.width = '200px';
    div.textContent = spineItem.Href;
    host.appendChild(div);
  }

  public contentLength(): number {
    return 200;
  }
}

export class SpineItemViewMock extends SpineItemView {
  public loadSpineItem(spineItem: PublicationLink): Promise<void> {
    this.isInUse = true;
    this.contentViewImpl = new ReflowableViewMock(spineItem, this.host);

    return Promise.resolve();
  }
}
