import { assert } from 'chai';
import { IFrameLoader, LayoutView, Viewport } from '../../src/navigator';
import { R2ContentViewFactory } from '../../src/navigator/views/content-view/r2-content-view-factory';
import { ViewSettings } from '../../src/navigator/views/view-settings';
import { Publication } from '../../src/streamer';

describe('Viewport', () => {
  let viewportDiv: HTMLElement;
  let layoutView: LayoutView;
  let viewport: Viewport;

  before(() => {
    const head = document.querySelector('head');
    if (head) {
      head.innerHTML += '<link rel="stylesheet" type="text/css" href="fixtures/window.css">';
    }
  });

  beforeEach(async () => {
    viewportDiv = document.createElement('div');
    viewportDiv.setAttribute('id', 'viewport');

    document.body.appendChild(viewportDiv);

    viewport = new Viewport(viewportDiv);

    const publication = await Publication.fromURL(
      `${window.location.origin}/fixtures/publications/metamorphosis/manifest.json`,
    );

    const loader = new IFrameLoader(publication.getBaseURI());
    loader.setReadiumCssBasePath('/fixtures/readium-css');

    const vs = new ViewSettings();
    layoutView = new LayoutView(publication, vs, new R2ContentViewFactory(loader));
    layoutView.setPageSize(400, 400);

    viewport.setView(layoutView);
    viewport.setViewportSize(800, 800);
  });

  afterEach(() => {
    layoutView.reset();
    document.body.removeChild(viewportDiv);
  });

  describe('#Viewport', () => {
    it('renderAtSpineItem()', async () => {
      await viewport.renderAtSpineItem(1);
      await viewport.renderAtOffset(-300);

      assert.equal(layoutView.getLoadedStartPostion(), -400);
      assert.equal(layoutView.getLoadedEndPosition(), 800);
    });
  });
});
