import { Base } from ".";
import { Conference, ProgramItemAttachment, ProgramPerson, ProgramSession, ProgramSessionEvent, ProgramTrack } from "../Interface";
import Parse from "parse";

export default interface Schema extends Base {
    abstract: string;
    isPrivate: boolean;
    posterImage: Parse.File | undefined;
    title: string;

    attachments: Promise<Array<ProgramItemAttachment>>;
    authors: Promise<Array<ProgramPerson>>;
    conference: Promise<Conference>;
    events: Promise<Array<ProgramSessionEvent>>;
    session: Promise<ProgramSession>;
    track: Promise<ProgramTrack>;
}
