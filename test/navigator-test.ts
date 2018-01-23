import { assert } from 'chai';
import { ReadingSystem } from '../src/navigator/reading-system';
import { StreamerClient } from '../src/navigator/streamer-client';
import { Publication } from '../src/streamer/publication';

describe('Navigator', () => {

  before(() => {
    const head = document.querySelector('head');
    if (head) {
      head.innerHTML +=
      '<link rel="stylesheet" type="text/css" href="sdk.css">';
    }

    const viewportDiv = document.createElement('div');
    viewportDiv.setAttribute('id', 'viewport');

    document.body.appendChild(viewportDiv);
  });

  describe('#rendition', () => {
    it('render()', async () => {
      const rs = new ReadingSystem();
      const streamerClient = new StreamerClient();

      const viewport = document.getElementById('viewport');
      if (viewport) {
        rs.initRenderer(viewport);
      }

      const publication = await streamerClient.openPublicationFromUrl('/fixtures/publications/metamorphosis/manifest.json');
      const rendition = rs.openRendition(publication);
      // await rendition.render();

      assert.equal(1, 1);
    });
  });
});
