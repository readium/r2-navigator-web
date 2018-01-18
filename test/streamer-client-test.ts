import { test } from 'ava';
import * as fs from 'fs';
import * as path from 'path';

import { StreamerClient } from '../src/navigator/streamer-client';

test("Test StreamerClient", (t) => {
    let sc = new StreamerClient();

    let webpub = fs.readFileSync(path.resolve(__dirname, '../../test/manifest.json'), 'utf8');
    let pub = sc.openPublicationFromJson(webpub);

    t.is(pub.Context, 'http://readium.org/webpub/default.jsonld');
    t.true(pub.getManifestJSON() != null);
});