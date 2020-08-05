import Parse from "parse";

export default class User extends Parse.Object{
    constructor() {
        super("User");
    }
    // TS: I think we can declare the available fields here...
}
Parse.Object.registerSubclass('User', User);
