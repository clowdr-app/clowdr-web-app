import React, { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import useConference from "../../../hooks/useConference";
import useDocTitle from "../../../hooks/useDocTitle";

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
        <ReactMarkdown source={contents} escapeHtml={true} />
    </section>;
}
