import React, { useState, useCallback, useMemo } from "react";
import { CompleteSpecs, EventSpec } from "../UploadFormatTypes";
import AdminEditor, { EditorProps } from "../../Controls/Editor/Editor";
import Select from 'react-select';
import "./EventsTab.scss";
import { NewItemKey } from "../../Controls/Editor/EditorTable";
import { addError } from "../../../../../classes/Notifications/Notifications";
import assert from "assert";
import { removeUndefined } from "@clowdr-app/clowdr-db-schema/build/Util";
import { v4 as uuidv4 } from "uuid";

const Editor = (props: EditorProps<EventSpec | undefined, {
    item: string;
    session: string;
    startTime: Date | undefined;
    endTime: Date | undefined;
}>) => AdminEditor(props);

interface Props {
    data: CompleteSpecs;

    createEvent: (data: EventSpec) => boolean;
    updateEvent: (oldId: string, data: EventSpec) => boolean;
    updateEvents: (ids: string[], update: (data: EventSpec) => EventSpec) => void;
    deleteEvents: (keys: string[]) => void;
}

export default function EventsTab(props: Props) {
    const [newItem, setNewItem] = useState<Partial<EventSpec>>();
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [itemTitleFilter, setItemTitleFilter] = useState<string>("");
    const [sessionTitleFilter, setSessionTitleFilter] = useState<string>("");
    const [startTimeFilter, setStartTimeFilter] = useState<Date>();
    const [endTimeFilter, setEndTimeFilter] = useState<Date>();
    const propsData = props.data;
    const propsCreateEvent = props.createEvent;
    const propsUpdateEvent = props.updateEvent;
    const propsUpdateEvents = props.updateEvents;
    const propsDeleteEvents = props.deleteEvents;

    const itemKeys = Object.keys(propsData.items);
    const itemOptions = useMemo(() => Object
        .keys(propsData.items)
        .map(itemKey => ({
            label: propsData.items[itemKey]?.title,
            value: itemKey
        }))
        .sort((x, y) => (x.label && y.label && x.label.localeCompare(y.label)) || 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
        , [propsData.items, itemKeys]);

    const sessionKeys = Object.keys(propsData.sessions);
    const sessionOptions = useMemo(() => Object
        .keys(propsData.sessions)
        .map(sessionKey => ({
            label: propsData.sessions[sessionKey]?.title,
            value: sessionKey
        }))
        .sort((x, y) => (x.label && y.label && x.label.localeCompare(y.label)) || 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
        , [propsData.sessions, sessionKeys]);

    const renderItem = (data: string) => {
        const item = propsData.items[data];
        return <span className="event-item">{item?.title ?? "<No item>"}</span>;
    };

    const renderItemEditor = useCallback((key: string, data?: string) => {
        return (
            <Select
                className="event-item"
                isMulti={false}
                placeholder="Select or type a name..."
                onChange={(_val) => {
                    const val = _val.value;
                    if (key === NewItemKey) {
                        setNewItem(old => ({ ...old, item: val }));
                    }
                    else {
                        const item = propsData.events[key];
                        if (item) {
                            item.item = val;
                            propsUpdateEvent(item.id, item);
                        }
                        else {
                            addError("Could not update event item: Event not found.");
                        }
                    }
                }}
                options={itemOptions}
                value={data && { label: propsData.items[data]?.title, value: data } as any}
            />
        );
    }, [itemOptions, propsData.items, propsData.events, propsUpdateEvent]);

    const renderSession = (data: string) => {
        const session = propsData.sessions[data];
        return <span className="event-session">{session?.title ?? "<No session>"}</span>;
    };

    const renderSessionEditor = useCallback((key: string, data?: string) => {
        return (
            <Select
                className="event-session"
                isMulti={false}
                placeholder="Select or type a name..."
                onChange={(_val) => {
                    const val = _val.value;
                    if (key === NewItemKey) {
                        setNewItem(old => ({ ...old, session: val }));
                    }
                    else {
                        const session = propsData.events[key];
                        if (session) {
                            session.session = val;
                            propsUpdateEvent(session.id, session);
                        }
                        else {
                            addError("Could not update event session: Event not found.");
                        }
                    }
                }}
                options={sessionOptions}
                value={data && { label: propsData.sessions[data]?.title, value: data } as any}
            />
        );
    }, [propsData.events, propsData.sessions, propsUpdateEvent, sessionOptions]);

    const renderTime = (data: Date) => {
        return <span className="event-time">{data.toUTCString()} (UTC)</span>;
    };

    const renderStartTimeEditor = useCallback((key: string, data?: Date) => {
        const isNew = key === NewItemKey;
        const date = data ?? new Date();
        const dateTimeStr
            = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1).toString().padStart(2, "0") + "-" + date.getUTCDate().toString().padStart(2, "0")
            + "T" + date.getUTCHours().toString().padStart(2, "0") + ":" + date.getUTCMinutes().toString().padStart(2, "0");
        return <input
            type="datetime-local"
            value={dateTimeStr}
            onChange={(ev) => {
                const value = new Date(ev.target.value);
                if (isNew) {
                    setNewItem(old => ({ ...old, startTime: value }));
                }
                else {
                    const _item = propsData.events[key];
                    assert(_item);
                    propsUpdateEvent(key, { ..._item, startTime: value });
                }
            }}
        />;
    }, [propsData.events, propsUpdateEvent]);

    const renderEndTimeEditor = useCallback((key: string, data?: Date) => {
        const isNew = key === NewItemKey;
        const date = data ?? new Date();
        const dateTimeStr
            = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1).toString().padStart(2, "0") + "-" + date.getUTCDate().toString().padStart(2, "0")
            + "T" + date.getUTCHours().toString().padStart(2, "0") + ":" + date.getUTCMinutes().toString().padStart(2, "0");
        return <input
            type="datetime-local"
            value={dateTimeStr}
            onChange={(ev) => {
                const value = new Date(ev.target.value);
                if (isNew) {
                    setNewItem(old => ({ ...old, endTime: value }));
                }
                else {
                    const _item = propsData.events[key];
                    assert(_item);
                    propsUpdateEvent(key, { ..._item, endTime: value });
                }
            }}
        />;
    }, [propsData.events, propsUpdateEvent]);

    const renderSingleEditor = useCallback((key: string) => {
        const isNew = key === NewItemKey;
        const event = isNew ? newItem : propsData.events[key];
        assert(event);

        if (event) {
            let item;
            if (event.item) {
                item = propsData.items[event.item];
            }

            return (
                <>
                    <h3>{isNew ? "New:" : "Edit:"} {item?.title ?? "<No item selected>"}</h3>
                    <div className="event-chair">
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
                                    const _item = propsData.events[key];
                                    assert(_item);
                                    propsUpdateEvent(key, { ..._item, chair: value });
                                }
                            }}
                            value={event.chair ?? ""}
                        />
                    </div>
                </>
            );
        }
        return <>Error: Unknown item</>;
    }, [newItem, propsData.events, propsData.items, propsUpdateEvent]);

    const renderMultiEditor = useCallback((keys: string[]) => {
        const selectedEvents = removeUndefined(keys.map(key => propsData.events[key]));
        let commonSessionKey;
        for (const event of selectedEvents) {
            if (event.session !== commonSessionKey) {
                if (commonSessionKey) {
                    commonSessionKey = undefined;
                    break;
                }
                else {
                    commonSessionKey = event.session;
                }
            }
        }

        return (
            <>
                <div className="event-session">
                    <label>Session</label><br />
                    <Select
                        options={sessionOptions}
                        value={commonSessionKey ? { value: commonSessionKey, label: propsData.sessions[commonSessionKey]?.title } : undefined}
                        onChange={(_value) => {
                            const value = (_value as { value: string }).value;
                            if (value) {
                                propsUpdateEvents(selectedKeys, (spec) => {
                                    return { ...spec, session: value };
                                });
                            }
                        }}
                    />
                </div>
            </>
        );
    }, [propsData.events, propsData.sessions, propsUpdateEvents, selectedKeys, sessionOptions]);

    return (
        <>
            <p>TODO: Instructions</p>
            <p>TODO: CSV/JSON/XML import</p>
            <p>Note: Double click to select a single event. Use checkboxes to select multiple.</p>
            <Editor
                data={propsData.events}
                sort={(x, y) => {
                    if (x && y) {
                        if (x.startTime < y.startTime) {
                            return -1;
                        }
                        else if (x.startTime === y.startTime) {
                            if (x.endTime < y.endTime) {
                                return -1;
                            }
                            else if (x.endTime === y.endTime) {
                                const xItem = propsData.items[x.item];
                                const yItem = propsData.items[y.item];
                                if (xItem && yItem) {
                                    return xItem.title.localeCompare(yItem.title) as -1 | 0 | 1;
                                }
                                return 0;
                            }
                            else {
                                return 1;
                            }
                        }
                        else {
                            return 1;
                        }
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
                    item: {
                        name: "Item",
                        order: 0,
                        render: renderItem,
                        renderEditor: renderItemEditor,
                        filter: {
                            value: itemTitleFilter,
                            render: () => {
                                return <input
                                    placeholder="Filter..."
                                    value={itemTitleFilter}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        const vP = v.toLowerCase();
                                        setItemTitleFilter(v);
                                        if (vP.length > 0) {
                                            setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                                const event = propsData.events[key];
                                                if (event) {
                                                    const item = propsData.items[event.item];
                                                    if (item) {
                                                        return !!item.title.toLowerCase().includes(vP);
                                                    }
                                                    else {
                                                        return false;
                                                    }
                                                }
                                                else {
                                                    return false;
                                                }
                                            }));
                                        }
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                const item = propsData.items[data];
                                return value.length === 0 || (!!item && item.title.toLowerCase().includes(value.toLowerCase()));
                            }
                        }
                    },
                    session: {
                        name: "Session",
                        order: 1,
                        render: renderSession,
                        renderEditor: renderSessionEditor,
                        filter: {
                            value: sessionTitleFilter,
                            render: () => {
                                return <input
                                    placeholder="Filter..."
                                    value={sessionTitleFilter}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        const vP = v.toLowerCase();
                                        setSessionTitleFilter(v);
                                        if (vP.length > 0) {
                                            setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                                const event = propsData.events[key];
                                                if (event) {
                                                    const session = propsData.sessions[event.session];
                                                    if (session) {
                                                        return !!session.title.toLowerCase().includes(vP);
                                                    }
                                                    else {
                                                        return false;
                                                    }
                                                }
                                                else {
                                                    return false;
                                                }
                                            }));
                                        }
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                const session = propsData.sessions[data];
                                return value.length === 0 || (!!session && session.title.toLowerCase().includes(value.toLowerCase()));
                            }
                        }
                    },
                    startTime: {
                        name: "Start (UTC)",
                        order: 2,
                        render: renderTime,
                        renderEditor: renderStartTimeEditor,
                        filter: {
                            value: startTimeFilter,
                            render: () => {
                                // TODO
                                return <></>;
                            },
                            apply: (value, data) => {
                                if (value) {
                                    return value < data;
                                }
                                else {
                                    return true;
                                }
                            }
                        }
                    },
                    endTime: {
                        name: "End (UTC)",
                        order: 3,
                        render: renderTime,
                        renderEditor: renderEndTimeEditor,
                        filter: {
                            value: endTimeFilter,
                            render: () => {
                                // TODO
                                return <></>;
                            },
                            apply: (value, data) => {
                                if (value) {
                                    return value < data;
                                }
                                else {
                                    return true;
                                }
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
                        newItem?.startTime
                            ? newItem?.endTime
                                ? newItem?.item && newItem.item.length > 0
                                    ? newItem?.session && newItem.session.length > 0
                                        ? undefined
                                        : "Session required."
                                    : "Item required."
                                : "End time required."
                            : "Start time required.",
                    begin: () => {
                        const newId = uuidv4();
                        setNewItem({
                            id: newId
                        });
                    },
                    cancel: () => {
                        if (newItem) {
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
                            if (newItem.directLink === "") {
                                delete newItem.directLink;
                            }

                            const newId = newItem.id;
                            assert(newId);

                            if (propsCreateEvent(newItem as EventSpec)) {
                                setNewItem(undefined);
                                setSelectedKeys(oldKeys => [...oldKeys, newId]);
                            }
                        }
                    }
                }}
                deleteRows={(keys) => {
                    propsDeleteEvents(keys);
                    setSelectedKeys(oldKeys => oldKeys.filter(x => !keys.includes(x)));
                }}
            />
        </>
    );
}
