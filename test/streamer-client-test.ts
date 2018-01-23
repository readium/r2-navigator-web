import { expect, assert } from 'chai';

import { StreamerClient } from '../src/navigator/streamer-client';
import { Publication } from '../src/streamer/publication';

describe('StreamerClient', () => {
    describe('#openPublication()', () => {
        it('should open publication from url', async () => {
            let sc = new StreamerClient();
            let pub = await sc.openPublicationFromUrl('/fixtures/publications/metamorphosis/manifest.json');
            assert.equal(pub.Context, 'http://readium.org/webpub/default.jsonld');
        });
    });
});