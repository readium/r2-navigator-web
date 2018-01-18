import {readFileSync} from 'fs'

import { StreamerClient } from './navigator/streamer-client'

let sc = new StreamerClient();

let webpub = readFileSync('/Users/lilid/Documents/dev/ATB/bugs/manifest.json', 'utf8');
let pub = sc.openPublicationFromJson(webpub);
console.log(pub.Context);