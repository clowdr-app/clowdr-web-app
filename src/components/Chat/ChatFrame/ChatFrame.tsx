import React from "react";
import MessageList from "../MessageList/MessageList";

export default function ChatFrame() {
    return <>
        <MessageList />
        <input type="text" name="message" id="message" />
    </>;
}
