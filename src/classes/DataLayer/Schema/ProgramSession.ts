import { Base } from ".";
import { Conference, ProgramItem, ProgramRoom, ProgramSessionEvent, ProgramTrack } from "../Interface";

export default interface Schema extends Base {
    endTime: Date;
    startTime: Date;
    title: string;

    conference: Promise<Conference>;
    events: Promise<Array<ProgramSessionEvent>>;
    items: Promise<Array<ProgramItem>>;
    room: Promise<ProgramRoom>;
    track: Promise<ProgramTrack>;
}
