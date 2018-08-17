import { Navigator } from '../navigator/navigator';
import { Rendition, SpreadMode } from '../navigator/rendition';
import { Publication } from '../streamer/publication';
import { ReadiumReaderViewAdapter } from './reader-view-adapter';

/* tslint:disable:no-any */

export class Readium {
  public reader: ReadiumReaderViewAdapter;

  private root: HTMLElement;
  private epubContainer: HTMLElement;

  public constructor(readiumOptions: any, readerOptions: any) {
    this.epubContainer = readerOptions.el;

    this.root = document.createElement('div');
    this.root.setAttribute('id', 'book-frame');
    this.root.style.overflow = 'hidden';
    this.root.style.margin = 'auto';
    this.epubContainer.appendChild(this.root);

    this.reader = new ReadiumReaderViewAdapter(this.root, this.epubContainer);
  }

  public async openPackageDocument(bookUrl: string,
                                   callback: any,
                                   initialCFI: any): Promise<void> {
    if (!this.root) {
      return Promise.resolve();
    }

    await this.reader.openPublication(bookUrl);

    const packageDocument = this.reader.getReadiumPackageDocument();
    const options = {
      metadata: {},
    };
    callback(packageDocument, options);

    this.reader.openPage();
  }
}
