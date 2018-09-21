// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
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
    await hostEnv.openPublicationR1('/fixtures/publications/metamorphosis/manifest.json');
  });

  afterEach(() => {
    hostEnv.clear();
  });

  describe('#SpineItemView', () => {
    it('loadSpineItem()', async () => {
      const pageWidth = 400;
      const siv = hostEnv.createSpineItemView(pageWidth, 800);
      await hostEnv.loadSpineItem(siv, 0);
      const pageSize = siv.getTotalSize(pageWidth);

      assert.equal(pageSize, 400);

      const siv4 = hostEnv.createSpineItemView(pageWidth, 800);
      await hostEnv.loadSpineItem(siv4, 4);
      const page4Size = siv4.getTotalSize(pageWidth);

      assert.equal(page4Size, 7600);

    });

    it('getCfi()', async () => {
      const pageWidth = 400;
      const siv4 = hostEnv.createSpineItemView(pageWidth, 800);
      await hostEnv.loadSpineItem(siv4, 4);

      const cfi1 = siv4.getCfi(0, 0);
      console.log(cfi1);

      const cfi2 = siv4.getCfi(600, 0);
      console.log(cfi2);

    });
  });
});
