import React from "react";
import MessageList from "../MessageList/MessageList";

interface Props {
    chatId: string;
}

export default function ChatFrame(props: Props) {
    return <>
        <span>Chat {props.chatId}</span>
        <MessageList />
        <input type="text" name="message" id="message" />
    </>;
}
