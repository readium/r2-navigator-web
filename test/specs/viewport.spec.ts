// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { LayoutView, Viewport } from '../../src/navigator';
// tslint:disable-next-line:max-line-length
import { R1ContentViewFactory } from '../../src/navigator/views/content-view/r1-content-view-factory';
import { Publication } from '../../src/streamer';

describe('Viewport', () => {
  let viewportDiv: HTMLElement;
  let layoutView: LayoutView;
  let viewport: Viewport;

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

    viewport = new Viewport(viewportDiv);

    // tslint:disable-next-line:max-line-length
    const publication = await Publication.fromURL(
      '/fixtures/publications/metamorphosis/manifest.json',
    );
    layoutView = new LayoutView(publication, new R1ContentViewFactory(publication));
    layoutView.setPageSize(400, 400);

    viewport.setView(layoutView);
    viewport.setViewportSize(800, 800);
  });

  afterEach(() => {
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
