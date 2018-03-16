// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { IFrameLoader } from '../../src/navigator/iframe-loader';
import { ReadingSystem } from '../../src/navigator';
import { SpineItemView } from '../../src/navigator/views/spine-item-view';
import { Publication } from '../../src/streamer';
import { PackageDocument } from '../../src/streamer/readium-shared-js-impl/package-document';

// tslint:disable-next-line:no-implicit-dependencies
import { Package as ReadiumPackage, ViewerSettings } from 'readium-shared-js';

describe('SpineItemView', () => {
  let viewportDiv: HTMLElement;
  let iframeLoader: IFrameLoader;
  let publication: Publication;
  // tslint:disable-next-line:no-any
  let rsjPackage: any;
  // tslint:disable-next-line:no-any
  let rsjViewSettings: any;

  before(() => {
    const head = document.querySelector('head');
    if (head) {
      head.innerHTML +=
        '<link rel="stylesheet" type="text/css" href="fixtures/window.css">';
    }
  });

  beforeEach(async () => {
    viewportDiv = document.createElement('div');
    viewportDiv.setAttribute('id', 'viewport');

    document.body.appendChild(viewportDiv);

    const rs = new ReadingSystem();

    const viewport = document.getElementById('viewport');
    if (viewport) {
      rs.initRenderer(viewport);
    }

    publication = await Publication.fromURL(
      '/fixtures/publications/metamorphosis/manifest.json',
    );

    iframeLoader = new IFrameLoader(publication.getBaseURI());

    const packageDoc = new PackageDocument(publication);
    rsjPackage = new ReadiumPackage({ ...packageDoc.getSharedJsPackageData() });
    rsjPackage.spine.handleLinear(true);

    rsjViewSettings = new ViewerSettings({ syntheticSpread: 'single' });

  });

  const createSpineItemView = (pageWidth: number, pageHeight: number) => {
    const spineItemView = new SpineItemView(iframeLoader,
                                            publication.Spine,
                                            rsjPackage.spine,
                                            rsjViewSettings,
                                            false,
                                            false);
    const spineItemViewContainer = document.createElement('div');
    spineItemViewContainer.setAttribute('id', 'spine-item-view');
    spineItemViewContainer.style.position = 'absolute';
    spineItemViewContainer.style.width = `${pageWidth}px`;
    spineItemViewContainer.style.height = `${pageHeight}px`;

    spineItemView.attatchToHost(spineItemViewContainer);

    viewportDiv.appendChild(spineItemViewContainer);

    return spineItemView;
  };

  afterEach(() => {
    document.body.removeChild(viewportDiv);
  });

  describe('#SpineItemView', () => {
    it('loadSpineItem()', async () => {
      const pageWidth = 400;
      const siv = createSpineItemView(pageWidth, 800);
      await siv.loadSpineItem(publication.Spine[0]);
      const pageSize = siv.getTotalSize(pageWidth);

      assert.equal(pageSize, 400);

      const siv4 = createSpineItemView(pageWidth, 800);
      await siv4.loadSpineItem(publication.Spine[4]);
      const page4Size = siv4.getTotalSize(pageWidth);

      assert.equal(page4Size, 7600);

    });

    it('getCfi()', async () => {
      const pageWidth = 400;
      const siv4 = createSpineItemView(pageWidth, 800);
      await siv4.loadSpineItem(publication.Spine[4]);

      const cfi1 = siv4.getCfi(0, 0);
      console.log(cfi1);

      const cfi2 = siv4.getCfi(600, 0);
      console.log(cfi2);

    });
  });
});
