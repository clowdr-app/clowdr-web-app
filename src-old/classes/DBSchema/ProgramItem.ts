import { Base, BaseFields } from './Base';
import { File } from 'parse';
import { KnownKeys } from '../../Util';

export interface ProgramItem extends Base {
    abstract?: string;
    chatSID?: string;
    confKey?: string;
    isPrivate?: boolean;
    posterImage?: File;
    title?: string;
}

export const ProgramItemFields: Array<KnownKeys<ProgramItem>> = [
    ...BaseFields,
    "abstract",
    "chatSID",
    "confKey",
    "isPrivate",
    "posterImage",
    "title"
];
