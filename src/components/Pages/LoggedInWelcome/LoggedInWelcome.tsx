import React from "react";
import useConference from "../../../hooks/useConference";
import useDocTitle from "../../../hooks/useDocTitle";

export default function LoggedInWelcome() {
    const conference = useConference();

    const docTitle = useDocTitle();
    docTitle.set(conference.name);

    return <section aria-labelledby="page-title" tabIndex={0}>
        <p>You are logged in.</p>
    </section>;
}
