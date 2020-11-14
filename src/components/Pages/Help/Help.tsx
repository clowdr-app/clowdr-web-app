import React from "react";
import { ReactMarkdownCustomised } from "../../../classes/Utils";

export default function Help() {
    return <ReactMarkdownCustomised>
        {`Clowdr is experimental open-source software, developed specifically for
conferences like this one. If you run into trouble you can also access the
"Tech support" chat channel. (Available under ["All Channels"](/chat) or by searching.)

We'll be adding more detail to this page for future conferences but our focus is
always to improve the software to avoid recurrent problems.`}
    </ReactMarkdownCustomised>;
}
