import React from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import "./ChatView.scss";

interface Props {
    chatId: string;
}

export default function ChatView(props: Props) {
    // TODO: Chat room name
    useDocTitle("Chat Room X");

    // TODO: Action buttons / members view / etc

    // TODO: memberAdded
    // TODO: memberRemoved
    // TODO: memberUpdated

    return <div className="chat-view">
        <ChatFrame chatSid={props.chatId} />
    </div>;
}
