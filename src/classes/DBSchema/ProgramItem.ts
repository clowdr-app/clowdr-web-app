import { Base } from './Base';
import { Conference } from './Conference';
import { ProgramSession } from './ProgramSession';
import { ProgramTrack } from './ProgramTrack';
import { ProgramSessionEvent } from './ProgramSessionEvent';
import { BreakoutRoom } from './BreakoutRoom';
import { ProgramPerson } from './ProgramPerson';
import { ProgramItemAttachment } from './ProgramItemAttachment';

export interface ProgramItem extends Base {
    id: string;
    attachments: Array<ProgramItemAttachment>;
    authors: Array<ProgramPerson>;
    breakoutRoom: BreakoutRoom;
    chatSID: string;
    conference: Conference;
    confKey: string;
    events: Array<ProgramSessionEvent>;
    isPrivate: boolean;
    programSession: ProgramSession;
    title: string;
    track: ProgramTrack;
    abstract: string;
    posterImage: any;
}
