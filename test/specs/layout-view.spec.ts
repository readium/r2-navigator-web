// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { LayoutView, ReadingSystem } from '../../src/navigator';
// tslint:disable-next-line:max-line-length
import { R1ContentViewFactory } from '../../src/navigator/views/content-view/r1-content-view-factory';
import { Publication } from '../../src/streamer';

describe('LayoutView', () => {
  let viewportDiv: HTMLElement;
  let layoutView: LayoutView;

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

    const publication = await Publication.fromURL(
      '/fixtures/publications/metamorphosis/manifest.json',
    );
    layoutView = new LayoutView(publication, new R1ContentViewFactory(publication));

    layoutView.setPageSize(200, 400);
    layoutView.attachToHost(viewportDiv);
  });

  afterEach(() => {
    document.body.removeChild(viewportDiv);
  });

  describe('#LayoutView', () => {
    it('ensureConentLoadedAtRange()', async () => {
      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 0);

      await layoutView.ensureConentLoadedAtRange(0, 250);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 600);
    });

    it('ensureContentLoadedAtSpineItemRange()', async () => {
      await layoutView.ensureContentLoadedAtSpineItemRange(2, 3);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 400);

      await layoutView.ensureConentLoadedAtRange(-100, 100);
      layoutView.removeOutOfRangeSpineItems(-100, 100);

      assert.equal(layoutView.getLoadedStartPostion(), -400);
      assert.equal(layoutView.getLoadedEndPosition(), 200);
    });

    it('resize()', async () => {
      await layoutView.ensureConentLoadedAtRange(0, 400);

      layoutView.setPageSize(400, 400);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 800);
    });

    it('changeFontSize()', async () => {
      await layoutView.ensureContentLoadedAtSpineItemRange(3, 4);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 17000);

      layoutView.updateViewSettings({ fontSize: 60 });

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 6200);
    });
  });
});
