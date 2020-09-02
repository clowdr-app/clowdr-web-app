import Parse from "parse";
import { AttachmentType as Schema } from '../DBSchema/AttachmentType';
import { ProgramItem } from "./ProgramItem";

export class AttachmentType
    extends Parse.Object
    implements Schema {

    constructor() {
        super("AttachmentType");
    }

    get displayAsLink(): boolean {
        return this.get("displayAsLink");
    }

    get isCoverImage(): boolean {
        return this.get("isCoverImage");
    }

    get name(): string {
        return this.get("name");
    }

    get ordinal(): number {
        return this.get("ordinal");
    }

    get supportsFile(): boolean {
        return this.get("supportsFile");
    }

    get programItem(): ProgramItem {
        return this.get("programItem");
    }
}
Parse.Object.registerSubclass('AttachmentType', AttachmentType);
