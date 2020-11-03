import { ProgramTrack, ProgramSession, ProgramSessionEvent, ProgramPerson, ProgramItem } from "@clowdr-app/clowdr-db-schema";

export type WholeProgramData = {
    tracks: Array<ProgramTrack>;
    sessions: Array<ProgramSession>;
    events: Array<ProgramSessionEvent>;
    authors: Array<ProgramPerson>;
    items: Array<ProgramItem>;
}

export type SortedItemData = {
    item: ProgramItem;
    eventsForItem: ProgramSessionEvent[];
    authors: ProgramPerson[];
};

export type SortedEventData = {
    event: ProgramSessionEvent;
    item: SortedItemData;

    session?: ProgramSession;
    track?: ProgramTrack;
};

export type SortedSessionData = {
    session: ProgramSession;
    earliestStart: Date;
    latestEnd: Date;
    eventsOfSession: SortedEventData[];
};
