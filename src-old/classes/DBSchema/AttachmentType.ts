import { Base } from './Base';
import { File } from 'parse';

export interface AttachmentType extends Base {
    displayAsLink?: boolean;
    isCoverImage?: boolean;
    name?: string;
    ordinal?: number;
    supportsFile?: boolean;
}
