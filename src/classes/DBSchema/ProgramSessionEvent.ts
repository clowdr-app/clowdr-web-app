import { Base } from './Base';
import { Conference } from './Conference';
import { ProgramItem } from './ProgramItem';
import { ProgramSession } from './ProgramSession';

export interface ProgramSessionEvent extends Base {
    conference: Conference;
    programItem: ProgramItem;
    programSession: ProgramSession;
    startTime: Date;
    endTime: Date;
    directLink: string;
}
