import { assert, expect } from 'chai';

import { StreamerClient } from '../src/navigator/streamer-client';
import { Publication } from '../src/streamer/publication';

describe('StreamerClient', () => {
  describe('#openPublication()', () => {
    it('should open publication from url', async () => {
      const sc = new StreamerClient();
      let pub = await sc.openPublicationFromUrl('/fixtures/publications/metamorphosis/manifest.json');
      // tslint:disable-next-line:no-http-string
      assert.equal(pub.Context, 'http://readium.org/webpub/default.jsonld');
    });
  });
});
