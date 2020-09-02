import Parse from "parse";
import { InstanceConfiguration as Schema } from "../DBSchema/InstanceConfiguration";
import ClowdrInstance from "./ClowdrInstance";

export default class InstanceConfiguration
    extends Parse.Object
    implements Schema {

    constructor() {
        super("InstanceConfiguration");
    }

    get key(): string {
        return this.get("key");
    }

    get value(): string {
        return this.get("value");
    }

    get instance(): ClowdrInstance {
        return this.get("instance");
    }

}
Parse.Object.registerSubclass('InstanceConfiguration', InstanceConfiguration);
