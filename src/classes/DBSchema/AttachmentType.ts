import { Base } from './Base';
import { ProgramItem } from './ProgramItem';

export interface AttachmentType extends Base {
    id: string;
    isCoverImage: boolean;
    programItem: ProgramItem;
    displayAsLink: boolean;
    url: string;
    file: any;
    supportsFile: boolean;
    ordinal: number;
    name: string;
}
