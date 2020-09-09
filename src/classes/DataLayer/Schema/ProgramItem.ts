import { Base } from ".";

export default interface Schema extends Base {
    abstract: string;
    chatSID: string;
    confKey: string;
    isPrivate: boolean;
    posterImage: File;
    title: string;

    // TODO: authors: Promise<Array<ProgramPerson> | null>;
    // TODO: attachments: Promise<Array<ProgramItemAttachment> | null>;
    // TODO: breakoutRoom: Promise<BreakoutRoom | null>;
    // TODO: conference: Promise<Conference | null>;
    // TODO: events: Promise<Array<ProgramSessionEvent> | null>;
    // TODO: programSession: Promise<ProgramSession | null>;
    // TODO: track: Promise<ProgramTrack | null>;
}
