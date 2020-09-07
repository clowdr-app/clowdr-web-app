import Parse from "parse";

export default class AttachmentType extends Parse.Object {

    constructor() {
        super("AttachmentType");
    }
}
Parse.Object.registerSubclass('AttachmentType', AttachmentType);
