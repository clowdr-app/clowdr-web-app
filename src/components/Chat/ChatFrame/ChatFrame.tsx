import { ConferenceConfiguration } from "@clowdr-app/clowdr-db-schema";
import React, { useRef, useState } from "react";
import useConference from "../../../hooks/useConference";
import useLogger from "../../../hooks/useLogger";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserRoles from "../../../hooks/useUserRoles";
import MessageList from "../MessageList/MessageList";
import "./ChatFrame.scss";

interface Props {
    chatSid: string;
}

export default function ChatFrame(props: Props) {
    const conference = useConference();
    const mChat = useMaybeChat();
    const logger = useLogger("Chat Frame");
    const [newMsgText, setNewMsgText] = useState("");
    const [newMsgEnabled, setNewMsgEnabled] = useState(true);
    const msgBoxRef = useRef<HTMLTextAreaElement>(null);
    const { isAdmin, isManager } = useUserRoles();
    const [announcementsChannelSid, setAnnouncementsChannelSid] = useState<string | null>(null);

    useSafeAsync(async () => {
        const configs = await ConferenceConfiguration.getByKey("TWILIO_ANNOUNCEMENTS_CHANNEL_SID", conference.id);
        if (configs.length > 0) {
            return configs[0].value;
        }
        return null;
    }, setAnnouncementsChannelSid, [conference.id]);

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

    // TODO: When should a user auto-leave a channel? E.g. when should they continue
    //       to receive notifications for channels embedded within events/sessions/tracks/video rooms
    //       Perhaps those pages should have a "subscribe to notifications" action button?
    // TODO: Auto-leave / auto-unsubscribe for embedded text chats as per above

    // TODO: If you log in with User A, create a DM to User B, then log out, then log in with User B
    //       all without changing the page url, then you might get an Access Forbidden error from
    //       Twilio because the chat will try to load before User B has joined it.

    return <div className="chat-frame">
        <MessageList chatSid={props.chatSid} />
        {props.chatSid !== announcementsChannelSid || isAdmin
            ? <div className="compose-message">
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
            : <></>
        }
    </div>;
}
