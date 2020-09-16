import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    colour: string;
    generateTextChatPerItem: boolean;
    generateVideoRoomPerItem: boolean;
    name: string;
    shortName: string;

    conference: Promise<Conference>;
}
