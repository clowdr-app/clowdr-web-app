import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class ProgramItemAttachment extends Parse.Object{

    constructor() {
        super("ProgramItemAttachment");
    }
}
Parse.Object.registerSubclass('ProgramItemAttachment', ProgramItemAttachment);
