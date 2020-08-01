import Parse from "parse";
import ProgramItem from "./ProgramItem";

export default class AttachmentType extends Parse.Object{

    constructor() {
        super("AttachmentType");
    }
}
Parse.Object.registerSubclass('AttachmentType', AttachmentType);
