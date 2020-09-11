import {
    BreakoutRoom, Conference, ProgramPerson, ProgramItemAttachment,
    ProgramSession, ProgramSessionEvent, ProgramTrack
} from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    abstract: string;
    chatSID: string;
    isPrivate: boolean;
    posterImage: Parse.File;
    title: string;

    authors: Promise<Array<ProgramPerson>>;
    attachments: Promise<Array<ProgramItemAttachment>>;
    breakoutRoom: Promise <BreakoutRoom>;
    conference: Promise<Conference>;
    events: Promise<Array<ProgramSessionEvent>>
    programSession: Promise<ProgramSession>
    track: Promise<ProgramTrack>;
}
