import { Base } from ".";
import { Conference, ProgramRoom, ProgramTrack } from "../Interface";

export default interface Schema extends Base {
    endTime: Date;
    startTime: Date;
    title: string;

    conference: Promise<Conference>;
    room: Promise<ProgramRoom>;
    track: Promise<ProgramTrack>;
}
