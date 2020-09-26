import React from "react";
import useLogger from "../../../hooks/useLogger";
import useMaybeChat from "../../../hooks/useMaybeChat";
import MessageList from "../MessageList/MessageList";
import "./ChatFrame.scss";

interface Props {
    chatSid: string;
}

export default function ChatFrame(props: Props) {
    const mChat = useMaybeChat();
    const logger = useLogger("Chat Frame");

    async function sendMessage(ev: React.KeyboardEvent<HTMLInputElement>) {
        if (ev.key === "Enter") {
            if (mChat) {
                ev.preventDefault();
                ev.stopPropagation();

                try {
                    await mChat.sendMessage(props.chatSid, ev.currentTarget.value);
                }
                catch (e) {
                    if (e.toString().toLowerCase().includes("unauthorized")) {
                        // TODO: Disable sending
                        logger.error("Permission denied.");
                    }
                    else {
                        // TODO: Show error to user
                        logger.error(e);
                    }
                }
            }
        }
    }

    // TODO: Somehow detect whether we're going to be permitted to send messages
    //       or not (maybe query our Twilio Backend), then hide the Send box if
    //       we're not allowed.

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
