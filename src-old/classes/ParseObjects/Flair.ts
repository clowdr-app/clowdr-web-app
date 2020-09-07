import Parse from "parse";
import { Flair as Schema } from "../DBSchema/Flair";

export class Flair
    extends Parse.Object
    implements Schema {

    constructor() {
        super("Flair");
    }

    get color(): string {
        return this.get("color");
    }

    get label(): string {
        return this.get("label");
    }

    get tooltip(): string {
        return this.get("tooltip");
    }

    get priority(): number {
        return this.get("priority");
    }

}
Parse.Object.registerSubclass('Flair', Flair);
