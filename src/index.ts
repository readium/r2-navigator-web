import { readFileSync } from 'fs';

import { StreamerClient } from './navigator/streamer-client';

const sc = new StreamerClient();

const webpub = readFileSync('/Users/lilid/Documents/dev/ATB/bugs/manifest.json', 'utf8');
const pub = sc.openPublicationFromJson(webpub);
console.log(pub.Context);
