import { Interpreter } from 'readium-cfi-js';
import { Link } from 'r2-webpub-model-js/lib/models/link';
import { Publication } from '../publication';

export class PackageDocument {
  private pub: Publication;
  private packageDom: HTMLDocument | null = null;

  constructor(pub: Publication) {
    this.pub = pub;
  }

  // tslint:disable-next-line:no-any
  public getSharedJsPackageData(): any {
    return {
      rootUrl: this.pub.getBaseURI(),
      rendition_viewport: '',
      rendition_layout: this.getRenditionLayout(),
      rendition_orientation: '',
      rendition_flow: '',
      rendition_spread: '',
      media_overlay: this.getDefaultMediaOverlay(),
      spine: {
        direction: this.getPageProgressionDirection(),
        items: this.getSharedJsSpine(),
      },
    };
  }

  // tslint:disable-next-line:no-any
  public generateTocListDOM(callback: any): void {
    callback(undefined);
  }

  // tslint:disable-next-line:no-any
  public generateTocListJSON(callback: any): void {
    callback(undefined);
  }

  // tslint:disable-next-line:no-any
  public async generatePageListJSON(callback: any): Promise<void> {
    if (!this.pub.pageList) {
      callback(undefined);

      return;
    }

    if (!this.packageDom) {
      this.packageDom = await this.getPackageDom();
    }

    if (!this.packageDom) {
      callback(undefined);

      return;
    }

    const pageList = this.pub.pageList.map((link: Link) => {
      if (this.isIntraPubCfiLink(link.href)) {
        const parsedHref = this.parseIntraPubCfiLink(link.href);

        return {
          label: link.title,
          cfi: parsedHref,
        };
      }

      return {
        label: link.title,
        href: link.href,
      };
    });

    callback(pageList);
  }

  public getNavDocHref(): string | undefined {
    return undefined;
  }

  private getRenditionLayout(): string {
    if (this.pub.metadata.rendition && this.pub.metadata.rendition.layout === 'fixed') {
      return 'pre-paginated';
    }

    return 'reflowable';
  }

  // tslint:disable-next-line:no-any
  private getDefaultMediaOverlay(): any {
    return {
      duration: 0,
      narrator: '',
      activeClass: '',
      playbackActiveClass: '',
      smil_models: [],
      skippables: [
        'sidebar',
        'practice',
        'marginalia',
        'annotation',
        'help',
        'note',
        'footnote',
        'rearnote',
        'table',
        'table-row',
        'table-cell',
        'list',
        'list-item',
        'pagebreak',
      ],
      escapables: [
        'sidebar',
        'bibliography',
        'toc',
        'loi',
        'appendix',
        'landmarks',
        'lot',
        'index',
        'colophon',
        'epigraph',
        'conclusion',
        'afterword',
        'warning',
        'epilogue',
        'foreword',
        'introduction',
        'prologue',
        'preface',
        'preamble',
        'notice',
        'errata',
        'copyright-page',
        'acknowledgments',
        'other-credits',
        'titlepage',
        'imprimatur',
        'contributors',
        'halftitlepage',
        'dedication',
        'help',
        'annotation',
        'marginalia',
        'practice',
        'note',
        'footnote',
        'rearnote',
        'footnotes',
        'rearnotes',
        'bridgehead',
        'page-list',
        'table',
        'table-row',
        'table-cell',
        'list',
        'list-item',
        'glossary',
      ],
    };
  }

  private getPageProgressionDirection(): string {
    const pageProgressionDirection = this.pub.metadata.readingProgression;

    if (pageProgressionDirection === 'auto') {
      return 'default';
    }

    return pageProgressionDirection;
  }

  private getSharedJsSpine(): object {
    return this.pub.spine.map((pubSpineItem: Link) => {
      return {
        href: pubSpineItem.href,
        media_type: pubSpineItem.type,
        // assuming that the order of spine items in webpub indicates that they are linear
        linear: 'yes',

        // R2: these data is lost
        rendition_viewport: undefined,
        idref: pubSpineItem.href,
        manifest_id: '',
        media_overlay_id: '',
        properties: '',
      };
    });
  }

  private async getPackageDom(): Promise<HTMLDocument | null> {
    const containerUrl = `${this.pub.getBaseURI()}META-INF/container.xml`;
    const containerDom = await this.fetchXmlDom(containerUrl);
    if (!containerDom) {
      return null;
    }

    const rootElements = containerDom.getElementsByTagName('rootfile');
    if (rootElements.length === 0) {
      return null;
    }

    const rootPath = rootElements[0].getAttribute('full-path');
    const packageUrl = `${this.pub.getBaseURI()}${rootPath}`;

    return this.fetchXmlDom(packageUrl);
  }

  private async fetchXmlDom(xmlUrl: string): Promise<HTMLDocument | null> {
    const resp = await fetch(xmlUrl);
    const xmlString = await resp.text();

    return this.tryParseXml(xmlString);
  }

  private tryParseXml(xmlString: string): HTMLDocument | null {
    const parser = new DOMParser();

    let dom = null;
    try {
      dom = parser.parseFromString(xmlString, 'text/xml');
    } catch (ex) {
      console.warn(ex);

      return null;
    }
    // check for an empty result (native browser xml parsing problems)
    if (!dom || !dom.childNodes || !dom.childNodes.length ||
        dom.getElementsByTagNameNS('*', 'parsererror').length) {
      return null;
    }

    return dom;
  }

  private isIntraPubCfiLink(href: string): boolean {
    return href.indexOf('#epubcfi(') !== -1;
  }

  private parseIntraPubCfiLink(href: string): object | null {
    if (!this.packageDom) {
      return null;
    }
    const regEx = /#epubcfi\((.*?)\)/g;
    const regExMatch = regEx.exec(href);
    if (!regExMatch) {
      return null;
    }

    const rawCfi = regExMatch[1];
    const splitCfi = rawCfi.split('!');

    // tslint:disable-next-line:max-line-length
    const $spineItemElement =  Interpreter.getTargetElementWithPartialCFI(`epubcfi(${splitCfi[0]})`, this.packageDom);
    const contentCFI = splitCfi[1];
    let idref = $spineItemElement.attr('idref');
    idref = this.itemHrefFromId(idref);
    if (!idref) {
      return null;
    }

    return { idref, contentCFI };
  }

  private itemHrefFromId(idref: string): string | null {
    if (!this.packageDom) {
      return null;
    }

    const itemElements = this.packageDom.getElementsByTagName('item');
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < itemElements.length; i = i + 1) {
      const itemEle = itemElements[i];
      if (itemEle.getAttribute('id') === idref) {
        return itemEle.getAttribute('href');
      }
    }

    return null;
  }
}
