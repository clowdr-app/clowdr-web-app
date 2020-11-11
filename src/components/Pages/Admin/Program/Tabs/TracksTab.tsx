import React, { useState, useCallback } from "react";
import { CompleteSpecs, TrackSpec } from "../UploadFormatTypes";
import AdminEditor, { EditorProps } from "../../Controls/Editor/Editor";
import { NewItemKey } from "../../Controls/Editor/EditorTable";
import { addError } from "../../../../../classes/Notifications/Notifications";
import { ChromePicker } from 'react-color';
import invertColour from 'invert-color';
import "./TracksTab.scss";

const Editor = (props: EditorProps<TrackSpec | undefined, {
    name: string;
    shortName: string;
}>) => AdminEditor(props);

interface Props {
    data: CompleteSpecs;

    createTrack: (spec: TrackSpec) => string;
    updateTrack: (oldId: string, item: TrackSpec) => boolean;
    deleteTracks: (keys: string[]) => void;
}

export function generateTrackId(spec: TrackSpec) {
    return spec.name.toLowerCase();
}

export default function AuthorsTab(props: Props) {
    const [newItem, setNewItem] = useState<Partial<TrackSpec>>();
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [nameFilter, setNameFilter] = useState<string>("");
    const [shortNameFilter, setShortNameFilter] = useState<string>("");
    const propsData = props.data;
    const propsCreateTrack = props.createTrack;
    const propsUpdateTrack = props.updateTrack;
    const propsDeleteTracks = props.deleteTracks;

    const renderName = useCallback((data: string) => {
        return <span className="track-name">{data}</span>;
    }, []);

    const renderNameEditor = useCallback((key: string, data?: string) => {
        return <input
            className="track-name"
            type="text"
            value={data ?? ""}
            placeholder="Enter a name"
            autoFocus={true}
            onChange={(ev) => {
                ev.stopPropagation();
                const newValue = ev.target.value;
                if (key === NewItemKey) {
                    setNewItem(old => ({ ...old, name: newValue }));
                }
                else {
                    const item = propsData.tracks[key];
                    if (item) {
                        const oldId = generateTrackId(item);
                        item.name = newValue;
                        propsUpdateTrack(oldId, item);
                        setSelectedKeys([generateTrackId(item)]);
                    }
                    else {
                        addError("Could not update track name: Track not found.");
                    }
                }
            }}
        />;
    }, [propsData.tracks, propsUpdateTrack]);

    const renderShortName = useCallback((data?: string) => {
        return <span className="track-shortname">{data ?? "<Not provided>"}</span>;
    }, []);

    const renderShortNameEditor = useCallback((key: string, data?: string) => {
        return <input
            className="track-shortname"
            type="text"
            value={data ?? ""}
            placeholder="Enter a name"
            onChange={(ev) => {
                ev.stopPropagation();
                const newValue = ev.target.value;
                if (key === NewItemKey) {
                    setNewItem(old => ({ ...old, shortName: newValue }));
                }
                else {
                    const item = propsData.tracks[key];
                    if (item) {
                        const oldId = generateTrackId(item);
                        item.shortName = newValue;
                        propsUpdateTrack(oldId, item);
                    }
                    else {
                        addError("Could not update track short name: Track not found.");
                    }
                }
            }}
        />;
    }, [propsData.tracks, propsUpdateTrack]);

    const renderColour = useCallback((data?: string) => {
        const colour = data ?? "#ffffff";
        return (
            <span
                className="track-colour"
                style={{
                    backgroundColor: colour,
                    color: invertColour(colour, true)
                }}>
                {data ?? "<Not provided>"}
            </span>
        );
    }, []);

    const renderColourEditor = useCallback((key: string, data?: string) => {
        return <ChromePicker
            color={data ?? ""}
            onChange={(colour) => {
                const newValue = colour.hex;
                if (key === NewItemKey) {
                    setNewItem(old => ({ ...old, colour: newValue }));
                }
                else {
                    const item = propsData.tracks[key];
                    if (item) {
                        item.colour = newValue;
                        propsUpdateTrack(generateTrackId(item), item);
                    }
                    else {
                        addError("Could not update track colour: Track not found.");
                    }
                }
            }}
            onChangeComplete={(colour) => {
                const newValue = colour.hex;
                if (key === NewItemKey) {
                    setNewItem(old => ({ ...old, colour: newValue }));
                }
                else {
                    const item = propsData.tracks[key];
                    if (item) {
                        item.colour = newValue;
                        propsUpdateTrack(generateTrackId(item), item);
                    }
                    else {
                        addError("Could not update track colour: Track not found.");
                    }
                }
            }}
        />;
    }, [propsData.tracks, propsUpdateTrack]);

    return (
        <>
            <p>TODO: Instructions</p>
            <p>TODO: CSV/JSON/XML import</p>
            <p>Note: Double click to select a single item. Use checkboxes to select multiple.</p>
            <Editor
                data={propsData.tracks}
                sort={(x, y) => {
                    if (x && y) {
                        return x.name.localeCompare(y.name) as -1 | 0 | 1;
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
                    name: {
                        name: "Name",
                        order: 0,
                        render: renderName,
                        renderEditor: renderNameEditor,
                        filter: {
                            value: nameFilter,
                            render: () => {
                                return <input
                                    placeholder="Filter..."
                                    value={nameFilter}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        const vP = v.toLowerCase();
                                        setNameFilter(v);
                                        setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                            return !propsData.tracks[key] || !!propsData.tracks[key]?.name.toLowerCase().includes(vP);
                                        }));
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                return value.length === 0 || data.toLowerCase().includes(value.toLowerCase());
                            }
                        }
                    },
                    shortName: {
                        name: "Short Name",
                        order: 1,
                        render: renderShortName,
                        renderEditor: renderShortNameEditor,
                        filter: {
                            value: shortNameFilter,
                            render: () => {
                                return <input
                                    placeholder="Filter..."
                                    value={shortNameFilter}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        const vP = v.toLowerCase();
                                        setShortNameFilter(v);
                                        setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                            return !!propsData.tracks[key]?.shortName?.toLowerCase().includes(vP);
                                        }));
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                return value.length === 0 || !!data?.toLowerCase().includes(value.toLowerCase());
                            }
                        }
                    },
                    colour: {
                        name: "Colour",
                        order: 2,
                        render: renderColour,
                        renderEditor: renderColourEditor,
                    },
                }}
                selectedKeys={selectedKeys}
                toggleSelection={(key) => {
                    setSelectedKeys(old => old.includes(key) ? old.filter(x => x !== key) : [...old, key]);
                }}
                select={(keys) => {
                    setSelectedKeys(keys);
                }}
                renderMultiEditor={() => {
                    return <></>;
                }}
                addRow={{
                    beingAdded: newItem,
                    incomplete:
                        newItem?.name && newItem.name.length >= 5
                            ? newItem?.shortName && newItem.shortName.length >= 5
                                ? newItem?.colour && newItem.shortName.length > 0
                                    ? undefined
                                    : "Colour required"
                                : "Short name required, min. length of 5."
                            : "Name required, min. length of 5.",
                    begin: () => {
                        setNewItem({});
                    },
                    cancel: () => {
                        setNewItem(undefined);
                    },
                    complete: () => {
                        if (newItem) {
                            if (propsCreateTrack(newItem as TrackSpec)) {
                                setNewItem(undefined);
                                setSelectedKeys(oldKeys => [...oldKeys, generateTrackId(newItem as TrackSpec)]);
                            }
                        }
                    }
                }}
                deleteRows={(keys) => {
                    propsDeleteTracks(keys);
                    setSelectedKeys(oldKeys => oldKeys.filter(x => !keys.includes(x)));
                }}
            />
        </>
    );
}
