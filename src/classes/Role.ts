import Parse from "parse";

export default class Role extends Parse.Object{
    constructor() {
        super("Role");
    }
}
Parse.Object.registerSubclass('Role', Role);
