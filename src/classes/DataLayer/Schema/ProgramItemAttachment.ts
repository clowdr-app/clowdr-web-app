import { Base } from ".";
import { AttachmentType, ProgramItem } from "../Interface";
import Parse from "parse";

export default interface Schema extends Base {
    file: Parse.File | undefined;
    url: string | undefined;

    attachmentType: Promise<AttachmentType>;
    programItem: Promise<ProgramItem>;
}
