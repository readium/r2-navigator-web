// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { IFrameLoader } from '../../../src/navigator/iframe-loader';
import {
  ElementBlacklistedChecker,
  ElementVisibilityChecker,
} from '../../../src/navigator/views/cfi/element-checker';
import { Rect } from '../../../src/navigator/views/cfi/rect';
// tslint:disable-next-line:max-line-length
import { R2ContentViewFactory } from '../../../src/navigator/views/content-view/r2-content-view-factory';
import { SpineItemView } from '../../../src/navigator/views/spine-item-view';
import { ViewSettings } from '../../../src/navigator/views/view-settings';
import { Publication } from '../../../src/streamer';

describe('SpineItemView', () => {
  let viewportDiv: HTMLElement;
  let publication: Publication;
  let contentFactory: R2ContentViewFactory;
  let viewSettings: ViewSettings;
  let dummyEleChecker: ElementBlacklistedChecker;

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

    publication = await Publication.fromURL(
      '/fixtures/publications/metamorphosis/manifest.json',
    );

    const loader = new IFrameLoader(publication.getBaseURI());
    loader.setReadiumCssBasePath('/fixtures/readium-css');

    contentFactory = new R2ContentViewFactory(loader);
    viewSettings = new ViewSettings();
    dummyEleChecker = new ElementBlacklistedChecker([], [], []);
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

  describe('#ElementVisibilityChecker', () => {
    it('findFirstVisibleElement()', async () => {
      const pageWidth = 400;
      const siv4 = createSpineItemView(pageWidth, 800);
      await siv4.loadSpineItem(publication.Spine[4], viewSettings);

      const iframe = <HTMLIFrameElement>(viewportDiv.querySelector('iframe'));
      const doc = <Document>(iframe.contentDocument);

      const left = pageWidth;
      const right = left + pageWidth;
      const viewportRect = new Rect(left, 0, right, 800);
      const visChecker = new ElementVisibilityChecker(doc, viewportRect, dummyEleChecker);
      const visEle = visChecker.findFirstVisibleElement();
      // console.log(visEle.textNode);
      assert.isNotNull(visEle.textNode);

      const range = visChecker.getVisibleTextRange(<Node>visEle.textNode, true);
      assert.equal(range.startOffset, 118);
    });
  });
});
