import { Base } from './Base';

export interface ProgramItemAttachment extends Base {
    file?: Parse.File;
    url?: string;
}
