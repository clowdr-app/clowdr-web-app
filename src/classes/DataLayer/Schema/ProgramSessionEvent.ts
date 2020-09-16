import { Base } from ".";
import { Conference, ProgramItem, ProgramSession } from "../Interface";

export default interface Schema extends Base {
    directLink: string | undefined;
    endTime: Date;
    startTime: Date;

    conference: Promise<Conference>;
    item: Promise<ProgramItem>;
    session: Promise<ProgramSession>;
}
