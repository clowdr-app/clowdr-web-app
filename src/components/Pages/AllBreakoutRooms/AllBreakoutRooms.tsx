import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";

export default function ChatView() {
    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("All Breakout Rooms");
    }, [docTitle]);
    return <>All Breakout Rooms</>;
}