// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { SettingName } from '../../src/navigator';
import { HostEnv } from '../helpers/host-env';

describe('SpineItemView', () => {
  let hostEnv: HostEnv;

  const getParagraphStyle = (): CSSStyleDeclaration => {
    const iframe = hostEnv.getIframe();
    const doc = <Document>iframe.contentDocument;
    const ele = <HTMLElement>doc.querySelectorAll('p.indent').item(1);

    return window.getComputedStyle(ele);
  };

  const getHtmlStyle = (): CSSStyleDeclaration => {
    const iframe = hostEnv.getIframe();
    const doc = <Document>iframe.contentDocument;
    const html = <HTMLHtmlElement>doc.querySelector('html');

    return window.getComputedStyle(html);
  };

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

  describe('#ViewSettings', () => {
    it('FontSize', async () => {
      const pageWidth = 400;
      const siv4 = hostEnv.createSpineItemView(pageWidth, 800, false, false);
      await hostEnv.loadSpineItem(siv4, 4);

      const style = getParagraphStyle();

      let fontSize = style.getPropertyValue('font-size');
      assert.equal(fontSize, '16px');

      const vs = hostEnv.getViewSettings();
      vs.updateSetting([{ name: SettingName.FontSize, value: 60 }]);
      siv4.setViewSettings(vs);

      fontSize = style.getPropertyValue('font-size');
      assert.equal(fontSize, '9.6px');
    });

    it('TextColor', async () => {
      const pageWidth = 400;
      const siv4 = hostEnv.createSpineItemView(pageWidth, 800, false, false);
      await hostEnv.loadSpineItem(siv4, 4);

      const style = getParagraphStyle();

      const vs = hostEnv.getViewSettings();
      vs.updateSetting([{ name: SettingName.TextColor, value: '#cc1717' }]);
      siv4.setViewSettings(vs);

      const color = style.getPropertyValue('color');
      assert.equal(color, 'rgb(204, 23, 23)');
    });

    it('BackgroundColor', async () => {
      const pageWidth = 400;
      const siv4 = hostEnv.createSpineItemView(pageWidth, 800, false, false);
      await hostEnv.loadSpineItem(siv4, 4);

      const style = getHtmlStyle();

      const vs = hostEnv.getViewSettings();
      vs.updateSetting([{ name: SettingName.BackgroundColor, value: '#cc1717' }]);
      siv4.setViewSettings(vs);

      const color = style.getPropertyValue('background-color');
      assert.equal(color, 'rgb(204, 23, 23)');
    });

    it('ReadingMode', async () => {
      const pageWidth = 400;
      const siv4 = hostEnv.createSpineItemView(pageWidth, 800, false, false);
      await hostEnv.loadSpineItem(siv4, 4);

      const style = getHtmlStyle();

      const vs = hostEnv.getViewSettings();
      vs.updateSetting([{ name: SettingName.ReadingMode, value: 'readium-sepia-on' }]);
      siv4.setViewSettings(vs);

      let backgroundColor = style.getPropertyValue('background-color');
      assert.equal(backgroundColor, 'rgb(250, 244, 232)');

      vs.updateSetting([{ name: SettingName.ReadingMode, value: 'readium-night-on' }]);
      siv4.setViewSettings(vs);

      backgroundColor = style.getPropertyValue('background-color');
      assert.equal(backgroundColor, 'rgb(0, 0, 0)');

      const color = style.getPropertyValue('color');
      assert.equal(color, 'rgb(254, 254, 254)');
    });
  });
});
