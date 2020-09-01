import { Base } from './Base';
import { File } from 'parse';

export interface AttachmentType extends Base {
    displayAsLink: boolean;
    file: File;
    isCoverImage: boolean;
    name: string;
    ordinal: number;
    supportsFile: boolean;
    url: string;

    // TODO: programItem: ProgramItem;
}
