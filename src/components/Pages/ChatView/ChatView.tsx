import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import { Link } from "react-router-dom";

export default function ChatView() {
    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Chat Room X");
    }, [docTitle]);
    return <> <Link to="/breakout">To Room</Link></>;
}