import { Base } from './Base';
import { ProgramItem } from './ProgramItem';
import { AttachmentType } from './AttachmentType';

export interface ProgramItemAttachment extends Base {
    programItem: ProgramItem;
    attachmentType: AttachmentType;
}
