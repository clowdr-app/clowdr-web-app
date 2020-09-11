import { Base } from ".";
import { ProgramItem, AttachmentType } from "../Interface";

export default interface Schema extends Base {
    file: Parse.File;
    url: string;

    programItem: Promise<ProgramItem>;
    attachmentType: Promise<AttachmentType>;
}
