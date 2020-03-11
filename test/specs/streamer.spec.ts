import { assert } from 'chai';

import { Publication } from '../../src/streamer';

describe('StreamerClient', () => {
  describe('#openPublication()', () => {
    it('should open publication from url', async () => {
      const pub = await Publication.fromURL('/fixtures/publications/metamorphosis/manifest.json');
      // tslint:disable-next-line:no-http-string
      assert.equal(pub.context[0], 'http://readium.org/webpub/default.jsonld');
    });
  });
});
