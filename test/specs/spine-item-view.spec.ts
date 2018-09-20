// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { ReadingSystem } from '../../src/navigator';
// tslint:disable-next-line:max-line-length
import { R1ContentViewFactory } from '../../src/navigator/views/content-view/r1-content-view-factory';
import { SpineItemView } from '../../src/navigator/views/spine-item-view';
import { ViewSettings } from '../../src/navigator/views/view-settings';
import { Publication } from '../../src/streamer';

describe('SpineItemView', () => {
  let viewportDiv: HTMLElement;
  let publication: Publication;
  let contentFactory: R1ContentViewFactory;
  let viewSettings: ViewSettings;

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

    contentFactory = new R1ContentViewFactory(publication);
    viewSettings = new ViewSettings();
  });

  const createSpineItemView = (pageWidth: number, pageHeight: number) => {
    const spineItemView = new SpineItemView(publication.Spine,
                                            false,
                                            false,
                                            contentFactory);
    const spineItemViewContainer = document.createElement('div');
    spineItemViewContainer.setAttribute('id', 'spine-item-view');
    spineItemViewContainer.style.position = 'absolute';
    spineItemViewContainer.style.width = `${pageWidth}px`;
    spineItemViewContainer.style.height = `${pageHeight}px`;

    spineItemView.attachToHost(spineItemViewContainer);

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
      await siv.loadSpineItem(publication.Spine[0], viewSettings);
      const pageSize = siv.getTotalSize(pageWidth);

      assert.equal(pageSize, 400);

      const siv4 = createSpineItemView(pageWidth, 800);
      await siv4.loadSpineItem(publication.Spine[4], viewSettings);
      const page4Size = siv4.getTotalSize(pageWidth);

      assert.equal(page4Size, 7600);

    });

    it('getCfi()', async () => {
      const pageWidth = 400;
      const siv4 = createSpineItemView(pageWidth, 800);
      await siv4.loadSpineItem(publication.Spine[4], viewSettings);

      const cfi1 = siv4.getCfi(0, 0);
      console.log(cfi1);

      const cfi2 = siv4.getCfi(600, 0);
      console.log(cfi2);

    });
  });
});
