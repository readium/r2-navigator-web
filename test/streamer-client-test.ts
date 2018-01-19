import { expect, assert } from 'chai';

import { StreamerClient } from '../src/navigator/streamer-client';
import { Publication } from '../src/streamer/publication';

describe('StreamerClient', () => {
    describe('#openPublication()', () => {
        it('should open publication from url', async () => {
            let sc = new StreamerClient();
            let pub = await sc.openPublicationFromUrl('http://localhost:3000/pub/L1VzZXJzL2xpbGlkL0RvY3VtZW50cy9kZXYvQVRCL3NhbXBsZV9ib29rcy9NZXRhbW9ycGhvc2lzLWphY2tzb24uZXB1Yg%3D%3D/manifest.json');
            assert.equal(pub.Context, 'http://readium.org/webpub/default.jsonld');
        });
    });
});