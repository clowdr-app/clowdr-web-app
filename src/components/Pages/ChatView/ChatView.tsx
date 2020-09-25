import React from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import "./ChatView.scss";

interface Props {
    chatId: string;
}

export default function ChatView(props: Props) {
    useDocTitle("Chat Room X");
    return <div className="chat-view">
        <ChatFrame chatSid={props.chatId} />
    </div>;
}
