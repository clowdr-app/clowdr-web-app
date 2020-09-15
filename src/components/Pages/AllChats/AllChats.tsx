import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";

export default function ChatView() {
    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("All Chats");
    }, [docTitle]);
    return <>All Chats</>;
}