import Parse from "parse";
import { ConferenceConfiguration as Schema } from "../DBSchema/ConferenceConfiguration";
import { Conference } from "./Conference";

export class ConferenceConfiguration
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ConferenceConfiguration");
    }

    get key(): string {
        return this.get("key");
    }

    get value(): string {
        return this.get("value");
    }

    get instance(): Conference {
        return this.get("conference");
    }

}
Parse.Object.registerSubclass('ConferenceConfiguration', ConferenceConfiguration);
