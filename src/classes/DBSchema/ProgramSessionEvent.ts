import { Base } from './Base';

export interface ProgramSessionEvent extends Base {
    directLink: string;
    endTime: Date;
    startTime: Date;

    // TODO: conference: Conference;
    // TODO: programItem: ProgramItem;
    // TODO: programSession: ProgramSession;
}
