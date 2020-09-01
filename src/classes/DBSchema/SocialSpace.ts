import { Base } from './Base';
import { Conference } from "./Conference";

export interface SocialSpace extends Base {
    id: string;
    name: string;
    isGlobal: boolean;

    chatChannel: string;
    conference: Conference;
}
