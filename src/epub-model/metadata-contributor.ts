// https://github.com/edcarroll/ta-json
import {
    JsonObject,
    JsonElementType,
    JsonProperty,
} from "ta-json";

import { IStringMap } from "./metadata-multilang";

@JsonObject()
export class Contributor {

    @JsonProperty("name")
    @JsonElementType(String)
    public Name: string | IStringMap;

    @JsonProperty("sort_as")
    @JsonElementType(String)
    public SortAs: string;

    @JsonProperty("identifier")
    @JsonElementType(String)
    public Identifier: string;

    @JsonProperty("role")
    @JsonElementType(String)
    public Role: string;
}
