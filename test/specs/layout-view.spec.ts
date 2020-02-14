// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { LayoutView, SettingName } from '../../src/navigator';
// tslint:disable-next-line:max-line-length
import { HostEnv } from '../helpers/host-env';
import { sleep } from '../../src/utils/misc';

describe('LayoutView', () => {
  let layoutView: LayoutView;
  let hostEnv: HostEnv;

  before(() => {
    const head = document.querySelector('head');
    if (head) {
      head.innerHTML +=
        '<link rel="stylesheet" type="text/css" href="fixtures/window.css">';
    }
  });

  beforeEach(async () => {
    hostEnv = new HostEnv();
    await hostEnv.openPublicationR2('/fixtures/publications/metamorphosis/manifest.json');
    layoutView = hostEnv.getLayoutView();
    layoutView.setPageSize(200, 400);
  });

  afterEach(() => {
    hostEnv.clear();
  });

  describe('#LayoutView', () => {
    it('ensureConentLoadedAtRange()', async () => {
      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 0);

      await layoutView.ensureConentLoadedAtRange(0, 250);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 400);
    });

    it('ensureContentLoadedAtSpineItemRange()', async () => {
      await layoutView.ensureContentLoadedAtSpineItemRange(2, 3);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 400);

      await layoutView.ensureConentLoadedAtRange(-100, 100);
      layoutView.removeOutOfRangeSpineItems(-100, 100);

      assert.equal(layoutView.getLoadedStartPostion(), -200);
      assert.equal(layoutView.getLoadedEndPosition(), 200);
    });

    it('resize()', async () => {
      await layoutView.ensureContentLoadedAtSpineItemRange(0, 1);
      await sleep(1000);

      layoutView.setPageSize(400, 400);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 800);
    });

    it('changeFontSize()', async () => {
      await layoutView.ensureContentLoadedAtSpineItemRange(3, 4);
      await sleep(1000);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 15200);

      hostEnv.getViewSettings().updateSetting([{ name: SettingName.FontSize, value: 60 }]);
      layoutView.updateViewSettings();

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 5600);
    });
  });
});
