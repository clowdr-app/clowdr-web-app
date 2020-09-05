import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface AttachmentType extends Base {
    displayAsLink?: boolean;
    isCoverImage?: boolean;
    name?: string;
    ordinal?: number;
    supportsFile?: boolean;
}

export const AttachmentTypeFields: Array<KnownKeys<AttachmentType>> = [
    ...BaseFields,
    "displayAsLink",
    "isCoverImage",
    "name",
    "ordinal",
    "supportsFile"
];
