import { Location } from '../../src/navigator/location';
import { Navigator } from '../../src/navigator/navigator';
import { ReadingSystem } from '../../src/navigator/reading-system';
import { Rendition } from '../../src/navigator/rendition';
import { StreamerClient } from '../../src/navigator/streamer-client';
import { Publication } from '../../src/streamer/publication';

export async function openRendition(pubUrl: string): Promise<Rendition> {
  const rs = new ReadingSystem();
  const streamerClient = new StreamerClient();

  const viewport = document.getElementById('viewport');
  if (viewport) {
    rs.initRenderer(viewport);
  }

  const publication = await streamerClient.openPublicationFromUrl(pubUrl);

  return rs.openRendition(publication);
}
