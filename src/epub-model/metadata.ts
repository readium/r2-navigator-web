// https://github.com/edcarroll/ta-json
import {
  JsonElementType,
  JsonObject,
  JsonProperty,
  OnDeserialized,
} from 'ta-json';

import { BelongsTo } from './metadata-belongsto';
import { Contributor } from './metadata-contributor';
import { MediaOverlay } from './metadata-media-overlay';
import { IStringMap } from './metadata-multilang';
import { Properties } from './metadata-properties';
import { Subject } from './metadata-subject';

// export interface IMeta {
//     property: string;
//     value: string;
//     children: IMeta[];
// }

@JsonObject()
export class Metadata {
  @JsonProperty('@type')
  @JsonElementType(String)
  public RDFType: string;

  @JsonProperty('title')
  @JsonElementType(String)
  // @JsonType(String)
  // not needed because primitive string union with
  // simple object type (string keys, string values)
  public Title: string | IStringMap; // | string[] | IStringMap[]

  @JsonProperty('identifier')
  @JsonElementType(String)
  public Identifier: string;

  @JsonProperty('author')
  @JsonElementType(Contributor)
  public Author: Contributor[];

  @JsonProperty('translator')
  @JsonElementType(Contributor)
  public Translator: Contributor[];

  @JsonProperty('editor')
  @JsonElementType(Contributor)
  public Editor: Contributor[];

  @JsonProperty('artist')
  @JsonElementType(Contributor)
  public Artist: Contributor[];

  @JsonProperty('illustrator')
  @JsonElementType(Contributor)
  public Illustrator: Contributor[];

  @JsonProperty('letterer')
  @JsonElementType(Contributor)
  public Letterer: Contributor[];

  @JsonProperty('penciler')
  @JsonElementType(Contributor)
  public Penciler: Contributor[];

  @JsonProperty('colorist')
  @JsonElementType(Contributor)
  public Colorist: Contributor[];

  @JsonProperty('inker')
  @JsonElementType(Contributor)
  public Inker: Contributor[];

  @JsonProperty('narrator')
  @JsonElementType(Contributor)
  public Narrator: Contributor[];

  @JsonProperty('contributor')
  @JsonElementType(Contributor)
  public Contributor: Contributor[];

  @JsonProperty('publisher')
  @JsonElementType(Contributor)
  public Publisher: Contributor[];

  @JsonProperty('imprint')
  @JsonElementType(Contributor)
  public Imprint: Contributor[];

  @JsonProperty('language')
  @JsonElementType(String)
  public Language: string[];

  @JsonProperty('modified')
  @JsonElementType(Date)
  public Modified: Date;

  @JsonProperty('published')
  @JsonElementType(Date)
  public PublicationDate: Date;

  @JsonProperty('description')
  @JsonElementType(String)
  public Description: string;

  @JsonProperty('direction')
  @JsonElementType(String)
  public Direction: string;

  @JsonProperty('rendition')
  @JsonElementType(Properties)
  public Rendition: Properties;

  @JsonProperty('source')
  @JsonElementType(String)
  public Source: string;

  @JsonProperty('epub-type')
  @JsonElementType(String)
  public EpubType: string[];

  @JsonProperty('rights')
  @JsonElementType(String)
  public Rights: string;

  @JsonProperty('subject')
  @JsonElementType(Subject)
  public Subject: Subject[];

  @JsonProperty('belongs_to')
  @JsonElementType(BelongsTo)
  public BelongsTo: BelongsTo;

  @JsonProperty('duration')
  @JsonElementType(Number)
  public Duration: number;

  @JsonProperty('media-overlay')
  @JsonElementType(MediaOverlay)
  public MediaOverlay: MediaOverlay;

  // public OtherMetadata: IMeta[];

  @OnDeserialized()
  // tslint:disable-next-line:no-unused-variable
  // @ts-ignore: TS6133 (is declared but its value is never read.)
  private onDeserialized() {
    if (!this.Title) {
      console.log('Metadata.Title is not set!');
    }
    if (!this.Identifier) {
      console.log('Metadata.Identifier is not set!');
    }
  }
}
