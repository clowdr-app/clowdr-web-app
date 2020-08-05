import Parse from "parse";

export default class ProgramItem extends Parse.Object{
    constructor() {
        super("ProgramItem");
    }
    // TS: I think we can declare the available fields here...
}
Parse.Object.registerSubclass('ProgramItem', ProgramItem);
