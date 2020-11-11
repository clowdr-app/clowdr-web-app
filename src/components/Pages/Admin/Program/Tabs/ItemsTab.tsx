import React, { useState, useCallback, useMemo } from "react";
import { CompleteSpecs, ItemSpec } from "../UploadFormatTypes";
import AdminEditor, { EditorProps } from "../../Controls/Editor/Editor";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import "./ItemsTab.scss";
import { NewItemKey } from "../../Controls/Editor/EditorTable";
import { addError } from "../../../../../classes/Notifications/Notifications";
import Toggle from "react-toggle";
import assert from "assert";
import { removeUndefined } from "@clowdr-app/clowdr-db-schema/build/Util";
import { v4 as uuidv4 } from "uuid";

const Editor = (props: EditorProps<ItemSpec | undefined, {
    title: string;
    track: ReadonlyArray<{
        label: string;
        value: string;
    }>
}>) => AdminEditor(props);

interface Props {
    data: CompleteSpecs;

    createItem: (item: ItemSpec) => boolean;
    createAuthor: (name: string, affiliation: string) => string;
    createTrack: (trackName: string) => string;

    updateItem: (oldId: string, item: ItemSpec) => boolean;
    updateItems: (ids: string[], update: (data: ItemSpec) => ItemSpec) => void;
    updateItemFeed: (itemId: string, mode: "video-chat" | "chat" | "none") => void;

    deleteItems: (keys: string[]) => void;
}

export default function ItemsTab(props: Props) {
    // TODO: Enforce title min length when editing an existing item

    const [newItem, setNewItem] = useState<Partial<ItemSpec>>();
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [titleFilter, setTitleFilter] = useState<string>("");
    const [trackFilter, setTrackFilter] = useState<ReadonlyArray<{ label: string; value: string }>>([]);
    const propsData = props.data;
    const propsAddItem = props.createItem;
    const propsAddAuthor = props.createAuthor;
    const propsUpdateItem = props.updateItem;
    const propsUpdateItems = props.updateItems;
    const propsUpdateItemFeed = props.updateItemFeed;
    const propsCreateTrack = props.createTrack;

    const personsKeys = Object.keys(propsData.persons);
    const generatePersonOption = useCallback((key: string) => {
        const person = propsData.persons[key];
        return {
            label: person?.name + " (" + person?.affiliation + ")",
            value: key
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [propsData.persons, personsKeys]);
    const personOptions = useMemo(() => {
        const keys = Object.keys(propsData.persons);
        return keys
            .map(key => generatePersonOption(key))
            .sort((x, y) => x.label.localeCompare(y.label));
    }, [generatePersonOption, propsData.persons]);

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
        return <span className="item-title">{data}</span>;
    }, []);

    const renderTitleEditor = useCallback((key: string, data?: string) => {
        return <input
            className="item-title"
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
                    const item = propsData.items[key];
                    if (item) {
                        item.title = newTitle;
                        propsUpdateItem(item.id, item);
                    }
                    else {
                        addError("Could not update item title: Item not found.");
                    }
                }
            }}
        />;
    }, [propsData.items, propsUpdateItem]);

    const renderTrack = (data: string) => {
        return <span className="item-track">{data}</span>;
    };

    const renderTrackEditor = useCallback((key: string, data?: string) => {
        const updateItemTrack = (val: string) => {
            if (key === NewItemKey) {
                setNewItem(old => ({ ...old, track: val }));
            }
            else {
                const item = propsData.items[key];
                if (item) {
                    item.track = val;
                    propsUpdateItem(item.id, item);
                }
                else {
                    addError("Could not update item track: Item not found.");
                }
            }
        };
        return (
            <CreatableSelect
                className="item-track"
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
    }, [propsCreateTrack, propsData.items, propsUpdateItem, trackOptions]);

    const renderExhibit = useCallback((data: boolean) => {
        return (
            <span className="item-exhibit">
                {data
                    ? <><i className="far fa-check-circle" />Yes</>
                    : <><i className="far fa-times-circle" />No</>
                }
            </span>
        );
    }, []);

    const renderExhibitEditor = useCallback((key: string, data?: boolean) => {
        return (
            <Toggle
                checked={!!data}
                onChange={(ev) => {
                    const val = ev.target.checked;
                    if (key === NewItemKey) {
                        setNewItem(old => ({ ...old, exhibit: val }));
                    }
                    else {
                        const item = propsData.items[key];
                        if (item) {
                            item.exhibit = val;
                            propsUpdateItem(item.id, item);
                        }
                        else {
                            addError("Could not update item exhibit state: Item not found.");
                        }
                    }
                }}
            />
        );
    }, [propsData.items, propsUpdateItem]);

    const renderFeed = useCallback((data?: string) => {
        if (data) {
            const feed = propsData.feeds[data];
            if (feed) {
                if (feed.videoRoom) {
                    return <>Video &amp; chat</>;
                }
                else if ("textChat" in feed) {
                    return <>Chat only</>;
                }
            }
        }

        return <>Neither</>;
    }, [propsData.feeds]);

    const renderFeedEditor = useCallback((key: string, data?: string) => {
        let val: string;
        if (key === NewItemKey) {
            val = data ?? "none";
        }
        else {
            const feed = data ? propsData.feeds[data] : undefined;
            val = feed
                ? (feed.videoRoom ? "video-chat"
                    : feed.textChat ? "chat"
                        : "none")
                : "none";
        }

        return (
            <Select
                className="item-video-chat"
                options={[
                    { label: "Video & chat", value: "video-chat" },
                    { label: "Chat only", value: "chat" },
                    { label: "Neither", value: "none" }
                ]}
                value={{
                    label: val === "none" ? "Neither" : val === "chat" ? "Chat only" : "Video & chat",
                    value: val
                }}
                onChange={(ev: any) => {
                    const v = ev.value;
                    if (key === NewItemKey) {
                        setNewItem(old => ({ ...old, feed: v }));
                    }
                    else {
                        propsUpdateItemFeed(key, v);
                    }
                }}
            />
        );
    }, [propsData.feeds, propsUpdateItemFeed]);

    const renderSingleEditor = useCallback((key: string) => {
        const isNew = key === NewItemKey;
        const item = isNew ? newItem : propsData.items[key];
        if (item) {
            return (
                <>
                    <h3>{isNew ? "New:" : "Edit:"} {item.title ?? "<No title>"}</h3>
                    <div className="item-abstract">
                        <label>Abstract</label><br />
                        {/* TODO: Use Markdown editor */}
                        <textarea
                            placeholder="Type the item's abstract. You may use Markdown syntax to add formatting, links and to embded images."
                            onChange={(ev) => {
                                const value = ev.target.value;
                                if (isNew) {
                                    setNewItem(old => ({ ...old, abstract: value }));
                                }
                                else {
                                    const _item = propsData.items[key];
                                    assert(_item);
                                    propsUpdateItem(key, { ..._item, abstract: value });
                                }
                            }}
                            value={item.abstract ?? ""}
                        >
                        </textarea>
                    </div>
                    <div className="item-authors">
                        <label>Authors</label><br />
                        <p>Authors will be displayed in the order they are chosen.</p>
                        <CreatableSelect
                            isMulti={true}
                            options={personOptions}
                            placeholder={"Select an author or create one as: \"Name (Affiliation)\""}
                            onChange={(ev) => {
                                const values = ((ev ?? []) as ReadonlyArray<{ value: string }>).map(v => v.value);
                                if (isNew) {
                                    setNewItem(old => ({ ...old, authors: values }));
                                }
                                else {
                                    const _item = propsData.items[key];
                                    assert(_item);
                                    propsUpdateItem(key, { ..._item, authors: values });
                                }
                            }}
                            isValidNewOption={(input, selected, options) => {
                                const v = input.trim();
                                const parts = v.split("(");
                                if (parts.length > 0 && v.endsWith(")")) {
                                    const name = parts[0].trim();
                                    const affiliation = parts[1].substr(0, parts[1].length - 1);
                                    return name.length > 3 && affiliation.length > 3;
                                }
                                return false;
                            }}
                            onCreateOption={(_v) => {
                                const v = _v.trim();
                                const parts = v.split("(");
                                if (parts.length > 0 && v.endsWith(")")) {
                                    const name = parts[0].trim();
                                    const affiliation = parts[1].substr(0, parts[1].length - 1);
                                    const newAuthorId = propsAddAuthor(name, affiliation);
                                    if (isNew) {
                                        setNewItem(old => ({ ...old, authors: [...(item.authors ?? []), newAuthorId] }));
                                    }
                                    else {
                                        const _item = propsData.items[key];
                                        assert(_item);
                                        propsUpdateItem(key, { ..._item, authors: [...(item.authors ?? []), newAuthorId] });
                                    }
                                }
                            }}
                            value={item.authors?.map(author => generatePersonOption(author))}
                        />
                    </div>
                </>
            );
        }
        return <>Error: Unknown item</>;
    }, [generatePersonOption, newItem, personOptions, propsAddAuthor, propsData.items, propsUpdateItem]);

    const renderMultiEditor = useCallback((keys: string[]) => {
        const selectedItems = removeUndefined(keys.map(key => propsData.items[key]));
        const allExhibited = selectedItems.every(item => item.exhibit);
        return (
            <>
                <div>
                    <label>Exhibit?</label><br />
                    <Toggle
                        checked={allExhibited}
                        onChange={(ev) => {
                            const val = ev.target.checked;
                            if (val) {
                                propsUpdateItems(keys, (item) => ({
                                    ...item,
                                    exhibit: true
                                }));
                            }
                            else {
                                propsUpdateItems(keys, (item) => ({
                                    ...item,
                                    exhibit: false
                                }));
                            }
                        }}
                    />
                </div>
                <p>TODO: Set or create track</p>
                <p>TODO: Set video/chat mode</p>
            </>
        );
    }, [propsData.items, propsUpdateItems]);

    return (
        <>
            <p>TODO: Instructions</p>
            <p>TODO: CSV/JSON/XML import</p>
            <p>Note: Double click to select a single item. Use checkboxes to select multiple.</p>
            <Editor
                data={propsData.items}
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
                                            return !!propsData.items[key]?.title.toLowerCase().includes(vP);
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
                                            const t = propsData.items[key]?.track;
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
                    },
                    exhibit: {
                        name: "Exhibit",
                        order: 2,
                        render: renderExhibit,
                        renderEditor: renderExhibitEditor
                    },
                    feed: {
                        name: "Video/chat",
                        order: 3,
                        render: renderFeed,
                        renderEditor: renderFeedEditor
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
                                ? newItem?.abstract && newItem.abstract.length > 0
                                    ? undefined
                                    : "Abstract required, min. length of 1."
                                : "Track required."
                            : "Title required, min. length of 5.",
                    begin: () => {
                        setNewItem({
                            feed: "video-chat"
                        });
                    },
                    cancel: () => {
                        setNewItem(undefined);
                    },
                    complete: () => {
                        if (newItem) {
                            if (!newItem.id) {
                                newItem.id = uuidv4();
                            }
                            if (newItem.exhibit === undefined) {
                                newItem.exhibit = false;
                            }
                            if (newItem.feed) {
                                if (newItem.feed === "none") {
                                    delete newItem.feed;
                                }
                            }
                            if (!newItem.authors) {
                                newItem.authors = [];
                            }

                            const newId = newItem.id;
                            assert(newId);

                            if (propsAddItem(newItem as ItemSpec)) {
                                setNewItem(undefined);
                                setSelectedKeys(oldKeys => [...oldKeys, newId]);
                            }
                        }
                    }
                }}
                deleteRows={(keys) => {
                    props.deleteItems(keys);
                    setSelectedKeys(oldKeys => oldKeys.filter(x => !keys.includes(x)));
                }}
            />
        </>
    );
}
