import React from "react";
import useMaybeChat from "../../../hooks/useMaybeChat";
import MessageList from "../MessageList/MessageList";
import "./ChatFrame.scss";

interface Props {
    chatSid: string;
}

export default function ChatFrame(props: Props) {
    const mChat = useMaybeChat();

    function sendMessage(ev: React.KeyboardEvent<HTMLInputElement>) {
        ev.preventDefault();
        ev.stopPropagation();

        if (ev.key === "Enter") {
            if (mChat) {
                mChat.sendMessage(props.chatSid, ev.currentTarget.value);
            }
        }
    }

    return <div className="chat-frame">
        <MessageList chatSid={props.chatSid} />
        <div className="compose-message">
            <input
                type="text" name="message" id="message"
                placeholder="Type a message, press enter to send"
                onKeyUp={(ev) => sendMessage(ev)}
            />
        </div>
    </div>;
}
