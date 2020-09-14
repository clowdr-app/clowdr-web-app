import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import "./ChatView.scss";

interface Props {
    chatId: string;
}

export default function ChatView(props: Props) {
    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Chat Room X");
    }, [docTitle]);
    return <div className="chat-view">
        <ChatFrame chatId={props.chatId} />
    </div>;
}