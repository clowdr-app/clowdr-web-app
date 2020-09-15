import { Base } from ".";
import { Conference, ProgramItem, ProgramSession } from "../Interface";

export default interface Schema extends Base {
    colour: string;
    generateTextChatPerItem: boolean;
    generateVideoRoomPerItem: boolean;
    name: string;
    shortName: string;

    conference: Promise<Conference>;
    items: Promise<Array<ProgramItem>>;
    sessions: Promise<Array<ProgramSession>>;
}
