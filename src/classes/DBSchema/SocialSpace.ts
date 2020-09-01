import { Base } from './Base';

export interface SocialSpace extends Base {
    chatChannel: string;
    isGlobal: boolean;
    name: string;

    // conference: Conference;
}
