import Parse from "parse";

export default class LiveActivity extends Parse.Object{
    constructor() {
        super("LiveActivity");
    }
}
Parse.Object.registerSubclass('LiveActivity', LiveActivity);
