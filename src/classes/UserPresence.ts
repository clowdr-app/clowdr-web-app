import Parse from "parse";

export default class UserPresence extends Parse.Object{
    constructor() {
        super("UserPresence");
    }
    // TS: I think we can declare the available fields here...
}
Parse.Object.registerSubclass('UserPresence', UserPresence);
