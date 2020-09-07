import Parse from "parse";
import { LiveActivity as Schema, LiveActivityFields } from "../DBSchema/LiveActivity";
import { Base } from "./Base";

export type Topics = "privateBreakoutRooms" | "profile";

export class LiveActivity extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("LiveActivity", LiveActivityFields, value, dbValue);
    }

    get topic(): Topics | Promise<Topics> {
        return this.get("topic");
    }
}
