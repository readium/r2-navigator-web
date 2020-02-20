// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import {
  ElementVisibilityChecker,
} from '../../../src/navigator/views/cfi/element-checker';
import { Rect } from '../../../src/navigator/views/cfi/rect';

import { HostEnv } from '../../helpers/host-env';

describe('ElementChecker', () => {
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
  });

  afterEach(() => {
    hostEnv.clear();
  });

  describe('ElementVisibilityChecker', () => {
    it('findFirstVisibleElement()', async () => {
      const pageWidth = 400;
      const siv4 = hostEnv.createSpineItemView(pageWidth, 800, false, false);
      await hostEnv.loadSpineItem(siv4, 4);

      const iframe = hostEnv.getIframe();
      const doc = <Document>(iframe.contentDocument);

      const left = pageWidth;
      const right = left + pageWidth;
      const viewportRect = new Rect(left, 0, right, 800);
      const visChecker = new ElementVisibilityChecker(doc,
                                                      [400, 800],
                                                      viewportRect,
                                                      hostEnv.getElementChecker());
      const visEle = visChecker.findFirstVisibleElement(false);
      // console.log(visEle.textNode);
      assert.isNotNull(visEle.textNode);

      const range = visChecker.getVisibleTextRange(<Node>visEle.textNode, false);
      assert.equal(range.startOffset, 118);

      const rangeBackward = visChecker.getVisibleTextRange(<Node>visEle.textNode, true);
      assert.equal(rangeBackward.startOffset, 851);
    });
  });
});
