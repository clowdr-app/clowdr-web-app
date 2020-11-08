import React, { useState, useCallback } from "react";
import { CompleteSpecs, PersonSpec } from "../../UploadFormatTypes";
import AdminEditor, { EditorProps } from "../Controls/Editor/Editor";
import "./AuthorsTab.scss";
import { NewItemKey } from "../Controls/Editor/EditorTable";
import { addError } from "../../../../../../classes/Notifications/Notifications";

const Editor = (props: EditorProps<PersonSpec | undefined, {
    name: string;
    affiliation: string;
    email: string;
}>) => AdminEditor(props);

interface Props {
    data: CompleteSpecs;

    createPerson: (spec: PersonSpec) => string;
    updatePerson: (oldId: string, item: PersonSpec) => boolean;
    deletePersons: (keys: string[]) => void;
}

export function generatePersonId(spec: PersonSpec) {
    return spec.name + "¦" + spec.affiliation;
}

export default function AuthorsTab(props: Props) {
    const [newItem, setNewItem] = useState<Partial<PersonSpec>>();
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [nameFilter, setNameFilter] = useState<string>("");
    const [affiliationFilter, setAffiliationFilter] = useState<string>("");
    const [emailFilter, setEmailFilter] = useState<string>("");
    const propsData = props.data;
    const propsCreatePerson = props.createPerson;
    const propsUpdatePerson = props.updatePerson;
    const propsDeletePersons = props.deletePersons;

    const renderName = useCallback((data: string) => {
        return <span className="person-name">{data}</span>;
    }, []);

    const renderNameEditor = useCallback((key: string, data?: string) => {
        return <input
            className="person-name"
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
                    const item = propsData.persons[key];
                    if (item) {
                        const oldId = generatePersonId(item);
                        item.name = newValue;
                        propsUpdatePerson(oldId, item);
                    }
                    else {
                        addError("Could not update person name: Person not found.");
                    }
                }
            }}
        />;
    }, [propsData.persons, propsUpdatePerson]);

    const renderAffiliation = useCallback((data?: string) => {
        return <span className="person-affiliation">{data ?? "<Not provided>"}</span>;
    }, []);

    const renderAffiliationEditor = useCallback((key: string, data?: string) => {
        return <input
            className="person-affiliation"
            type="text"
            value={data ?? ""}
            placeholder="Enter a name"
            onChange={(ev) => {
                ev.stopPropagation();
                const newValue = ev.target.value;
                if (key === NewItemKey) {
                    setNewItem(old => ({ ...old, affiliation: newValue }));
                }
                else {
                    const item = propsData.persons[key];
                    if (item) {
                        const oldId = generatePersonId(item);
                        item.affiliation = newValue;
                        propsUpdatePerson(oldId, item);
                    }
                    else {
                        addError("Could not update person affiliation: Person not found.");
                    }
                }
            }}
        />;
    }, [propsData.persons, propsUpdatePerson]);

    const renderEmail = useCallback((data?: string) => {
        return <span className="person-email">{data ?? "<Not provided>"}</span>;
    }, []);

    const renderEmailEditor = useCallback((key: string, data?: string) => {
        return <input
            className="person-email"
            type="email"
            value={data ?? ""}
            placeholder="Enter an email address"
            onChange={(ev) => {
                ev.stopPropagation();
                const newValue = ev.target.value;
                if (key === NewItemKey) {
                    setNewItem(old => ({ ...old, email: newValue }));
                }
                else {
                    const item = propsData.persons[key];
                    if (item) {
                        item.email = newValue;
                        propsUpdatePerson(generatePersonId(item), item);
                    }
                    else {
                        addError("Could not update person email: Person not found.");
                    }
                }
            }}
        />;
    }, [propsData.persons, propsUpdatePerson]);

    return (
        <>
            <p>TODO: Instructions</p>
            <p>TODO: CSV/JSON/XML import</p>
            <p>Note: Double click to select a single item. Use checkboxes to select multiple.</p>
            <Editor
                data={propsData.persons}
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
                                            return !propsData.persons[key] || !!propsData.persons[key]?.name.toLowerCase().includes(vP);
                                        }));
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                return value.length === 0 || data.toLowerCase().includes(value.toLowerCase());
                            }
                        }
                    },
                    affiliation: {
                        name: "Affiliation",
                        order: 1,
                        render: renderAffiliation,
                        renderEditor: renderAffiliationEditor,
                        filter: {
                            value: affiliationFilter,
                            render: () => {
                                return <input
                                    placeholder="Filter..."
                                    value={affiliationFilter}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        const vP = v.toLowerCase();
                                        setAffiliationFilter(v);
                                        setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                            return !!propsData.persons[key]?.affiliation?.toLowerCase().includes(vP);
                                        }));
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                return value.length === 0 || !!data?.toLowerCase().includes(value.toLowerCase());
                            }
                        }
                    },
                    email: {
                        name: "Email",
                        order: 2,
                        render: renderEmail,
                        renderEditor: renderEmailEditor,
                        filter: {
                            value: emailFilter,
                            render: () => {
                                return <input
                                    placeholder="Filter..."
                                    value={emailFilter}
                                    onChange={(ev) => {
                                        const v = ev.target.value;
                                        const vP = v.toLowerCase();
                                        setEmailFilter(v);
                                        setSelectedKeys(oldKeys => oldKeys.filter(key => {
                                            return !!propsData.persons[key]?.email?.toLowerCase().includes(vP);
                                        }));
                                    }}
                                />;
                            },
                            apply: (value, data) => {
                                return value.length === 0 || !!data?.toLowerCase().includes(value.toLowerCase());
                            }
                        }
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
                            ? undefined
                            : "Name required, min. length of 5.",
                    begin: () => {
                        setNewItem({});
                    },
                    cancel: () => {
                        setNewItem(undefined);
                    },
                    complete: () => {
                        if (newItem) {
                            if (newItem.affiliation === "") {
                                delete newItem.affiliation;
                            }
                            if (newItem.email === "") {
                                delete newItem.email;
                            }

                            if (propsCreatePerson(newItem as PersonSpec)) {
                                setNewItem(undefined);
                                setSelectedKeys(oldKeys => [...oldKeys, generatePersonId(newItem as PersonSpec)]);
                            }
                        }
                    }
                }}
                deleteRows={(keys) => {
                    propsDeletePersons(keys);
                    setSelectedKeys(oldKeys => oldKeys.filter(x => !keys.includes(x)));
                }}
            />
        </>
    );
}
