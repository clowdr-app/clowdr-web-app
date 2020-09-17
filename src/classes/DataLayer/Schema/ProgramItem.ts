import { Base } from ".";
import { Conference, ProgramPerson, ProgramTrack } from "../Interface";
import Parse from "parse";

export default interface Schema extends Base {
    abstract: string;
    isPrivate: boolean;
    posterImage: Parse.File | undefined;
    title: string;

    authors: Promise<Array<ProgramPerson>>;
    conference: Promise<Conference>;
    track: Promise<ProgramTrack>;
}
