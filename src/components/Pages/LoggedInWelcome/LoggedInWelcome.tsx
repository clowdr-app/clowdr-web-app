import React, { useEffect, useState } from "react";
import useConference from "../../../hooks/useConference";
import useDocTitle from "../../../hooks/useDocTitle";

export default function LoggedInWelcome() {
    const conference = useConference();
    const [contents, setContents] = useState<string>("You are logged in. Loading conference information...");

    useDocTitle(conference.name);

    useEffect(() => {
        conference.details.then(details => {
            let text = details.find(x => x.key === "LOGGED_IN_TEXT")?.value;
            if (text) {
                setContents(text);
            }
        });
    }, [conference]);

    return <section aria-labelledby="page-title" tabIndex={0}>
        <p>{contents}</p>
    </section>;
}
