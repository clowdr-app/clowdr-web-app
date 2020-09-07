import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface ProgramItemAttachment extends Base {
    file: Parse.File;
    url: string;
}

export const ProgramItemAttachmentFields: Array<KnownKeys<ProgramItemAttachment>> = [
    ...BaseFields,
    "file",
    "url"
];
