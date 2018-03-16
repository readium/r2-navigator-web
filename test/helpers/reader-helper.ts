import { Location } from '../../src/navigator/location';
import { Navigator } from '../../src/navigator/navigator';
import { ReadingSystem } from '../../src/navigator/reading-system';
import { Rendition } from '../../src/navigator/rendition';
import { Publication } from '../../src/streamer/publication';

export async function openRendition(pubUrl: string): Promise<Rendition> {
  const rs = new ReadingSystem();

  const viewport = document.getElementById('viewport');
  if (viewport) {
    rs.initRenderer(viewport);
  }

  const publication = await Publication.fromURL(pubUrl);

  return rs.openRendition(publication);
}
