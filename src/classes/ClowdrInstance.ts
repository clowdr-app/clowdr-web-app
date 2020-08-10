import Parse from "parse";

export default class ClowdrInstance extends Parse.Object{
    constructor() {
        super("ClowdrInstance");
    }
}
Parse.Object.registerSubclass('ClowdrInstance', ClowdrInstance);
