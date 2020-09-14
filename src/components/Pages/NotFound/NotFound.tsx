import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";

export default function ChatView() {
    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Not Found");
    }, [docTitle]);
    return <>Page Not Found</>;
}