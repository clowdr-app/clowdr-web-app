import React from "react";
import DocumentTitle from "react-document-title";
import useConference from "../../../hooks/useConference";

export default function LoggedInWelcome() {
    const conference = useConference();

    return <DocumentTitle title={conference.conferenceName}>
        <section tabIndex={0}>
            <p>You are logged in.</p>
        </section>
    </DocumentTitle>;
}
