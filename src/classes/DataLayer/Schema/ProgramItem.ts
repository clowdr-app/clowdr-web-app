import { Conference, ProgramPerson, ProgramTrack } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    abstract: string;
    chatSID: string;
    isPrivate: boolean;
    posterImage: Parse.File;
    title: string;

    authors: Promise<Array<ProgramPerson>>;

    // TODO: attachments: Promise<Array<ProgramItemAttachment>>;
    // TODO: breakoutRoom: Promise <BreakoutRoom>;

    conference: Promise<Conference>;

    // TODO: events: Promise<Array<ProgramSessionEvent>>
    // TODO: programSession: Promise<ProgramSession>
    track: Promise<ProgramTrack>;
}
