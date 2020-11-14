import { PrivilegedConferenceDetails } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { ReactMarkdownCustomised } from "../../../classes/Utils";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";

/* We use the react-markdown[1] package to render user-supplied Markdown.
 * Note that `escapeHtml` must be turned on for this to be safe. By default, react-markdown will sanitize hrefs to remove
 * e.g. javascript: links.
 * remark-parse[2] is the Markdown parser and by default it supports GitHub Flavored Markdown (GFM).
 *
 * [1] https://www.npmjs.com/package/react-markdown
 * [2] https://github.com/remarkjs/remark/tree/main/packages/remark-parse
*/

export default function LoggedInWelcome() {
    const conference = useConference();
    const defaultContents = "You are logged in. Loading conference information...";
    const [contents, setContents] = useState<string>(defaultContents);

    useHeading(conference.name);

    useSafeAsync(async () => {
        const details = await conference.details;
        return details.find(x => x.key === "LOGGED_IN_TEXT")?.value;
    }, setContents, [conference], "LoggedInWelcome:setContents");

    const onTextUpdated = useCallback(function _onTextUpdate(update: DataUpdatedEventDetails<"PrivilegedConferenceDetails">) {
        for (const object of update.objects) {
            const details = object as PrivilegedConferenceDetails;
            if (details.conferenceId === conference.id && details.key === "LOGGED_IN_TEXT") {
                setContents(details.value);
            }
        }
    }, [conference.id]);

    useDataSubscription("PrivilegedConferenceDetails", onTextUpdated, null, contents === "You are logged in. Loading conference information...", conference);

    return <section aria-labelledby="page-title">
        <ReactMarkdownCustomised>{contents}</ReactMarkdownCustomised>
    </section>;
}
