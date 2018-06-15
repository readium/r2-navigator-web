import { PublicationLink } from '@evidentpoint/r2-shared-js';
import { Publication } from '../publication';

export class PackageDocument {
  private pub: Publication;

  constructor(pub: Publication) {
    this.pub = pub;
  }

  // tslint:disable-next-line:no-any
  public getSharedJsPackageData(): any {
    return {
      rootUrl: this.pub.getBaseURI(),
      rendition_viewport: '',
      rendition_layout: '',
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
  public generatePageListJSON(callback: any): void {
    callback(undefined);
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
    const pageProgressionDirection: string = this.pub.Metadata.Direction;
    if (pageProgressionDirection === 'rtl') {
      return 'rtl';
    }

    if (pageProgressionDirection === 'default') {
      return 'default';
    }

    return 'ltr';
  }

  private getSharedJsSpine(): object {
    return this.pub.Spine.map((pubSpineItem: PublicationLink) => {
      return {
        href: pubSpineItem.Href,
        media_type: pubSpineItem.TypeLink,
        // assuming that the order of spine items in webpub indicates that they are linear
        linear: 'yes',

        // R2: these data is lost
        rendition_viewport: undefined,
        idref: pubSpineItem.Href,
        manifest_id: '',
        media_overlay_id: '',
        properties: '',
      };
    });
  }
}
