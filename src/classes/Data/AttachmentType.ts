import Parse from 'parse';
import { AttachmentType as Schema, AttachmentTypeFields as FieldNames } from '../DBSchema/AttachmentType';
import { Base } from "./Base";
import { ProgramItem as ProgramItemSchema, ProgramItemFields } from '../DBSchema/ProgramItem';
import { ProgramItem } from "./ProgramItem";

export class AttachmentType extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("AttachmentType", FieldNames, value, dbValue);
    }

    get displayAsLink(): boolean | Promise<boolean> {
        return this.get("displayAsLink");
    }

    get isCoverImage(): boolean | Promise<boolean> {
        return this.get("isCoverImage");
    }

    get name(): string | Promise<string> {
        return this.get("name");
    }

    get ordinal(): number | Promise<number> {
        return this.get("ordinal");
    }

    get supportsFile(): boolean | Promise<boolean> {
        return this.get("supportsFile");
    }

    get programItem(): ProgramItem | Promise<ProgramItem> {
        return this.related<ProgramItemSchema, ProgramItem>("programItem", ProgramItemFields, ProgramItem);
    }
}
