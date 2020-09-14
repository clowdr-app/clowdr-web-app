import React from "react";
import DocumentTitle from "react-document-title";
import useConference from "../../../hooks/useConference";

export default function LoggedInWelcome() {
    const conference = useConference();

    return <DocumentTitle title={conference.conferenceName}>
        <section aria-labelledby="page-title" tabIndex={0}>
            <h1 id="page-title" aria-level={1}>{conference.conferenceName}</h1>
            <p>You are logged in.</p>
        </section>
    </DocumentTitle>;
}
