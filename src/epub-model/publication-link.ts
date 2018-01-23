// https://github.com/edcarroll/ta-json
import {
  JsonConverter,
  JsonElementType,
  JsonObject,
  JsonProperty,
  OnDeserialized,
} from 'ta-json';
import { JsonStringConverter } from '../utils/ta-json-string-converter';

import { MediaOverlayNode } from './media-overlay';
import { Properties } from './metadata-properties';

@JsonObject()
export class Link {

  @JsonProperty('href')
  @JsonElementType(String)
  public Href: string;

  @JsonProperty('type')
  @JsonElementType(String)
  public TypeLink: string;

  @JsonProperty('height')
  @JsonElementType(Number)
  public Height: number;

  @JsonProperty('width')
  @JsonElementType(Number)
  public Width: number;

  @JsonProperty('title')
  @JsonElementType(String)
  public Title: string;

  @JsonProperty('properties')
  @JsonElementType(Properties)
  public Properties: Properties;

  @JsonProperty('duration')
  @JsonElementType(Number)
  public Duration: number;

  @JsonProperty('bitrate')
  @JsonElementType(Number)
  public Bitrate: number;

  @JsonProperty('templated')
  @JsonElementType(Boolean)
  public Templated: boolean;

  @JsonProperty('children')
  @JsonElementType(Link)
  public Children: Link[];

  public MediaOverlays: MediaOverlayNode[];

  @JsonProperty('rel')
  @JsonConverter(JsonStringConverter)
  @JsonElementType(String)
  public Rel: string[];

  public AddRels(rels: string[]) {
    rels.forEach((rel) => {
      this.AddRel(rel);
    });
  }

  public AddRel(rel: string) {
    if (this.HasRel(rel)) {
      return;
    }
    if (!this.Rel) {
      this.Rel = [rel];
    } else {
      this.Rel.push(rel);
    }
  }

  public HasRel(rel: string): boolean {
    return this.Rel && this.Rel.indexOf(rel) >= 0;
  }

  @OnDeserialized()
  // tslint:disable-next-line:no-unused-variable
  // @ts-ignore: TS6133 (is declared but its value is never read.)
  private _OnDeserialized() {
    if (!this.Href) {
      console.log('Link.Href is not set!');
    }
  }
}
