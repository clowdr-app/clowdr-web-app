import React, { useMemo, useRef, useState } from "react";
import useLogger from "../../../hooks/useLogger";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserRoles from "../../../hooks/useUserRoles";
import MessageList from "../MessageList/MessageList";
import "./ChatFrame.scss";
import { Picker as EmojiPicker } from "emoji-mart";
import { ChatDescriptor } from "../../../classes/Chat";
import ReactDOM from "react-dom";
import OutsideClickHandler from "react-outside-click-handler";
import { usePopper } from "react-popper";

interface Props {
    chatId: string;
    hideMessageReportButtons?: boolean;
    showChatName?: boolean;
}

export default function ChatFrame(props: Props) {
    const mChat = useMaybeChat();
    const logger = useLogger("Chat Frame");
    const [newMsgText, setNewMsgText] = useState("");
    const [newMsgEnabled, setNewMsgEnabled] = useState(true);
    const msgBoxRef = useRef<HTMLTextAreaElement>(null);
    const { isAdmin } = useUserRoles();
    const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
    const [tc, setTC] = useState<ChatDescriptor | null>(null);

    useSafeAsync(async () => mChat?.getChat(props.chatId) ?? null, setTC, [mChat, props.chatId], "ChatFrame:getChat");

    async function sendMessage(ev: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (ev.key === "Enter" && !ev.shiftKey) {
            if (mChat) {
                ev.preventDefault();
                ev.stopPropagation();

                const msg = ev.currentTarget.value.trim();

                if (msg.length > 0) {
                    try {
                        setNewMsgEnabled(false);
                        await mChat.sendMessage(props.chatId, msg);
                        setNewMsgText("");
                    } catch (e) {
                        if (
                            e
                                .toString()
                                .toLowerCase()
                                .includes("unauthorized")
                        ) {
                            // TODO: Hide composition box
                            logger.error("Permission denied.");
                        } else {
                            // TODO: Show error to user
                            logger.error(e);
                        }
                    }

                    msgBoxRef.current?.focus();
                    setNewMsgEnabled(true);
                } else {
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

    const messagesEl = useMemo(
        () => <MessageList chatId={props.chatId} hideMessageReportButtons={props.hideMessageReportButtons} />,
        [props.chatId, props.hideMessageReportButtons]
    );

    const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null);
    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: "left-end",
        strategy: "fixed",
    });

    const chatEl = (
        <div className="chat-frame">
            {messagesEl}
            {!tc?.isAnnouncements || isAdmin ? (
                <div className="compose-message">
                    <textarea
                        autoFocus={true}
                        ref={msgBoxRef}
                        name="message"
                        id="message"
                        placeholder="Type a message [Enter to send, Shift+Enter for newline]"
                        onKeyUp={ev => sendMessage(ev)}
                        value={newMsgText}
                        onChange={ev => setNewMsgText(ev.target.value)}
                        disabled={!newMsgEnabled}
                    ></textarea>
                    <div className="add-emoji" ref={setReferenceElement}>
                        <OutsideClickHandler
                            onOutsideClick={() => {
                                setShowEmojiPicker(false);
                            }}
                            disabled={!showEmojiPicker}
                        >
                            <button
                                onClick={_ev => {
                                    setShowEmojiPicker(!showEmojiPicker);
                                }}
                            >
                                <i className="fas fa-smile-beam"></i>+
                            </button>
                            {showEmojiPicker && (
                                <div
                                    ref={setPopperElement}
                                    className="emoji-picker-container"
                                    style={{ ...styles.popper, zIndex: 999 }}
                                    {...attributes.popper}
                                >
                                    <EmojiPicker
                                        showPreview={false}
                                        useButton={false}
                                        set="twitter"
                                        title="Pick an emoji"
                                        onSelect={async ev => {
                                            setShowEmojiPicker(false);
                                            const emojiId = (ev as any).native;
                                            setNewMsgText(newMsgText + emojiId);
                                        }}
                                    />
                                </div>
                            )}
                        </OutsideClickHandler>
                    </div>
                </div>
            ) : (
                <></>
            )}
        </div>
    );

    return props.showChatName ? (
        <div className="named-chat-wrapper">
            {tc && <div className="chat-name">{tc.friendlyName}</div>}
            {chatEl}
        </div>
    ) : (
        chatEl
    );
}
