import { _Role } from "@clowdr-app/clowdr-db-schema";
import Parse from "parse";
import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./Admin.scss";

interface Props {
}

interface SendRegistrationEmailsData {
    sendOnlyUnsent: boolean;
    conference: string;
}

interface SendRegistrationEmailsResponse {
    success: boolean;
    results: { success: boolean, to: string, reason?: string }[]
}

export default function Admin(props: Props) {
    const loggedInUserProfile = useUserProfile();
    const conference = useConference();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useHeading({
        title: "Admin",
    });

    useSafeAsync(async () => {
        return true;
    }, setIsAdmin, [loggedInUserProfile])

    async function doSendRegistrationEmails(data: SendRegistrationEmailsData): Promise<SendRegistrationEmailsResponse> {
        let response = await Parse.Cloud.run("registration-send-emails", data) as SendRegistrationEmailsResponse;
        return response;
    }

    function sendRegistrationEmails(sendOnlyUnsent: boolean): void {
        doSendRegistrationEmails({ sendOnlyUnsent: sendOnlyUnsent, conference: conference.id })
            .then(response => {
                if (response.success) {
                    addNotification(`Sent ${response.results.length} registration ${response.results.length === 1 ? "email" : "emails"}.`, "", "");
                } else {
                    addError(`Failed to send ${response.results.filter(result => !result.success).length} of ${response.results.length} registration ${response.results.length === 1 ? "email" : "emails"}.`)
                }
            });
    }

    const adminPanel = <>
        <h2>Send initial registration emails</h2>
        <p>Send the first registration email to any users that have not yet been sent one.</p>
        <p><button onClick={() => sendRegistrationEmails(true)}>Send initial registration emails</button></p>
        <h2>Send repeat registration emails</h2>
        <p>Send a repeat registration email to all users that have not yet registered. Includes users that have not yet received any registration email.</p>
        <p><button onClick={() => sendRegistrationEmails(false)}>Send repeat registration emails</button></p>
    </>;

    function contents() {
        switch (isAdmin) {
            case null:
                return <LoadingSpinner key="Loading" />;
            case true:
                return adminPanel;
            case false:
                return <Redirect to="/notfound" />;
        }
    }

    return <> { contents()} </>;
}