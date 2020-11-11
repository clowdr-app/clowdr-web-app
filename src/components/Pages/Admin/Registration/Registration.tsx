import { Registration } from "@clowdr-app/clowdr-db-schema";
import { RoleNames } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Schema/_Role";
import { Tooltip } from "@material-ui/core";
import assert from "assert";
import Parse from "parse";
import React, { useCallback, useState } from "react";
import { addNotification, addError } from "../../../../classes/Notifications/Notifications";
import useConference from "../../../../hooks/useConference";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import Editor from "../Controls/Editor/Editor";
import "./Registration.scss";
import Select from "react-select";
import { CSVReader } from 'react-papaparse'

type RegistrationSpec = {
    name: string;
    email: string;
    affiliation: string;
    country: string;
    newRole: RoleNames;
};

interface SaveRegistrationEmailsData {
    conference: string;
    registrations: Array<RegistrationSpec>;
}

type SaveRegistrationEmailsResponse = Array<{ index: number; result: string | boolean }>;

interface SendRegistrationEmailsData {
    sendOnlyUnsent: boolean;
    conference: string;
}

interface SendRegistrationEmailsResponse {
    success: boolean;
    results: { success: boolean; to: string; reason?: string }[];
}

const allowedRoles: RoleNames[] = ["admin", "manager", "attendee"];
const NewItemKey = "<<¦¦new¦¦>>";

export default function AdminRegistration() {
    const conference = useConference();
    const [regs, setRegs] = useState<{ [K: string]: RegistrationSpec } | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [newRegistration, setNewRegistration] = useState<Partial<RegistrationSpec>>();
    const [changesToBeSaved, setChangesToBeSaved] = useState<boolean>(false);

    const [nameFilter, setNameFilter] = useState<string>("");
    const [emailFilter, setEmailFilter] = useState<string>("");
    const [affiliationFilter, setAffiliationFilter] = useState<string>("");
    const [countryFilter, setCountryFilter] = useState<string>("");
    const [rolesFilter, setRolesFilter] = useState<RoleNames[]>([]);

    const [isSaving, setIsSaving] = useState<boolean>(false);

    useSafeAsync(
        async () => {
            const regsArr = await Registration.getAll(conference.id);
            const result: { [K: string]: RegistrationSpec } = {};
            for (const reg of regsArr) {
                result[reg.email] = {
                    name: reg.name,
                    email: reg.email,
                    affiliation: reg.affiliation ?? "<Unknown>",
                    country: reg.country ?? "<Unknown>",
                    newRole: reg.newRole as RoleNames
                };
            }
            return result;
        },
        setRegs,
        [conference.id],
        "Admin/Registration:getAll"
    );

    const [isSending, setIsSending] = useState<boolean>(false);
    const [sentRepeats, setSentRepeats] = useState<boolean>(false);

    async function doSendRegistrationEmails(data: SendRegistrationEmailsData): Promise<SendRegistrationEmailsResponse> {
        setIsSending(true);
        setSentRepeats(!data.sendOnlyUnsent);
        const response = (await Parse.Cloud.run("registration-send-emails", data)) as SendRegistrationEmailsResponse;
        return response;
    }

    function sendRegistrationEmails(sendOnlyUnsent: boolean): void {
        doSendRegistrationEmails({ sendOnlyUnsent, conference: conference.id })
            .then(response => {
                if (response.success) {
                    addNotification(
                        `Sent ${response.results.length} registration ${response.results.length === 1 ? "email" : "emails"
                        }.`
                    );
                } else {
                    addError(
                        `Failed to send ${response.results.filter(result => !result.success).length} of ${response.results.length
                        } registration ${response.results.length === 1 ? "email" : "emails"}.`
                    );
                }
                setIsSending(false);
            })
            .catch(e => {
                console.error(e);
                addError("Error when attempting to send registration emails.");
                setIsSending(false);
            });
    }

    function renderSendInitialEmailsButton() {
        return isSending
            ? <></>
            : (
                <Tooltip title="Send the first registration email to any users that have not yet been sent one.">
                    <button disabled={isSending} onClick={() => sendRegistrationEmails(true)}>
                        Send initial registration emails
                    </button>
                </Tooltip>
            );
    }

    function renderSendRepeatEmailsButton() {
        return isSending
            ? <></>
            : sentRepeats
                ? (
                    <Tooltip title="You have already sent repeat emails. Pressing this button again will send the same people another copy of their registration email. If this is what you would like to do, please refresh the page.">
                        <button disabled={true}>
                            Send repeat registration emails
                        </button>
                    </Tooltip>
                )
                : (
                    <Tooltip title="Send a repeat registration email to all users that have not yet registered. Includes users that have not yet received any registration email.">
                        <button disabled={isSending} onClick={() => sendRegistrationEmails(false)}>
                            Send repeat registration emails
                        </button>
                    </Tooltip>
                );
    }

    const renderMultiEditor = useCallback((keys: string[]) => {
        return (
            <>
            </>
        );
    }, []);

    async function doSaveRegistrations(data: SaveRegistrationEmailsData): Promise<SaveRegistrationEmailsResponse> {
        setIsSaving(true);
        const response = (await Parse.Cloud.run("registration-save-many", data)) as SaveRegistrationEmailsResponse;
        return response;
    }

    return (
        <div className="admin-registrations admin-editor">
            <div className="email-buttons">
                {isSending ? <LoadingSpinner message="Sending emails" /> : <></>}
                {renderSendInitialEmailsButton()}
                {renderSendRepeatEmailsButton()}
            </div>
            <div className="save-changes-buttons">
                <AsyncButton
                    disabled={!changesToBeSaved || isSaving || !regs}
                    action={async () => {
                        setIsSaving(true);

                        if (regs) {
                            try {
                                const responses = await doSaveRegistrations({ conference: conference.id, registrations: Object.values(regs) });
                                const failedIdxs: number[] = [];
                                let successCount = 0;
                                for (const response of responses) {
                                    if (!response.result) {
                                        failedIdxs.push(response.index);
                                    } else {
                                        successCount++;
                                    }
                                }
                                if (successCount > 0) {
                                    addNotification(`Saved ${successCount} registrations.`);
                                }
                                if (failedIdxs.length > 0) {
                                    addError(`Failed to save ${failedIdxs.length} registrations.`);
                                }
                                else {
                                    if (successCount === 0) {
                                        addNotification("Saved.");
                                    }
                                    setChangesToBeSaved(false);
                                }
                            }
                            catch (e) {
                                addError("Error when attempting to save registrations.");
                            }
                        }

                        setIsSaving(false);
                    }}
                >
                    Save all changes
                </AsyncButton>
            </div>
            <div className="import">
                <label><h2>Import CSV</h2></label><br />
                <p>Import new registrations (overlapping email addresses will be ignored). Your CSV data should contain (at minimum) the Name and Email columns.</p>
                <p>The first line of your data should contain column names (/headings).</p>
                <CSVReader
                    onFileLoad={(data) => {
                        console.log("Parsed registration data", data);
                        if (data.length === 0) {
                            return;
                        }

                        let nameColumnIdx = -1;
                        let emailColumnIdx = -1;
                        let affiliationColumnIdx = -1;
                        let countryColumnIdx = -1;
                        let newRoleColumnIdx = -1;

                        const item0 = data[0];
                        if (item0.errors.length) {
                            addError("Headings row contains errors.");
                            return;
                        }

                        for (let colIdx = 0; colIdx < item0.data.length; colIdx++) {
                            const col = item0.data[colIdx].trim().toLowerCase();
                            switch (col) {
                                case "name":
                                    nameColumnIdx = colIdx;
                                    break;
                                case "email":
                                    emailColumnIdx = colIdx;
                                    break;
                                case "affiliation":
                                    affiliationColumnIdx = colIdx;
                                    break;
                                case "country":
                                    countryColumnIdx = colIdx;
                                    break;
                                case "newrole":
                                    newRoleColumnIdx = colIdx;
                                    break;
                                default:
                                    addError(`Column name not recognised ${col}`);
                                    return;
                            }
                        }

                        if (nameColumnIdx === -1) {
                            addError("Name column not found!");
                            return;
                        }

                        if (emailColumnIdx === -1) {
                            addError("Email column not found!");
                            return;
                        }

                        const rows = data.slice(1);
                        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                            const row = rows[rowIdx];
                            if (row.errors.length) {
                                addError(`Row contains errors - please fix row ${rowIdx} then try again.`);
                                return;
                            }
                        }

                        const newRegs: { [K: string]: RegistrationSpec } = {};
                        const existingEmails = new Set(Object.values(regs ?? {}).map(x => x.email));
                        const duplicateEmails = new Set<string>();
                        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                            const row = rows[rowIdx];
                            const cols = row.data as string[];
                            const name = cols[nameColumnIdx]?.trim();
                            const email = cols[emailColumnIdx]?.trim().toLowerCase();
                            const affiliation = affiliationColumnIdx !== -1 ? cols[affiliationColumnIdx] ?? "<Unknown>" : "<Unknown>";
                            const country = countryColumnIdx !== -1 ? cols[countryColumnIdx] ?? "<Unknown>" : "<Unknown>";
                            const newRole = newRoleColumnIdx !== -1 ? cols[newRoleColumnIdx] ?? "attendee" : "attendee";

                            if (!(allowedRoles as string[]).includes(newRole)) {
                                addError(`Invalid role "${newRole}" in row ${rowIdx}`);
                                return;
                            }

                            if ((email === "" || !email) && (name === "" || !name)) {
                                continue;
                            }
                            else if (email === "" || name === "" || !email || !name) {
                                addError(`Name and/or email cannot be blank in row ${rowIdx}`);
                                return;
                            }

                            if (existingEmails.has(email)) {
                                duplicateEmails.add(email);
                            }
                            else {
                                newRegs[email] = {
                                    name, email, affiliation, country, newRole: newRole as RoleNames
                                };
                            }
                        }

                        if (duplicateEmails.size > 0) {
                            // const duplicateEmailsList
                            //     = Array.from(duplicateEmails.values())
                            //         .reduce((acc, e) => `${acc}, ${e}`, "")
                            //         .substr(2);
                            addNotification(`Ignoring ${duplicateEmails.size} duplicate emails.`, undefined, 60000);
                        }

                        setRegs(oldRegs => ({
                            ...newRegs, ...oldRegs
                        }));
                        setChangesToBeSaved(true);
                    }}
                    onError={(err, file, inputElem, reason) => {
                        addError(err);
                    }}
                >
                    Select a file to import
                </CSVReader>
            </div>
            <h2>Edit Registrations</h2>
            <p>Email addresses cannot be changed after being added. To change an email address, delete the existing registration and create a new one with the corrected address.</p>
            <Editor
                data={regs ?? {}}
                sort={(x, y) => {
                    return x.name.localeCompare(y.name) as -1 | 0 | 1;
                }}
                fields={{
                    name: {
                        name: "Name",
                        order: 0,
                        render: (data) => <>{data}</>,
                        renderEditor: (key, data) => <input
                            type="text"
                            value={data ?? ""}
                            placeholder="Enter a name"
                            autoFocus={true}
                            onChange={(ev) => {
                                ev.stopPropagation();
                                const newValue = ev.target.value;
                                if (key === NewItemKey) {
                                    setNewRegistration(old => ({ ...old, name: newValue }));
                                }
                                else {
                                    assert(regs);
                                    const reg = regs[key];
                                    if (reg) {
                                        setChangesToBeSaved(changesToBeSaved || newValue !== reg.name);
                                        setRegs(oldRegs => {
                                            const newRegs = { ...oldRegs };
                                            const _reg = newRegs[key];
                                            if (_reg) {
                                                _reg.name = newValue;
                                            }
                                            return newRegs;
                                        });
                                    }
                                    else {
                                        addError("Could not update registration: not found.");
                                    }
                                }
                            }}
                        />,
                        filter: {
                            value: nameFilter,
                            render: () => <input
                                type="text"
                                value={nameFilter}
                                placeholder="Filter..."
                                onChange={(ev) => setNameFilter(ev.target.value)}
                            />,
                            apply: (value, data) => {
                                return value.length === 0 || data.toLowerCase().includes(value.toLowerCase())
                            }
                        }
                    },
                    email: {
                        name: "Email",
                        order: 1,
                        render: (data) => <>{data}</>,
                        renderEditor: (key, data) => <input
                            type="text"
                            value={data ?? ""}
                            placeholder="Enter an email"
                            onChange={(ev) => {
                                ev.stopPropagation();
                                const newValue = ev.target.value;
                                if (key === NewItemKey) {
                                    setNewRegistration(old => ({ ...old, email: newValue.trim().toLowerCase() }));
                                }
                            }}
                        />,
                        filter: {
                            value: emailFilter,
                            render: () => <input
                                type="text"
                                value={emailFilter}
                                placeholder="Filter..."
                                onChange={(ev) => setEmailFilter(ev.target.value)}
                            />,
                            apply: (value, data) => {
                                return value.length === 0 || data.toLowerCase().includes(value.toLowerCase())
                            }
                        }
                    },
                    affiliation: {
                        name: "Affiliation",
                        order: 2,
                        render: (data) => <>{data}</>,
                        renderEditor: (key, data) => <input
                            type="text"
                            value={data ?? ""}
                            placeholder="Enter an affiliation"
                            onChange={(ev) => {
                                ev.stopPropagation();
                                const newValue = ev.target.value;
                                if (key === NewItemKey) {
                                    setNewRegistration(old => ({ ...old, affiliation: newValue }));
                                }
                                else {
                                    assert(regs);
                                    const reg = regs[key];
                                    if (reg) {
                                        setChangesToBeSaved(changesToBeSaved || newValue !== reg.affiliation);
                                        setRegs(oldRegs => {
                                            const newRegs = { ...oldRegs };
                                            const _reg = newRegs[key];
                                            if (_reg) {
                                                _reg.affiliation = newValue;
                                            }
                                            return newRegs;
                                        });
                                    }
                                    else {
                                        addError("Could not update registration: not found.");
                                    }
                                }
                            }}
                        />,
                        filter: {
                            value: affiliationFilter,
                            render: () => <input
                                type="text"
                                value={affiliationFilter}
                                placeholder="Filter..."
                                onChange={(ev) => setAffiliationFilter(ev.target.value)}
                            />,
                            apply: (value, data) => {
                                return value.length === 0 || data.toLowerCase().includes(value.toLowerCase())
                            }
                        }
                    },
                    country: {
                        name: "Country",
                        order: 3,
                        render: (data) => <>{data}</>,
                        renderEditor: (key, data) => <input
                            type="text"
                            value={data ?? ""}
                            placeholder="Enter a country"
                            onChange={(ev) => {
                                ev.stopPropagation();
                                const newValue = ev.target.value;
                                if (key === NewItemKey) {
                                    setNewRegistration(old => ({ ...old, country: newValue }));
                                }
                                else {
                                    assert(regs);
                                    const reg = regs[key];
                                    if (reg) {
                                        setChangesToBeSaved(changesToBeSaved || newValue !== reg.country);
                                        setRegs(oldRegs => {
                                            const newRegs = { ...oldRegs };
                                            const _reg = newRegs[key];
                                            if (_reg) {
                                                _reg.country = newValue;
                                            }
                                            return newRegs;
                                        });
                                    }
                                    else {
                                        addError("Could not update registration: not found.");
                                    }
                                }
                            }}
                        />,
                        filter: {
                            value: countryFilter,
                            render: () => <input
                                type="text"
                                value={countryFilter}
                                placeholder="Filter..."
                                onChange={(ev) => setCountryFilter(ev.target.value)}
                            />,
                            apply: (value, data) => {
                                return value.length === 0 || data.toLowerCase().includes(value.toLowerCase())
                            }
                        }
                    },
                    newRole: {
                        name: "New Role",
                        order: 4,
                        render: (data) => <>{data}</>,
                        renderEditor: (key, data) => <Select
                            options={allowedRoles.map(x => ({ label: x, value: x }))}
                            value={{ label: data, value: data }}
                            onChange={(v) => {
                                const newValue = (v as any).value;
                                if (key === NewItemKey) {
                                    setNewRegistration(old => ({ ...old, newRole: newValue }));
                                }
                                else {
                                    assert(regs);
                                    const reg = regs[key];
                                    if (reg) {
                                        setChangesToBeSaved(changesToBeSaved || newValue !== reg.newRole);
                                        setRegs(oldRegs => {
                                            const newRegs = { ...oldRegs };
                                            const _reg = newRegs[key];
                                            if (_reg) {
                                                _reg.newRole = newValue;
                                            }
                                            return newRegs;
                                        });
                                    }
                                    else {
                                        addError("Could not update registration: not found.");
                                    }
                                }
                            }}
                        />,
                        filter: {
                            value: rolesFilter,
                            render: () => <Select
                                isMulti
                                options={allowedRoles.map(x => ({ label: x, value: x }))}
                                onChange={(v) => {
                                    setRolesFilter(((v ?? []) as any[]).map(x => x.value) as RoleNames[]);
                                }}
                            />,
                            apply: (value, data) => {
                                return value.length === 0 || value.includes(data);
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
                renderMultiEditor={renderMultiEditor}
                addRow={{
                    beingAdded: newRegistration,
                    incomplete:
                        newRegistration?.name && newRegistration.name.trim().length > 0
                            ? newRegistration?.email && newRegistration.email.length > 0
                                ? newRegistration?.affiliation && newRegistration.affiliation.length > 0
                                    ? newRegistration?.country && newRegistration.country.length > 0
                                        ? (allowedRoles as string[]).includes(newRegistration?.newRole ?? "")
                                            ? undefined
                                            : "New role required"
                                        : "Country required"
                                    : "Affiliation required"
                                : "Email required"
                            : "Name required",
                    begin: () => {
                        setNewRegistration({
                            country: "<Unknown>",
                            newRole: "attendee"
                        });
                    },
                    cancel: () => {
                        setNewRegistration(undefined);
                    },
                    complete: () => {
                        if (newRegistration) {
                            const email = newRegistration.email;
                            assert(email);
                            setRegs(oldRegs => {
                                const newRegs = { ...oldRegs };
                                newRegs[email] = newRegistration as RegistrationSpec;
                                return newRegs;
                            });
                            setChangesToBeSaved(true);
                            setNewRegistration(undefined);
                            setSelectedKeys(oldKeys => [...oldKeys, email]);
                        }
                    }
                }}
                deleteRows={(keys) => {
                    setRegs(oldRegs => {
                        const newRegs = { ...oldRegs };
                        for (const key of keys) {
                            if (newRegs[key]) {
                                delete newRegs[key];
                            }
                        }
                        return newRegs;
                    });
                    setChangesToBeSaved(true);
                    setSelectedKeys(oldKeys => oldKeys.filter(x => !keys.includes(x)));
                }}
            />
        </div >
    );
}
