import { ProgramTrack, ProgramSession, ProgramSessionEvent, ProgramPerson, ProgramItem } from "@clowdr-app/clowdr-db-schema";

export type WholeProgramData = {
    tracks: Array<ProgramTrack>;
    sessions: Array<ProgramSession>;
    events: Array<ProgramSessionEvent>;
    authors: Array<ProgramPerson>;
    items: Array<ProgramItem>;
}
