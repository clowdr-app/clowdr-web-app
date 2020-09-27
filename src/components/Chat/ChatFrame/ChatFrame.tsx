import React, { useRef, useState } from "react";
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
    const [newMsgText, setNewMsgText] = useState("");
    const [newMsgEnabled, setNewMsgEnabled] = useState(true);
    const msgBoxRef = useRef<HTMLTextAreaElement>(null);

    async function sendMessage(ev: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (ev.key === "Enter" && !ev.shiftKey) {
            if (mChat) {
                ev.preventDefault();
                ev.stopPropagation();

                const msg = ev.currentTarget.value.trim();

                if (msg.length > 0) {
                    try {
                        setNewMsgEnabled(false);
                        await mChat.sendMessage(props.chatSid, msg);
                        setNewMsgText("");
                    }
                    catch (e) {
                        if (e.toString().toLowerCase().includes("unauthorized")) {
                            // TODO: Hide composition box
                            logger.error("Permission denied.");
                        }
                        else {
                            // TODO: Show error to user
                            logger.error(e);
                        }
                    }

                    msgBoxRef.current?.focus();
                    setNewMsgEnabled(true);
                }
                else {
                    // TODO: Show error to user about not sending blank messages
                    setNewMsgEnabled(false);
                    setNewMsgText("");
                    setTimeout(() => {
                        setNewMsgEnabled(true);
                        msgBoxRef.current?.focus();
                    }, 500);
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
            <textarea
                ref={msgBoxRef}
                name="message" id="message"
                placeholder="Type a message [Enter to send, Shift+Enter for newline]"
                onKeyUp={(ev) => sendMessage(ev)}
                value={newMsgText}
                onChange={(ev) => setNewMsgText(ev.target.value)}
                disabled={!newMsgEnabled}>
            </textarea>
        </div>
    </div>;
}
