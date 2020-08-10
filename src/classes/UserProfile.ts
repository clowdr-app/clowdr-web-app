import Parse from "parse";

export default class UserProfile extends Parse.Object{
    constructor() {
        super("UserProfile");
    }
    // TS: I think we can declare the available fields here...
}
Parse.Object.registerSubclass('UserProfile', UserProfile);
