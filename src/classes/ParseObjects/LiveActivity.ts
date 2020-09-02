import Parse from "parse";
import { LiveActivity as Schema } from "../DBSchema/LiveActivity";

export default class LiveActivity
    extends Parse.Object
    implements Schema {

    constructor() {
        super("LiveActivity");
    }

    get topic(): "privateBreakoutRooms" | "profile" {
        return this.get("topic");
    }
}
Parse.Object.registerSubclass('LiveActivity', LiveActivity);
