import Parse from "parse";
import { ProgramItemAttachment as Schema } from "../DBSchema/ProgramItemAttachment";
import ProgramItem from "./ProgramItem";
import AttachmentType from "./AttachmentType";

export default class ProgramItemAttachment
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ProgramItemAttachment");
    }

    get file(): Parse.File {
        return this.get("file");
    }

    get url(): string {
        return this.get("url");
    }

    get programItem(): ProgramItem {
        return this.programItem;
    }

    get attachmentType(): AttachmentType {
        return this.attachmentType;
    }

}
Parse.Object.registerSubclass('ProgramItemAttachment', ProgramItemAttachment);
