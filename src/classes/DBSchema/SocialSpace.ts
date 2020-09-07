import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface SocialSpace extends Base {
    chatChannel: string;
    isGlobal: boolean;
    name: string;
}

export const SocialSpaceFields: Array<KnownKeys<SocialSpace>> = [
    ...BaseFields,
    "chatChannel",
    "isGlobal",
    "name"
];
