import { Conference, ProgramItem, ProgramSession } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    directLink: string;
    endTime: number;
    startTime: number;

    conference: Promise<Conference>;
    programItem: Promise<ProgramItem>;
    programSession: Promise<ProgramSession>;
}
