import React, { useEffect, useMemo, useState } from "react";
import Parse from "parse";
import useHeading from "../../../../hooks/useHeading";
import { AttachmentTypeSpec, CompleteSpecs, EventSpec, FeedSpec, ItemSpec, PersonSpec, SessionSpec, TrackSpec } from "./UploadFormatTypes";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import WelcomeTab from "./Tabs/WelcomeTab";
import NextPrevControls from "../Controls/NextPrevControls/NextPrevControls";
import ImportTab from "./Tabs/ImportTab";
import ItemsTab from "./Tabs/ItemsTab";
import AuthorsTab, { generatePersonId } from "./Tabs/AuthorsTab";
import SessionsTab from "./Tabs/SessionsTab";
import EventsTab from "./Tabs/EventsTab";
import TracksTab, { generateTrackId } from "./Tabs/TracksTab";
import UploadTab from "./Tabs/UploadTab";
import "./ProgramEditor.scss";
import assert from "assert";
import { addError, addNotification } from "../../../../classes/Notifications/Notifications";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import useConference from "../../../../hooks/useConference";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { AttachmentType, ProgramTrack, ProgramSession, ProgramSessionEvent, ProgramPerson, ProgramItem, ContentFeed } from "@clowdr-app/clowdr-db-schema";
import { removeUndefined } from "@clowdr-app/clowdr-db-schema/build/Util";

enum ProgramTabs {
    Welcome = 0,
    Import = 1,
    Items = 2,
    Authors = 3,
    Sessions = 4,
    Events = 5,
    Tracks = 6,
    Upload = 7
}

function InnerProgramEditor(props: {
    defaultProgramSpec: CompleteSpecs
}) {
    const conference = useConference();
    const [programSpec, setProgramSpec] = useState<CompleteSpecs>(props.defaultProgramSpec);
    const [uploadProgress, setUploadProgress] = useState<number | false | null>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    const [currentTab, setCurrentTab] = useState<ProgramTabs>(ProgramTabs.Welcome);

    useSafeAsync(async () => {
        if (uploadProgress !== false) {
            const progressStr = await Parse.Cloud.run("import-program-progress", {
                conference: conference.id
            });
            if (progressStr === false) {
                return false;
            }
            else {
                try {
                    const result = parseFloat(progressStr);
                    if (result === 100) {
                        addNotification("Upload completed.");
                        return false;
                    }
                    return result;
                }
                catch {
                    addError("Upload failed: " + progressStr);
                }
            }
        }
        return false;
    }, setUploadProgress, [conference.id, lastUpdateTime], "ResearchrProgramUpload:setUploadProgress");

    useEffect(() => {
        let intervalId: number | null = null;

        if (uploadProgress !== null && uploadProgress !== false) {
            intervalId = window.setInterval(() => {
                setLastUpdateTime(Date.now());
            }, 3000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [uploadProgress]);

    const uploadInProgress = uploadProgress !== null && uploadProgress !== false;

    useHeading("Program Editor");

    const itemsKeys = Object.keys(programSpec.items);
    const sessionsKeys = Object.keys(programSpec.sessions);

    const isFeedInUse = useMemo(() => {
        const itemKeys = Object.keys(programSpec.items);
        const sessionKeys = Object.keys(programSpec.sessions);
        const eventKeys = Object.keys(programSpec.events);

        return (key: string) => {
            return itemKeys.some(itemKey => programSpec.items[itemKey]?.feed === key)
                || sessionKeys.some(sessionKey => programSpec.sessions[sessionKey]?.feed === key)
                || eventKeys.some(eventKey => programSpec.events[eventKey]?.feed === key);
        };
    }, [programSpec]);

    const tabs = useMemo(() => {
        const importEnabled = !uploadInProgress;
        const itemsEnabled = !uploadInProgress;
        const authorsEnabled = !uploadInProgress && itemsKeys.length > 0;
        const sessionsEnabled = !uploadInProgress && itemsKeys.length > 0;
        const eventsEnabled = !uploadInProgress && itemsKeys.length > 0 && sessionsKeys.length > 0;
        const tracksEnabled = !uploadInProgress && itemsKeys.length > 0;
        const uploadEnabled = uploadInProgress || itemsKeys.length > 0;

        const welcomeTabSelector = <Tab disabled={uploadInProgress}>Welcome</Tab>;
        const importTabSelector = <Tab disabled={!importEnabled}>Import</Tab>;
        const itemsTabSelector = <Tab disabled={!itemsEnabled}>Items</Tab>;
        const authorsTabSelector = <Tab disabled={!authorsEnabled}>Authors</Tab>;
        const sessionsTabSelector = <Tab disabled={!sessionsEnabled}>Sessions</Tab>;
        const eventsTabSelector = <Tab disabled={!eventsEnabled}>Events</Tab>;
        const tracksTabSelector = <Tab disabled={!tracksEnabled}>Tracks</Tab>;
        const uploadTabSelector = <Tab disabled={!uploadEnabled}>Upload</Tab>;

        return (
            <Tabs
                defaultFocus={true}
                selectedIndex={uploadInProgress ? ProgramTabs.Upload : currentTab}
                onSelect={(idx, lastIdx) => setCurrentTab(idx)}
            >
                <TabList>
                    {welcomeTabSelector}
                    {importTabSelector}
                    {itemsTabSelector}
                    {authorsTabSelector}
                    {sessionsTabSelector}
                    {eventsTabSelector}
                    {tracksTabSelector}
                    {uploadTabSelector}
                </TabList>

                <TabPanel>
                    <NextPrevControls nextIdx={ProgramTabs.Import} setCurrentTab={setCurrentTab} nextEnabled={importEnabled} />
                    <div className="content">
                        <WelcomeTab />
                    </div>
                </TabPanel>

                <TabPanel>
                    <NextPrevControls prevIdx={ProgramTabs.Welcome} nextIdx={ProgramTabs.Items} setCurrentTab={setCurrentTab} nextEnabled={itemsEnabled} />
                    <div className="content">
                        <ImportTab
                            mergeProgramData={(data) => {
                                // TODO: Merge rather than replace
                                setProgramSpec(data ?? props.defaultProgramSpec);
                            }}
                        />
                    </div>
                </TabPanel>

                <TabPanel>
                    <NextPrevControls prevIdx={ProgramTabs.Import} nextIdx={ProgramTabs.Authors} setCurrentTab={setCurrentTab} nextEnabled={authorsEnabled} nextTooltip="Your program must contain at least one item." />
                    <div className="content">
                        <ItemsTab
                            data={programSpec}
                            createItem={(item) => {
                                if (!programSpec.items[item.id]) {
                                    setProgramSpec(oldSpec => {
                                        const newSpec = { ...oldSpec };

                                        if (item.feed) {
                                            if (item.feed === "video-chat") {
                                                newSpec.feeds[item.id] = {
                                                    id: item.id,
                                                    name: item.title,
                                                    videoRoom: true,
                                                    textChat: true
                                                };
                                            }
                                            else if (item.feed === "chat") {
                                                newSpec.feeds[item.id] = {
                                                    id: item.id,
                                                    name: item.title,
                                                    textChat: true
                                                };
                                            }

                                            item.feed = item.id;
                                        }

                                        newSpec.items[item.id] = item;
                                        return newSpec;
                                    });
                                    return true;
                                }
                                return false;
                            }}
                            createAuthor={(name, affiliation) => {
                                const key = generatePersonId({
                                    name, affiliation
                                });
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    newSpec.persons[key] = { name, affiliation };
                                    return newSpec;
                                });
                                return key;
                            }}
                            createTrack={(name) => {
                                const newTrack = {
                                    name,
                                    shortName: name,
                                    colour: "#ffffff"
                                };
                                const newId = generateTrackId(newTrack);
                                setProgramSpec(oldSpec => {
                                    if (!oldSpec.tracks[newId]) {
                                        const newSpec = { ...oldSpec };
                                        newSpec.tracks[newId] = newTrack;
                                        return newSpec;
                                    }
                                    return oldSpec;
                                });
                                return newId;
                            }}
                            updateItem={(oldId, item) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    if (programSpec.items[oldId] && oldId !== item.id) {
                                        delete newSpec.items[oldId];
                                    }

                                    newSpec.items[item.id] = item;
                                    return newSpec;
                                });
                                return true;
                            }}
                            updateItems={(ids, update) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    for (const id of ids) {
                                        const existingItem = newSpec.items[id];
                                        if (existingItem) {
                                            const newItem = update(existingItem);
                                            if (newItem.id !== existingItem.id) {
                                                delete newSpec.items[existingItem.id];
                                            }
                                            newSpec.items[newItem.id] = newItem;
                                        }
                                    }

                                    return newSpec;
                                });
                            }}
                            updateItemFeed={(itemId, mode) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    const item = newSpec.items[itemId];
                                    if (item) {
                                        const existingFeedId = item.feed;
                                        const existingFeed: FeedSpec | undefined = existingFeedId ? newSpec.feeds[existingFeedId] : undefined;
                                        switch (mode) {
                                            case "video-chat":
                                                if (existingFeed) {
                                                    existingFeed.videoRoom = true;
                                                    existingFeed.textChat = true;
                                                }
                                                else {
                                                    if (existingFeedId) {
                                                        newSpec.feeds[existingFeedId] = {
                                                            id: existingFeedId,
                                                            name: item.title,
                                                            videoRoom: true,
                                                            textChat: true
                                                        };
                                                    }
                                                    else {
                                                        item.feed = item.id;
                                                        newSpec.feeds[item.id] = {
                                                            id: item.id,
                                                            name: item.title,
                                                            videoRoom: true,
                                                            textChat: true
                                                        };
                                                    }
                                                }
                                                break;
                                            case "chat":
                                                if (existingFeed) {
                                                    if ("videoRoom" in existingFeed) {
                                                        delete existingFeed.videoRoom;
                                                    }
                                                    existingFeed.textChat = true;
                                                }
                                                else {
                                                    if (existingFeedId) {
                                                        newSpec.feeds[existingFeedId] = {
                                                            id: existingFeedId,
                                                            name: item.title,
                                                            textChat: true
                                                        };
                                                    }
                                                    else {
                                                        item.feed = item.id;
                                                        newSpec.feeds[item.id] = {
                                                            id: item.id,
                                                            name: item.title,
                                                            textChat: true
                                                        };
                                                    }
                                                }
                                                break;
                                            case "none":
                                                if (existingFeed) {
                                                    assert(existingFeedId);
                                                    delete newSpec.feeds[existingFeedId];
                                                }

                                                if (existingFeedId) {
                                                    delete item.feed;
                                                }
                                                break;
                                        }
                                    }

                                    return newSpec;
                                });
                            }}
                            deleteItems={(keys) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    for (const key of keys) {
                                        const item = newSpec.items[key];
                                        if (item) {
                                            delete newSpec.items[key];
                                            if (item.feed) {
                                                if (!isFeedInUse(item.feed)) {
                                                    delete newSpec.feeds[item.feed];
                                                }
                                            }
                                        }
                                    }

                                    return newSpec;
                                });
                            }}
                        />
                    </div>
                </TabPanel>

                <TabPanel>
                    <NextPrevControls prevIdx={ProgramTabs.Items} nextIdx={ProgramTabs.Sessions} setCurrentTab={setCurrentTab} nextEnabled={sessionsEnabled} />
                    <div className="content">
                        <AuthorsTab
                            data={programSpec}
                            createPerson={(person) => {
                                const key = generatePersonId(person);
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    newSpec.persons[key] = person;
                                    return newSpec;
                                });
                                return key;
                            }}
                            updatePerson={(oldId, person) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    const newId = generatePersonId(person);
                                    if (oldId !== newId) {
                                        const items = Object.values(newSpec.items);
                                        for (const item of items) {
                                            if (item) {
                                                item.authors = item.authors.map(x => x === oldId ? newId : x);
                                            }
                                        }
                                        delete newSpec.persons[oldId];
                                    }

                                    newSpec.persons[newId] = person;
                                    return newSpec;
                                });
                                return true;
                            }}
                            deletePersons={(keys) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    const items = Object.values(newSpec.items);
                                    for (const item of items) {
                                        if (item) {
                                            item.authors = item.authors.filter(x => !keys.includes(x));
                                        }
                                    }

                                    for (const key of keys) {
                                        delete newSpec.persons[key];
                                    }
                                    return newSpec;
                                });
                            }}
                        />
                    </div>
                </TabPanel>

                <TabPanel>
                    <NextPrevControls prevIdx={ProgramTabs.Authors} nextIdx={eventsEnabled ? ProgramTabs.Events : ProgramTabs.Tracks} setCurrentTab={setCurrentTab} nextEnabled={eventsEnabled || tracksEnabled} />
                    <div className="content">
                        <SessionsTab
                            data={programSpec}
                            createSession={(session) => {
                                if (!programSpec.sessions[session.id]) {
                                    setProgramSpec(oldSpec => {
                                        const newSpec = { ...oldSpec };
                                        newSpec.sessions[session.id] = session;
                                        if (!newSpec.feeds[session.feed]) {
                                            newSpec.feeds[session.feed] = {
                                                id: session.id,
                                                name: session.title
                                            };
                                        }
                                        return newSpec;
                                    });
                                    return true;
                                }
                                return false;
                            }}
                            createTrack={(name) => {
                                const newTrack = {
                                    name,
                                    shortName: name,
                                    colour: "#ffffff"
                                };
                                const newId = generateTrackId(newTrack);
                                setProgramSpec(oldSpec => {
                                    if (!oldSpec.tracks[newId]) {
                                        const newSpec = { ...oldSpec };
                                        newSpec.tracks[newId] = newTrack;
                                        return newSpec;
                                    }
                                    return oldSpec;
                                });
                                return newId;
                            }}
                            updateSession={(oldId, session) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    if (programSpec.sessions[oldId] && oldId !== session.id) {
                                        delete newSpec.sessions[oldId];
                                    }
                                    newSpec.sessions[session.id] = session;
                                    return newSpec;
                                });
                                return true;
                            }}
                            updateSessionFeeds={(sessionIds, generateFeed) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    const feedIdsToCheck = [];
                                    for (const sessionId of sessionIds) {
                                        const session = newSpec.sessions[sessionId];
                                        if (session) {
                                            let oldFeed;
                                            if (session.feed) {
                                                feedIdsToCheck.push(session.feed);
                                                oldFeed = newSpec.feeds[session.feed];
                                            }

                                            const newFeed = generateFeed(session.id, oldFeed);
                                            session.feed = newFeed.id;

                                            newSpec.feeds[newFeed.id] = newFeed;
                                        }
                                        else {
                                            newSpec.feeds[sessionId] = generateFeed(sessionId, newSpec.feeds[sessionId]);
                                        }
                                    }

                                    for (const feedId of feedIdsToCheck) {
                                        const inUse
                                            = Object.values(newSpec.items).some(x => x && x.feed === feedId)
                                            || Object.values(newSpec.sessions).some(x => x && x.feed === feedId)
                                            || Object.values(newSpec.events).some(x => x && x.feed === feedId);
                                        if (!inUse) {
                                            delete newSpec.feeds[feedId];
                                        }
                                    }

                                    return newSpec;
                                });
                            }}
                            deleteSessions={(keys) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    for (const key of keys) {
                                        const session = newSpec.sessions[key];
                                        if (session) {
                                            delete newSpec.sessions[key];
                                            if (session.feed) {
                                                if (!isFeedInUse(session.feed)) {
                                                    delete newSpec.feeds[session.feed];
                                                }
                                            }
                                        }
                                    }
                                    return newSpec;
                                });
                            }}
                            deleteFeed={(id) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    if (!isFeedInUse(id)) {
                                        delete newSpec.feeds[id];
                                    }
                                    return newSpec;
                                });
                            }}
                        />
                    </div>
                </TabPanel>

                <TabPanel>
                    <NextPrevControls prevIdx={ProgramTabs.Sessions} nextIdx={ProgramTabs.Tracks} setCurrentTab={setCurrentTab} nextEnabled={tracksEnabled} />
                    <div className="content">
                        <EventsTab
                            data={programSpec}
                            createEvent={(event) => {
                                if (!programSpec.events[event.id]) {
                                    setProgramSpec(oldSpec => {
                                        const newSpec = { ...oldSpec };
                                        newSpec.events[event.id] = event;
                                        return newSpec;
                                    });
                                    return true;
                                }
                                return false;
                            }}
                            updateEvent={(oldId, event) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    if (programSpec.events[oldId] && oldId !== event.id) {
                                        delete newSpec.events[oldId];
                                    }
                                    newSpec.events[event.id] = event;
                                    return newSpec;
                                });
                                return true;
                            }}
                            updateEvents={(ids, update) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    for (const id of ids) {
                                        const existingEvent = newSpec.events[id];
                                        if (existingEvent) {
                                            const newEvent = update(existingEvent);
                                            if (newEvent.id !== existingEvent.id) {
                                                delete newSpec.events[existingEvent.id];
                                            }
                                            newSpec.events[newEvent.id] = newEvent;
                                        }
                                    }

                                    return newSpec;
                                });
                            }}
                            deleteEvents={(keys) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    for (const key of keys) {
                                        const event = newSpec.events[key];
                                        if (event) {
                                            delete newSpec.events[key];
                                        }
                                    }
                                    return newSpec;
                                });
                            }}
                        />
                    </div>
                </TabPanel>

                <TabPanel>
                    <NextPrevControls prevIdx={eventsEnabled ? ProgramTabs.Events : ProgramTabs.Sessions} nextIdx={ProgramTabs.Upload} setCurrentTab={setCurrentTab} nextEnabled={eventsEnabled || sessionsEnabled} />
                    <div className="content">
                        <TracksTab
                            data={programSpec}
                            createTrack={(track) => {
                                const key = generateTrackId(track);
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };
                                    newSpec.tracks[key] = track;
                                    return newSpec;
                                });
                                return key;
                            }}
                            updateTrack={(oldId, track) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    const newId = generateTrackId(track);
                                    if (oldId !== newId) {
                                        const sessions = Object.values(newSpec.sessions);
                                        for (const session of sessions) {
                                            if (session && session.track === oldId) {
                                                session.track = newId;
                                            }
                                        }

                                        const items = Object.values(newSpec.items);
                                        for (const item of items) {
                                            if (item && item.track === oldId) {
                                                item.track = newId;
                                            }
                                        }

                                        delete newSpec.tracks[oldId];
                                    }

                                    newSpec.tracks[newId] = track;
                                    return newSpec;
                                });
                                return true;
                            }}
                            deleteTracks={(keys) => {
                                setProgramSpec(oldSpec => {
                                    const newSpec = { ...oldSpec };

                                    const sessions = Object.values(newSpec.sessions);
                                    for (const session of sessions) {
                                        if (session) {
                                            keys = keys.filter(x => x !== session.track);
                                        }
                                    }

                                    const items = Object.values(newSpec.items);
                                    for (const item of items) {
                                        if (item) {
                                            keys = keys.filter(x => x !== item.track);
                                        }
                                    }

                                    for (const key of keys) {
                                        delete newSpec.tracks[key];
                                    }
                                    return newSpec;
                                });
                            }}
                        />
                    </div>
                </TabPanel>

                <TabPanel>
                    {tracksEnabled
                        ? <NextPrevControls prevIdx={ProgramTabs.Tracks} setCurrentTab={setCurrentTab} />
                        : <></>}
                    <div className="content">
                        <UploadTab
                            programData={programSpec}
                            setUploadProgress={setUploadProgress}
                            uploadProgress={uploadProgress}
                        />
                    </div>
                </TabPanel>
            </Tabs>
        );
    }, [currentTab, isFeedInUse, itemsKeys.length, programSpec, props.defaultProgramSpec, sessionsKeys.length, uploadInProgress, uploadProgress]);

    return (
        <div className="admin-program-editor admin-editor">
            {tabs}
        </div>
    );
}

export default function ProgramEditor() {
    const conference = useConference();
    // TODO: Load from existing program
    const [defaultProgramSpec, setDefaultProgramSpec] = useState<CompleteSpecs | null>(null);

    useSafeAsync(
        async () => {
            const [tracks, sessions, events, authors, items, feeds, attachmentTypes]
                = await Promise.all<
                    Array<ProgramTrack>,
                    Array<ProgramSession>,
                    Array<ProgramSessionEvent>,
                    Array<ProgramPerson>,
                    Array<ProgramItem>,
                    Array<FeedSpec & { parseId: string }>,
                    Array<AttachmentType>
                >([
                    ProgramTrack.getAll(conference.id),
                    ProgramSession.getAll(conference.id),
                    ProgramSessionEvent.getAll(conference.id),
                    ProgramPerson.getAll(conference.id),
                    ProgramItem.getAll(conference.id),
                    ContentFeed.getAll(conference.id).then(async _feeds => {
                        const specs: Array<FeedSpec & { parseId: string }> = [];
                        for (const feed of _feeds) {
                            specs.push({
                                parseId: feed.id,
                                id: feed.originatingID ?? feed.id,
                                name: feed.name,
                                textChat: !!feed.textChat,
                                videoRoom: !!feed.videoRoom,
                                youtube: (await feed.youtube)?.videoId,
                                zoomRoom: (await feed.zoomRoom)?.url
                            });
                        }
                        return specs;
                    }),
                    AttachmentType.getAll(conference.id)
                ]);
            return {
                tracks: tracks.reduce((acc, o) => {
                    const spec: TrackSpec = {
                        name: o.name,
                        shortName: o.shortName,
                        colour: o.colour
                    };
                    acc[generateTrackId(spec)] = spec;
                    return acc;
                }, {}),
                feeds: feeds.reduce((acc, spec) => {
                    const theSpec: any = { ...spec };
                    delete theSpec.parseId;
                    acc[spec.id] = theSpec;
                    return acc;
                }, {}),
                items: items.reduce((acc, o) => {
                    const id = o.originatingID ?? o.id;
                    const track = tracks.find(_track => _track.id === o.trackId);
                    assert(track);
                    const feedId = o.feedId ? feeds.find(feed => feed.parseId === o.feedId)?.id : undefined;
                    const spec: ItemSpec = {
                        id,
                        abstract: o.abstract,
                        authors: removeUndefined(o.authors.map(authorId => {
                            const author = authors.find(_author => _author.id === authorId);
                            if (author) {
                                return generatePersonId(author);
                            }
                            return undefined;
                        })),
                        exhibit: o.exhibit,
                        title: o.title,
                        track: generateTrackId(track),
                        feed: feedId
                    };
                    acc[id] = spec;
                    return acc;
                }, {}),
                events: events.reduce((acc, o) => {
                    const id = o.originatingID ?? o.id;

                    const item = items.find(_item => _item.id === o.itemId);
                    assert(item);
                    const itemId = item.originatingID ?? item.id;

                    const session = sessions.find(_session => _session.id === o.sessionId);
                    assert(session);
                    const sessionId = session.originatingID ?? session.id;

                    const feedId = o.feedId ? feeds.find(feed => feed.parseId === o.feedId)?.id : undefined;
                    const spec: EventSpec = {
                        id,
                        endTime: o.endTime,
                        startTime: o.startTime,
                        chair: o.chair,
                        directLink: o.directLink,
                        item: itemId,
                        session: sessionId,
                        feed: feedId
                    };
                    acc[id] = spec;
                    return acc;
                }, {}),
                persons: authors.reduce((acc, o) => {
                    const spec: PersonSpec = {
                        name: o.name,
                        affiliation: o.affiliation,
                        email: o.email
                    };
                    const id = generatePersonId(spec);
                    acc[id] = spec;
                    return acc;
                }, {}),
                sessions: sessions.reduce((acc, o) => {
                    const id = o.originatingID ?? o.id;
                    const track = tracks.find(_track => _track.id === o.trackId);
                    assert(track);
                    const feedId = feeds.find(feed => feed.parseId === o.feedId)?.id;
                    assert(feedId);
                    const spec: SessionSpec = {
                        id,
                        title: o.title,
                        chair: o.chair,
                        track: generateTrackId(track),
                        feed: feedId
                    };
                    acc[id] = spec;
                    return acc;
                }, {}),
                attachmentTypes: attachmentTypes.reduce((acc, o) => {
                    const spec: AttachmentTypeSpec = {
                        name: o.name,
                        displayAsLink: o.displayAsLink,
                        isCoverImage: o.isCoverImage,
                        ordinal: o.ordinal ?? 0,
                        supportsFile: o.supportsFile,
                        extra: o.extra,
                        fileTypes: o.fileTypes
                    };
                    acc[o.id] = spec;
                    return acc;
                }, {})
            };
        },
        setDefaultProgramSpec,
        [conference.id], "WholeProgram:setData");

    return (
        !defaultProgramSpec
            ? <LoadingSpinner message="Loading program" />
            : <InnerProgramEditor defaultProgramSpec={defaultProgramSpec} />
    );
}
