import { Conference, ProgramItem, ProgramSessionEvent, ProgramRoom, ProgramTrack } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    title: string;
    startTime: number;
    endTime: number;
    conference: Promise<Conference>;
    events: Promise<Array<ProgramSessionEvent>>;
    items: Promise<Array<ProgramItem>>;
    room: Promise<ProgramRoom>;
    programTrack: Promise<ProgramTrack>;
}
