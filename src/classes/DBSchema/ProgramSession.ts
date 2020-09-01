import { Base } from "./Base";
import { ProgramRoom } from "./ProgramRoom";
import { ProgramItem } from "./ProgramItem";
import { Conference } from "./Conference";
import { ProgramSessionEvent } from "./ProgramSessionEvent";

export interface ProgramSession extends Base {
    id: string;
    confKey: string;
    room: ProgramRoom;
    items: Array<ProgramItem>;
    title: string;
    startTime: Date;
    endTime: Date;
    conference: Conference;
    events: Array<ProgramSessionEvent>;
}
