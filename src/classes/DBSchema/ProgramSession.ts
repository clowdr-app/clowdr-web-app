import { Base } from "./Base";

export interface ProgramSession extends Base {
    confKey: string;
    title: string;
    startTime: Date;
    endTime: Date;

    // TODO: conference: Conference;
    // TODO: events: Array<ProgramSessionEvent>;
    // TODO: items: Array<ProgramItem>;
    // TODO: room: ProgramRoom;
}
