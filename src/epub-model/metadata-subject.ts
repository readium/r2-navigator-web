// https://github.com/edcarroll/ta-json
import {
    JsonObject,
    JsonElementType,
    JsonProperty,
    OnDeserialized,
} from "ta-json";

@JsonObject()
export class Subject {

    @JsonProperty("name")
    @JsonElementType(String)
    public Name: string;

    @JsonProperty("sort_as")
    @JsonElementType(String)
    public SortAs: string;

    @JsonProperty("scheme")
    @JsonElementType(String)
    public Scheme: string;

    @JsonProperty("code")
    @JsonElementType(String)
    public Code: string;

    @OnDeserialized()
    // tslint:disable-next-line:no-unused-variable
    // @ts-ignore: TS6133 (is declared but its value is never read.)
    private _OnDeserialized() {
        if (!this.Name) {
            console.log("Subject.Name is not set!");
        }
    }
}
