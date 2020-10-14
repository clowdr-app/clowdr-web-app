import React from "react";
import ReactMarkdown from "react-markdown";

export default function Help() {
    return <ReactMarkdown
        linkTarget="_blank"
    >
{`Clowdr is experimental open-source software, developed by volunteers
specifically for conferences like this one. For more information about
how to get the most of this platform, see the
[Clowdr User Manual](https://docs.google.com/document/d/1S-pNNqjA4RjQ8fn2i1Z2998VFn9bSwV4adOTpHw0BIo/edit#heading=h.dhd7xqg6t0qm). In
particular, this manual includes hints for troubleshooting and various
other techniques to make this platform work for you. If you run into
trouble you can also access the "Tech support" chat channel.
(Available under ["All Channels"](/chat) or by searching.)`}
    </ReactMarkdown>;
}
