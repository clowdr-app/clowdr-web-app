import { Base } from './Base';
import { File } from 'parse';

export interface ProgramItem extends Base {
    abstract: string;
    chatSID: string;
    confKey: string;
    isPrivate: boolean;
    posterImage: File;
    title: string;

    // TODO: authors: Array<ProgramPerson>;
    // TODO: attachments: Array<ProgramItemAttachment>;
    // TODO: breakoutRoom: BreakoutRoom;
    // TODO: conference: Conference;
    // TODO: events: Array<ProgramSessionEvent>;
    // TODO: programSession: ProgramSession;
    // TODO: track: ProgramTrack;
}
