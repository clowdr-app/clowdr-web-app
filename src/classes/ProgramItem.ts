import Parse from "parse";

export default class ProgramItem extends Parse.Object{
    constructor() {
        super("ProgramItem");
    }
}
Parse.Object.registerSubclass('ProgramItem', ProgramItem);
