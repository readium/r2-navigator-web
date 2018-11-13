// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { SpineItemView } from '../../src/navigator/views/spine-item-view';
import { HostEnv } from '../helpers/host-env';

describe('SpineItemView', () => {
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
  });

  afterEach(() => {
    hostEnv.clear();
  });

  describe('SpineItemView-R2', () => {
    const pageWidth = 400;
    let siv4: SpineItemView;

    beforeEach(async () => {
      await hostEnv.openPublicationR2('/fixtures/publications/metamorphosis/manifest.json');
      hostEnv.setColumnGap(20);
      siv4 = hostEnv.createSpineItemView(pageWidth, 800, false, false);
      await hostEnv.loadSpineItem(siv4, 4);
    });

    it('loadSpineItem()', async () => {
      const siv = hostEnv.createSpineItemView(pageWidth, 800, false, false);
      await hostEnv.loadSpineItem(siv, 0);
      const pageSize = siv.getTotalSize(pageWidth);
      assert.equal(pageSize, 400);

      const page4Size = siv4.getTotalSize(pageWidth);
      assert.equal(page4Size, 7600);
    });

    it('getCfi()', async () => {
      const cfi1 = siv4.getCfi(0, 0, false);
      console.log(cfi1);

      const cfi2 = siv4.getCfi(600, 0, false);
      console.log(`R2 ${cfi2}`);

    });
  });

  describe('SpineItemView-R2-Vertical', () => {
    const pageWidth = 400;
    let siv4: SpineItemView;

    beforeEach(async () => {
      await hostEnv.openPublicationR2('/fixtures/publications/metamorphosis/manifest.json');
      hostEnv.setColumnGap(20);
      siv4 = hostEnv.createSpineItemView(pageWidth, 800, true, false);
      await hostEnv.loadSpineItem(siv4, 4);
    });

    it('loadSpineItem()', async () => {
      const siv = hostEnv.createSpineItemView(pageWidth, 800, true, false);
      await hostEnv.loadSpineItem(siv, 0);
      const pageSize = siv.getTotalSize(pageWidth);
      assert.equal(pageSize, 347);

      const page4Size = siv4.getTotalSize(pageWidth);
      assert.approximately(page4Size, 15504, 1);
    });

    it('getCfi()', async () => {
      const cfi1 = siv4.getCfi(0, 0, false);
      console.log(cfi1);

      const cfi2 = siv4.getCfi(600, 0, false);
      console.log(`R2 ${cfi2}`);
    });
  });
});
