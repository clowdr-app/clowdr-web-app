import Parse from "parse";
import { ProgramItemAttachment as Schema, ProgramItemAttachmentFields } from "../DBSchema/ProgramItemAttachment";
import { ProgramItem } from "./ProgramItem";
import { AttachmentType } from "./AttachmentType";
import { Base } from "./Base";

export class ProgramItemAttachment extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ProgramItemAttachment", ProgramItemAttachmentFields, value, dbValue);
    }

    get file(): Parse.File | Promise<Parse.File> {
        return this.get("file");
    }

    get url(): string | Promise<string> {
        return this.get("url");
    }

    get programItem(): ProgramItem | Promise<ProgramItem> {
        return this.programItem;
    }

    get attachmentType(): AttachmentType | Promise<AttachmentType> {
        return this.attachmentType;
    }

}
