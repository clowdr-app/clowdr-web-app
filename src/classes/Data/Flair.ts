import Parse from "parse";
import { Flair as Schema, FlairFields } from "../DBSchema/Flair";
import { Base } from "./Base";

export class Flair extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("Flair", FlairFields, value, dbValue);
    }

    get color(): string | Promise<string> {
        return this.get("color");
    }

    get label(): string | Promise<string> {
        return this.get("label");
    }

    get tooltip(): string | Promise<string> {
        return this.get("tooltip");
    }

    get priority(): number | Promise<number> {
        return this.get("priority");
    }

}
