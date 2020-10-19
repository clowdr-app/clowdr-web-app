import { Registration } from "@clowdr-app/clowdr-db-schema";
import assert from "assert";
import Parse from "parse";
import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import { addError, addNotification } from "../../../../classes/Notifications/Notifications";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import useUserRoles from "../../../../hooks/useUserRoles";
import Column, { DefaultItemRenderer, Item as ColumnItem } from "../../../Columns/Column/Column";
import Columns from "../../../Columns/Columns";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import "./Registration.scss";

interface Props {
}

type RegistrationSpec = {
    name: string;
    email: string;
    affiliation: string;
    country: string;
    newRole: "attendee" | "manager" | "admin";
};

interface NewRegistrationEmailsData {
    conference: string;
    registrations: Array<RegistrationSpec>;
}

type UploadRegistrationEmailsResponse = Array<{ index: number; result: string | boolean }>;

interface SendRegistrationEmailsData {
    sendOnlyUnsent: boolean;
    conference: string;
}

interface SendRegistrationEmailsResponse {
    success: boolean;
    results: { success: boolean, to: string, reason?: string }[]
}

export default function AdminRegistration(props: Props) {
    const conference = useConference();
    const { isAdmin } = useUserRoles();
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [newRegsData, setNewRegsData] = useState<any>(null);
    const [existingRegs, setExistingRegs] = useState<Registration[] | null>(null);
    const [sentRepeats, setSentRepeats] = useState<boolean>(false);

    useSafeAsync(async () => Registration.getAll(conference.id), setExistingRegs, [conference.id]);

    useHeading({
        title: "Admin: Registrations",
    });

    async function doUploadRegistrations(data: NewRegistrationEmailsData): Promise<UploadRegistrationEmailsResponse> {
        setIsUploading(true);
        const response = await Parse.Cloud.run("registration-create-many", data) as UploadRegistrationEmailsResponse;
        return response;
    }

    function uploadRegistrations(): void {
        doUploadRegistrations({ conference: conference.id, registrations: newRegsData })
            .then(responses => {
                const failedIdxs: number[] = [];
                let successCount = 0;
                for (const response of responses) {
                    if (!response.result) {
                        failedIdxs.push(response.index);
                    }
                    else {
                        successCount++;
                    }
                }
                if (successCount > 0) {
                    addNotification(`Uploaded ${successCount} registrations.`);
                }
                if (failedIdxs.length > 0) {
                    addError(`Failed to upload ${failedIdxs.length} registrations.`);
                }
                setIsUploading(false);
            })
            .catch(_ => {
                addError("Error when attempting to upload new registrations.");
                setIsUploading(false);
            });
    }

    async function doSendRegistrationEmails(data: SendRegistrationEmailsData): Promise<SendRegistrationEmailsResponse> {
        setIsSending(true);
        setSentRepeats(!data.sendOnlyUnsent);
        const response = await Parse.Cloud.run("registration-send-emails", data) as SendRegistrationEmailsResponse;
        return response;
    }

    function sendRegistrationEmails(sendOnlyUnsent: boolean): void {
        doSendRegistrationEmails({ sendOnlyUnsent, conference: conference.id })
            .then(response => {
                if (response.success) {
                    addNotification(`Sent ${response.results.length} registration ${response.results.length === 1 ? "email" : "emails"}.`);
                } else {
                    addError(`Failed to send ${response.results.filter(result => !result.success).length} of ${response.results.length} registration ${response.results.length === 1 ? "email" : "emails"}.`)
                }
                setIsSending(false);
            })
            .catch(e => {
                console.error(e);
                addError("Error when attempting to send registration emails.");
                setIsSending(false);
            });
    }

    function regRenderer(item: ColumnItem<Registration>): JSX.Element {
        const data = item.renderData;
        const linkURL = `${process.env.REACT_APP_FRONTEND_URL}/register/${conference.id}/${data.id}/${data.email}`;
        return <>
            <div className="name">
                {data.name}
            </div>
            <div className="email">
                {data.email}
            </div>
            <div className="link">
                <a href={linkURL}>{linkURL}</a>
            </div>
        </>;
    }

    const adminPanel = <>
        <h2>Upload new registrations</h2>
        <p>
            You can upload new registrations using a JSON file. The required format is specified below.
            Emails will not be sent to new addresses until you press one of the Send buttons below.
            Duplicate registrations will not be created for existing email addresses.
        </p>
        <div>
            {isUploading ? <LoadingSpinner message="Uploading registrations" /> :
                <>
                    <div>
                        <label htmlFor="newRegistrationsFile">Select JSON file</label><br />
                        <input id="newRegistrationsFile" type="file" accept="application/json"
                            disabled={isProcessing}
                            onChange={async (ev) => {
                                setIsProcessing(true);
                                let result: Array<any> | null = null;
                                if (ev.target.files) {
                                    for (const file of ev.target.files) {
                                        try {
                                            const fileContents = await file.text();
                                            const fileData = JSON.parse(fileContents);
                                            assert(fileData instanceof Array);
                                            result = (result || [] as any[]).concat(fileData);
                                        }
                                        catch (e) {
                                            addError(`File "${file.name}" contains invalid data.`);
                                        }
                                    }
                                }
                                setNewRegsData(result);
                                setIsProcessing(false);
                            }}
                        />
                    </div><br />
                    <button
                        disabled={isProcessing || isUploading || !newRegsData || newRegsData.length === 0}
                        onClick={() => uploadRegistrations()}>
                        Upload registrations
                    </button>
                </>}
        </div>
        <br />
        <h5>Registration data format</h5>
        <p>
            <pre>{`type registrationsFile = Array<RegistrationSpec>;

type RegistrationSpec = {
    name: string;
    email: string;
    affiliation: string;
    country: string;
    newRole: "attendee" | "manager" | "admin";
};`}
            </pre>
        </p>
        <h2>Send initial registration emails</h2>
        <p>Send the first registration email to any users that have not yet been sent one.</p>
        <p>{isSending ? <LoadingSpinner message="Sending emails" /> : <button disabled={isSending} onClick={() => sendRegistrationEmails(true)}>Send initial registration emails</button>}</p>
        <h2>Send repeat registration emails</h2>
        <p>Send a repeat registration email to all users that have not yet registered. Includes users that have not yet received any registration email.</p>
        <p>{sentRepeats
                ? <>You have alrerady sent repeat emails. Pressing this button again will send the same people another copy of their registration email. If this is what you would like to do, please refresh the page.</>
                : isSending
                ? <LoadingSpinner message="Sending emails" />
                : <button disabled={isSending} onClick={() => sendRegistrationEmails(false)}>Send repeat registration emails</button>}</p>
        <Columns className="admin-registrations">
            <Column
                className="col"
                items={existingRegs?.map(reg => ({
                    key: reg.id,
                    text: reg.name,
                    renderData: reg
                })) ?? undefined}
                itemRenderer={{ render: regRenderer }}
                loadingMessage="Loading existing registrations">
                <h2>Existing Registrations{existingRegs ? ` (${existingRegs.length})` : ""}</h2>
            </Column>
        </Columns>
    </>;

    return isAdmin === null
        ? <LoadingSpinner />
        : isAdmin
            ? adminPanel
            : <Redirect to="/notfound" />;
}
