export type TrackSpec = {
    shortName?: string,
    name: string,
    colour: string
};

export type FeedSpec = {
    id: string,
    name: string,
    videoRoom?: boolean,
    textChat?: boolean,
    zoomRoom?: string,
    youtube?: string
};

export type SessionSpec = {
    id: string,
    title: string,
    chair?: string,
    feed: string,
    track: string,
};

export type ItemSpec = {
    id: string,
    abstract: string,
    exhibit: boolean,
    title: string,
    authors: string[],
    track: string,
    feed?: string,
};

export type PersonSpec = {
    name: string,
    affiliation?: string
    email?: string;
};

export type EventSpec = {
    id: string,
    directLink?: string,
    chair?: string;
    endTime: Date,
    startTime: Date,
    item: string,
    session: string,
    feed?: string,
};

export type AttachmentSpec = {
    url: string,
    attachmentType: string,
    programItem: string,
};

export type AttachmentTypeSpec = {
    name: string;
    displayAsLink: boolean;
    isCoverImage: boolean;
    ordinal: number;
    supportsFile: boolean;
    extra?: string;
    fileTypes?: string[];
};

export type CompleteSpecs = {
    tracks: { [k: string]: TrackSpec | undefined };
    feeds: { [k: string]: FeedSpec | undefined };
    items: { [k: string]: ItemSpec | undefined };
    events: { [k: string]: EventSpec | undefined };
    persons: { [k: string]: PersonSpec | undefined };
    sessions: { [k: string]: SessionSpec | undefined };
    attachmentTypes: { [k: string]: AttachmentTypeSpec | undefined };
};
