import React from "react";
import MessageList from "../MessageList/MessageList";
import "./ChatFrame.scss";

interface Props {
    chatId: string;
}

export default function ChatFrame(props: Props) {
    return <div className="chat-frame">
        <span>Chat {props.chatId}</span>
        <MessageList />
        <input type="text" name="message" id="message" />
    </div>;
}
