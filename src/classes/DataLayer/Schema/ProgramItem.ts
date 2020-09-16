import { Base } from ".";
import { Conference, ProgramPerson, ProgramSession, ProgramTrack } from "../Interface";
import Parse from "parse";

export default interface Schema extends Base {
    abstract: string;
    isPrivate: boolean;
    posterImage: Parse.File | undefined;
    title: string;

    authors: Promise<Array<ProgramPerson>>;
    conference: Promise<Conference>;
    session: Promise<ProgramSession>;
    track: Promise<ProgramTrack>;
}
