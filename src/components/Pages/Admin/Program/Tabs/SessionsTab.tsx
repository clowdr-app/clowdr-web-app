import React, { useState, useCallback, useMemo } from "react";
import { CompleteSpecs, SessionSpec, FeedSpec } from "../UploadFormatTypes";
import AdminEditor, { EditorProps } from "../../Controls/Editor/Editor";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import "./SessionsTab.scss";
import { NewItemKey } from "../../Controls/Editor/EditorTable";
import { addError } from "../../../../../classes/Notifications/Notifications";
import assert from "assert";
import { removeUndefined } from "@clowdr-app/clowdr-db-schema/build/Util";
import { v4 as uuidv4 } from "uuid";

const Editor = (props: EditorProps<SessionSpec | undefined, {
    title: string;
    track: ReadonlyArray<{
        label: string;
        value: string;
    }>
}>) => AdminEditor(props);

interface Props {
    data: CompleteSpecs;

    createSession: (data: SessionSpec) => boolean;
    createTrack: (trackName: string) => string;
    updateSession: (oldId: string, data: SessionSpec) => boolean;
    updateSessionFeeds: (ids: string[], generate: (sessionId: string, existingFeed?: FeedSpec) => FeedSpec) => void;
    deleteSessions: (keys: string[]) => void;
    deleteFeed: (id: string) => void;
}

export default function SessionsTab(props: Props) {
    // TODO: Enforce title min length when editing an existing item

    const [newItem, setNewItem] = useState<Partial<SessionSpec>>();
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [titleFilter, setTitleFilter] = useState<string>("");
    const [trackFilter, setTrackFilter] = useState<ReadonlyArray<{ label: string; value: string }>>([]);
    const propsData = props.data;
    const propsCreateSession = props.createSession;
    const propsCreateTrack = props.createTrack;
    const propsUpdateSession = props.updateSession;
    const propsUpdateSessionFeeds = props.updateSessionFeeds;
    const propsDeleteSessions = props.deleteSessions;

    const trackKeys = Object.keys(propsData.tracks);
    const trackOptions = useMemo(() => Object
        .keys(propsData.tracks)
        .map(trackKey => ({
            label: propsData.tracks[trackKey]?.name,
            value: trackKey
        }))
        .sort((x, y) => x.value.localeCompare(y.value))
        // eslint-disable-next-line react-hooks/exhaustive-deps
        , [propsData.tracks, trackKeys]);

    const renderTitle = useCallback((data: string) => {
        return <span className="session-title">{data}</span>;
    }, []);

    const renderTitleEditor = useCallback((key: string, data?: string) => {
        return <input
            className="session-title"
            type="text"
            value={data ?? ""}
            placeholder="Enter a title"
            autoFocus={true}
            onChange={(ev) => {
                ev.stopPropagation();
                const newTitle = ev.target.value;
                if (key === NewItemKey) {
                    setNewItem(old => ({ ...old, title: newTitle }));
                }
                else {
                    const item = propsData.sessions[key];
                    if (item) {
                        item.title = newTitle;
                        propsUpdateSession(item.id, item);
                    }
                    else {
                        addError("Could not update session title: Session not found.");
                    }
                }
            }}
        />;
    }, [propsData.sessions, propsUpdateSession]);

    const renderTrack = (data: string) => {
        return <span className="session-track">{data}</span>;
    };

    const renderTrackEditor = useCallback((key: string, data?: string) => {
        const updateItemTrack = (val: string) => {
            if (key === NewItemKey) {
                setNewItem(old => ({ ...old, track: val }));
            }
            else {
                const item = propsData.sessions[key];
                if (item) {
                    item.track = val;
                    propsUpdateSession(item.id, item);
                }
                else {
                    addError("Could not update session track: Session not found.");
                }
            }
        };
        return (
            <CreatableSelect
                className="session-track"
                isMulti={false}
                placeholder="Select or type a name..."
                onChange={(val) => {
                    updateItemTrack(val.value);
                }}
                onCreateOption={(name) => {
                    const newTrackKey = propsCreateTrack(name);
                    updateItemTrack(newTrackKey);
                }}
                options={trackOptions}
                value={data && { label: data, value: data } as any}
            />
        );
    }, [propsCreateTrack, propsData.sessions, propsUpdateSession, trackOptions]);

    const renderSingleEditor = useCallback((key: string) => {
        const isNew = key === NewItemKey;
        const session = isNew ? newItem : propsData.sessions[key];
        assert(session);

        const feedSources = [];
        let zoomURL: string | undefined;
        let youtubeID: string | undefined;
        if (session.feed) {
            const feedId = session.feed;
            const feed = propsData.feeds[feedId];
            if (feed) {
                if (feed.textChat) {
                    feedSources.push({ label: "Text chat", value: "chat" });
                }
                if (feed.videoRoom) {
                    feedSources.push({ label: "Video room", value: "video-chat" });
                }
                if (feed.zoomRoom !== undefined) {
                    feedSources.push({ label: "Zoom", value: "zoom" });
                    zoomURL = feed.zoomRoom;
                }
                if (feed.youtube !== undefined) {
                    feedSources.push({ label: "YouTube", value: "youtube" });
                    youtubeID = feed.youtube;
                }
            }
        }

        if (session) {
            return (
                <>
                    <h3>{isNew ? "New:" : "Edit:"} {session.title ?? "<No title>"}</h3>
                    <div className="session-chair">
                        <label>Chair</label><br />
                        <input
                            type="text"
                            placeholder="Enter a name or leave blank"
                            onChange={(ev) => {
                                const value = ev.target.value;
                                if (isNew) {
                                    setNewItem(old => ({ ...old, chair: value }));
                                }
                                else {
                                    const _item = propsData.sessions[key];
                                    assert(_item);
                                    propsUpdateSession(key, { ..._item, chair: value });
                                }
                            }}
                            value={session.chair ?? ""}
                        />
                    </div>
                    <div className="session-feed">
                        <h4>Content Feed</h4>
                        <label>Sources</label><br />
                        <Select
                            isMulti
                            options={[
                                { label: "Text chat", value: "chat" },
                                { label: "Video room", value: "video-chat" },
                                { label: "Zoom", value: "zoom" },
                                { label: "YouTube", value: "youtube" }
                            ]}
                            value={feedSources}
                            onChange={(_values) => {
                                const values = ((_values ?? []) as ReadonlyArray<{
                                    label: string; value: string
                                }>).map(x => x.value);
                                assert(session.id);
                                propsUpdateSessionFeeds([session.id], (sessionId, oldFeed) => {
                                    assert(sessionId === session.id);
                                    assert(session.id);
                                    assert(session.title !== undefined);
                                    return {
                                        id: session.id,
                                        name: session.title,
                                        textChat: values.includes("chat") || values.includes("video-chat"),
                                        videoRoom: values.includes("video-chat"),
                                        zoomRoom: values.includes("zoom") ? oldFeed?.zoomRoom ?? "" : undefined,
                                        youtube: values.includes("youtube") ? oldFeed?.youtube ?? "" : undefined
                                    };
                                });
                            }}
                        />
                        {feedSources.map(source => {
                            if (source.value === "zoom") {
                                return (
                                    <div className="session-zoom" key="session-zoom">
                                        <label>Zoom URL</label><br />
                                        <input
                                            type="url"
                                            placeholder="Enter a Zoom invite link"
                                            value={zoomURL ?? ""}
                                            onChange={(ev) => {
                                                const newURL = ev.target.value;
                                                assert(session.id);
                                                propsUpdateSessionFeeds([session.id], (sessionId, oldFeed) => {
                                                    assert(sessionId === session.id);
                                                    assert(session.id);
                                                    assert(session.title !== undefined);
                                                    if (oldFeed) {
                                                        return {
                                                            ...oldFeed,
                                                            id: session.id,
                                                            name: session.title,
                                                            zoomRoom: newURL
                                                        };
                                                    }
                                                    else {
                                                        return {
                                                            id: session.id,
                                                            name: session.title,
                                                            zoomRoom: newURL
                                                        };
                                                    }
                                                });
                                            }}
                                        />
                                    </div>
                                );
                            }
                            else if (source.value === "youtube") {
                                return (
                                    <div className="session-youtube" key="session-youtube">
                                        <label>Youtube Video ID</label><br />
                                        <input
                                            type="text"
                                            placeholder="Enter a YouTube video ID only (not a url!)"
                                            value={youtubeID ?? ""}
                                            onChange={(ev) => {
                                                const newVideoID = ev.target.value;
                                                assert(session.id);
                                                propsUpdateSessionFeeds([session.id], (sessionId, oldFeed) => {
                                                    assert(sessionId === session.id);
                                                    assert(session.id);
                                                    assert(session.title !== undefined);
                                                    if (oldFeed) {
                                                        return {
                                                            ...oldFeed,
                                                            id: session.id,
                                                            name: session.title,
                                                            youtube: newVideoID
                                                        };
                                                    }
                                                    else {
                                                        return {
                                                            id: session.id,
                                                            name: session.title,
                                                            youtube: newVideoID
                                                        };
                                                    }
                                                });
                                            }}
                                        />
                                    </div>
                                );
                            }
                            return undefined;
                        })
                        }
                    </div>
                </>
            );
        }
        return <>Error: Unknown item</>;
    }, [newItem, propsData.feeds, propsData.sessions, propsUpdateSession, propsUpdateSessionFeeds]);

    const renderMultiEditor = useCallback((keys: string[]) => {
        const selectedSessions = removeUndefined(keys.map(key => propsData.sessions[key]));

        let textChat: boolean | undefined;
        let videoRoom: boolean | undefined;
        let zoomURL: string | false | undefined;
        let youtubeID: string | false | undefined;
        let allMatch = ["chat", "video-chat", "zoom", "youtube"];
        for (const session of selectedSessions) {
            if (session.feed) {
                const feedId = session.feed;
                const feed = propsData.feeds[feedId];
                if (feed) {
                    if (feed.textChat) {
                        if (textChat === false) {
                            allMatch = allMatch.filter(x => x !== "chat");
                        }
                        else {
                            textChat = true;
                        }
                    }
                    else {
                        if (textChat === true) {
                            allMatch = allMatch.filter(x => x !== "chat");
                        }
                        else {
                            textChat = false;
                        }
                    }

                    if (feed.videoRoom) {
                        if (videoRoom === false) {
                            allMatch = allMatch.filter(x => x !== "video-chat");
                        }
                        else {
                            videoRoom = true;
                        }
                    }
                    else {
                        if (videoRoom === true) {
                            allMatch = allMatch.filter(x => x !== "video-chat");
                        }
                        else {
                            videoRoom = false;
                        }
                    }

                    if (feed.zoomRoom !== undefined) {
                        if (zoomURL === undefined) {
                            zoomURL = feed.zoomRoom;
                        }
                        else if (zoomURL !== feed.zoomRoom) {
                            allMatch = allMatch.filter(x => x !== "zoom");
                        }
                    }
                    else {
                        if (zoomURL !== false && zoomURL !== undefined) {
                            allMatch = allMatch.filter(x => x !== "zoom");
                        }
                        else {
                            zoomURL = false;
                        }
                    }

                    if (feed.youtube !== undefined) {
                        if (youtubeID === undefined) {
                            youtubeID = feed.youtube;
                        }
                        else if (youtubeID !== feed.youtube) {
                            allMatch = allMatch.filter(x => x !== "youtube");
                        }
                    }
                    else {
                        if (youtubeID !== false && youtubeID !== undefined) {
                            allMatch = allMatch.filter(x => x !== "youtube");
                        }
                        else {
                            youtubeID = false;
                        }
                    }
                }
            }

            if (allMatch.length === 0) {
                break;
            }
        }

        const feedSources = [];
        if (allMatch.includes("chat") && textChat) {
            feedSources.push({ label: "Text chat", value: "chat" });
        }
        if (allMatch.includes("video-chat") && videoRoom) {
            feedSources.push({ label: "Video room", value: "video-chat" });
        }
        if (allMatch.includes("zoom") && zoomURL !== undefined && zoomURL !== false) {
            feedSources.push({ label: "Zoom", value: "zoom" });
        }
        else if (zoomURL) {
            zoomURL = "";
        }
        if (allMatch.includes("youtube") && youtubeID !== undefined && youtubeID !== false) {
            feedSources.push({ label: "YouTube", value: "youtube" });
        }
        else if (youtubeID) {
            youtubeID = "";
        }

        return (
            <>
                <p>TODO: Set chair</p>
                <p>TODO: Set or create track</p>
                <div className="session-feed">
                    <h4>Content Feed</h4>
                    <label>Sources</label><br />
                    <Select
                        isMulti
                        options={[
                            { label: "Text chat", value: "chat" },
                            { label: "Video room", value: "video-chat" },
                            { label: "Zoom", value: "zoom" },
                            { label: "YouTube", value: "youtube" }
                        ]}
                        value={feedSources}
                        onChange={(_values) => {
                            const values = ((_values ?? []) as ReadonlyArray<{
                                label: string; value: string
                            }>).map(x => x.value);

                            propsUpdateSessionFeeds(selectedSessions.map(x => x.id), (sessionId, oldFeed) => {
                                const session = propsData.sessions[sessionId];
                                assert(session);
                                return {
                                    id: sessionId,
                                    name: session.title,
                                    textChat: values.includes("chat") || values.includes("video-chat"),
                                    videoRoom: values.includes("video-chat"),
                                    zoomRoom: values.includes("zoom") ? zoomURL ? zoomURL : oldFeed?.zoomRoom ?? "" : undefined,
                                    youtube: values.includes("youtube") ? youtubeID ? youtubeID : oldFeed?.youtube ?? "" : undefined
                                };
                            });
                        }}
                    />
                    {feedSources.map(source => {
                        if (source.value === "zoom") {
                            return (
                                <div className="session-zoom" key="session-zoom">
                                    <label>Zoom URL</label><br />
                                    <input
                                        type="url"
                                        placeholder="Enter a Zoom invite link"
                                        value={zoomURL ? zoomURL : ""}
                                        onChange={(ev) => {
                                            const newURL = ev.target.value;
                                            propsUpdateSessionFeeds(selectedSessions.map(x => x.id), (sessionId, oldFeed) => {
                                                const session = propsData.sessions[sessionId];
                                                assert(session);
                                                if (oldFeed) {
                                                    return {
                                                        ...oldFeed,
                                                        id: session.id,
                                                        name: session.title,
                                                        zoomRoom: newURL
                                                    };
                                                }
                                                else {
                                                    return {
                                                        id: session.id,
                                                        name: session.title,
                                                        zoomRoom: newURL
                                                    };
                                                }
                                            });
                                        }}
                                    />
                                </div>
                            );
                        }
                        else if (source.value === "youtube") {
                            return (
                                <div className="session-youtube" key="session-youtube">
                                    <label>Youtube Video ID</label><br />
                                    <input
                                        type="text"
                                        placeholder="Enter a YouTube video ID only (not a url!)"
                                        value={youtubeID ? youtubeID : ""}
                                        onChange={(ev) => {
                                            const newVideoID = ev.target.value;
                                            propsUpdateSessionFeeds(selectedSessions.map(x => x.id), (sessionId, oldFeed) => {
                                                const session = propsData.sessions[sessionId];
                                                assert(session);
                                                if (oldFeed) {
                                                    return {
                                                        ...oldFeed,
                                                        id: session.id,
                                                        name: session.title,
                                                        youtube: newVideoID
                                                    };
                                                }
                                                else {
                                                    return {
                                                        id: session.id,
                                                        name: session.title,
                                                        youtube: newVideoID
                                                    };
                                                }
                                            });
                                        }}
                                    />
                                </div>
                            );
                        }
                        return undefined;
                    })
                    }
                </div>
            </>
        );
    }, [propsData.feeds, propsData.sessions, propsUpdateSessionFeeds]);

    return (
        <>
            <p>TODO: Instructions</p>
            <p>TODO: CSV/JSON/XML import</p>
            <p>Note: Double click to select a single session. Use checkboxes to select multiple.</p>
            <Editor
                data={propsData.sessions}
                sort={(x, y) => {
                    if (x && y) {
                        return x.title.localeCompare(y.title) as -1 | 0 | 1;
                    }
                    else if (!x) {
                        return 1;
                    }
                    else if (!y) {
                        return -1;
                    }
                    else {
                        return 0;
                    }
                }}
                fields={{
                    title: {
                        name: "Title",
                        order: 0,
                        render: renderTitle,
                        renderEditor: renderTitleEditor,
                        filter: {
                            value: titleFilter,
                            render: () => {
                                return <input
                                    placeholder="Filter..."
                                    value={titleFilter}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        const vP = v.toLowerCase();
                                        setTitleFilter(v);
                                        setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                            return !!propsData.sessions[key]?.title.toLowerCase().includes(vP);
                                        }));
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                return value.length === 0 || data.toLowerCase().includes(value.toLowerCase());
                            }
                        }
                    },
                    track: {
                        name: "Track",
                        order: 1,
                        render: renderTrack,
                        renderEditor: renderTrackEditor,
                        filter: {
                            value: trackFilter,
                            render: () => {
                                return <Select
                                    isMulti
                                    placeholder="Filter..."
                                    options={trackOptions}
                                    value={trackFilter}
                                    onChange={(ev) => {
                                        const evCast = (ev ?? []) as ReadonlyArray<{ label: string; value: string }>;
                                        setTrackFilter(evCast);
                                        const values = evCast.map(v => v.value);
                                        setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                            const t = propsData.sessions[key]?.track;
                                            if (t) {
                                                return values.length === 0 || values.includes(t);
                                            }
                                            return values.length === 0;
                                        }));
                                    }}
                                />;
                            },
                            apply: (values, data) => {
                                return values.length === 0 || values.map(x => x.value).includes(data);
                            }
                        }
                    }
                }}
                selectedKeys={selectedKeys}
                toggleSelection={(key) => {
                    setSelectedKeys(old => old.includes(key) ? old.filter(x => x !== key) : [...old, key]);
                }}
                select={(keys) => {
                    setSelectedKeys(keys);
                }}
                renderSingleEditor={renderSingleEditor}
                renderMultiEditor={renderMultiEditor}
                addRow={{
                    beingAdded: newItem,
                    incomplete:
                        newItem?.title && newItem.title.length >= 5
                            ? newItem?.track && newItem.track.length > 0
                                ? newItem?.feed
                                    ? undefined
                                    : "Feed required."
                                : "Track required."
                            : "Title required, min. length of 5.",
                    begin: () => {
                        const newId = uuidv4();
                        setNewItem({
                            id: newId,
                            title: "",
                            feed: newId
                        });
                    },
                    cancel: () => {
                        if (newItem) {
                            assert(newItem.feed);
                            props.deleteFeed(newItem.feed);
                            setNewItem(undefined);
                        }
                    },
                    complete: () => {
                        if (newItem) {
                            if (!newItem.id) {
                                newItem.id = uuidv4();
                            }
                            if (newItem.chair === "") {
                                delete newItem.chair;
                            }
                            assert(newItem.feed);

                            const newId = newItem.id;
                            assert(newId);

                            if (propsCreateSession(newItem as SessionSpec)) {
                                setNewItem(undefined);
                                setSelectedKeys(oldKeys => [...oldKeys, newId]);
                            }
                        }
                    }
                }}
                deleteRows={(keys) => {
                    propsDeleteSessions(keys);
                    setSelectedKeys(oldKeys => oldKeys.filter(x => !keys.includes(x)));
                }}
            />
        </>
    );
}
