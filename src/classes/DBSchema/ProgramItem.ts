import { Base } from './Base';
import { File } from 'parse';

export interface ProgramItem extends Base {
    abstract?: string;
    chatSID?: string;
    confKey?: string;
    isPrivate?: boolean;
    posterImage?: File;
    title?: string;
}
