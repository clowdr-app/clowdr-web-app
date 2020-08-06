import Parse from "parse";

export default class ProgramItemAttachment extends Parse.Object{

    constructor() {
        super("ProgramItemAttachment");
    }
}
Parse.Object.registerSubclass('ProgramItemAttachment', ProgramItemAttachment);
