import React, { ElementType, useEffect, useRef, useState } from "react";
import "./MessageList.scss";
import "../../Profile/FlairChip/FlairChip.scss";

import IMessage from "../../../classes/Chat/IMessage";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
// @ts-ignore
import defaultProfilePic from "../../../assets/default-profile-pic.png";
import FlairChip from "../../Profile/FlairChip/FlairChip";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useMaybeChat from "../../../hooks/useMaybeChat";
import InfiniteScroll from "react-infinite-scroll-component";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import ReactMarkdown from "react-markdown";
import assert from "assert";
import { ChannelEventNames } from "../../../classes/Chat/Services/Twilio/Channel";
import { Flair, UserProfile } from "@clowdr-app/clowdr-db-schema";
import useConference from "../../../hooks/useConference";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";
import { addError } from "../../../classes/Notifications/Notifications";

import 'emoji-mart/css/emoji-mart.css';
import { Picker as EmojiPicker } from 'emoji-mart';
import { emojify } from "react-emojione";
import { Tooltip } from "@material-ui/core";
import useUserProfile from "../../../hooks/useUserProfile";

interface Props {
    chatSid: string;
}

type RenderedMessage = {
    sid: string;
    body: string;
    profileId: string;
    profileName: string;
    profilePhotoUrl: string | null;
    profileFlair: Flair;
    time: string;
    index: number;
    reactions: {
        [reaction: string]: { ids: Array<string>; names: Array<string> } }
};

export default function MessageList(props: Props) {
    const conf = useConference();
    const userProfile = useUserProfile();
    const [messagePager, setMessagesPager] = useState<Paginator<IMessage> | null>(null);
    const [messages, setMessages] = useState<Array<IMessage>>([]);
    const [renderedMessages, setRenderedMessages] = useState<Array<RenderedMessage>>([]);
    const mChat = useMaybeChat();
    const [pickEmojiForMsgSid, setPickEmojiForMsgSid] = useState<string | null>(null);

    function sortMessages(msgs: Array<IMessage>): Array<IMessage> {
        return msgs.sort((x, y) => x.index < y.index ? -1 : x.index === y.index ? 0 : 1);
    }

    useEffect(() => {
        const listeners: Map<ChannelEventNames, () => void> = new Map();
        const chat = mChat;

        async function attach() {
            if (chat) {
                listeners.set("messageRemoved", await chat.channelEventOn(props.chatSid, "messageRemoved", (msg) => {
                    const newMessages = messages.filter(x => x.index !== msg.index);
                    setMessages(newMessages);
                }));

                listeners.set("messageAdded", await chat.channelEventOn(props.chatSid, "messageAdded", (msg) => {
                    const newMessages = [...messages, msg];
                    setMessages(sortMessages(newMessages));
                }));

                listeners.set("messageUpdated", await chat.channelEventOn(props.chatSid, "messageUpdated", (msg) => {
                    if (msg.updateReasons.includes("body") ||
                        msg.updateReasons.includes("author") ||
                        msg.updateReasons.includes("attributes")) {
                        const newMessages = messages.map(x => {
                            if (x.index === msg.message.index) {
                                return msg.message;
                            }
                            else {
                                return x;
                            }
                        });
                        setMessages(newMessages);
                    }
                }));
            }
        }

        attach();

        return function detach() {
            if (chat) {
                const keys = listeners.keys();
                for (const key of keys) {
                    const listener = listeners.get(key) as () => void;
                    chat.channelEventOff(props.chatSid, key, listener);
                }
            }
        };
    }, [mChat, messages, props.chatSid]);

    useSafeAsync(async () => {
        if (mChat) {
            try {
                const pager = await mChat.getMessages(props.chatSid);
                return { messages: pager.items, pager };
            }
            catch (e) {
                console.error("Failed to fetch chat messages.", e);
                addError("Failed to fetch chat messages.");
            }
        }
        return null;
    }, (data: {
        messages: IMessage[],
        pager: Paginator<IMessage>
    } | null) => {
        if (data) {
            setMessages(data.messages);
            setMessagesPager(data.pager);
        }
        else {
            setMessages([]);
            setMessagesPager(null);
        }
    }, [mChat, props.chatSid]);

    useSafeAsync(async () => {
        return await Promise.all(messages.map(async message => {
            const body = message.body;
            const member = await message.getMember();
            const memberProfileId = member.profileId;
            const profile = await UserProfile.get(memberProfileId, conf.id);
            assert(profile);
            const time = message.timestamp;
            const now = Date.now();
            const isOver24HrOld = (now - time.getTime()) > (1000 * 60 * 60 * 24);
            const flair = await profile.primaryFlair;
            const profilePhotoUrl = handleParseFileURLWeirdness(profile.profilePhoto);
            const reactorIds = (message.attributes as any)?.reactions ?? {};
            const reactions: { [reaction: string]: { ids: Array<string>; names: Array<string> } } = {};
            for (const reaction in reactorIds) {
                if (reaction in reactorIds) {
                    reactions[reaction] = {
                        ids: reactorIds[reaction],
                        names: await Promise.all(reactorIds[reaction].map(async (aProfileId: string) => {
                            const aProfile = await UserProfile.get(aProfileId, conf.id);
                            return aProfile?.displayName ?? "<Unknown>";
                        }))
                    };
                }
            }
            const result: RenderedMessage = {
                sid: message.sid,
                body,
                profileFlair: flair,
                profileId: profile.id,
                profileName: profile.displayName,
                profilePhotoUrl,
                time: (isOver24HrOld ? time.toLocaleDateString() : "") + time.toLocaleTimeString().split(":").slice(0, 2).join(":"),
                index: message.index,
                reactions
            };
            return result;
        }));
    }, setRenderedMessages, [messages]);

    async function loadMoreMessages() {
        assert(messagePager);
        assert(messagePager.hasPrevPage);

        const prevPage = await messagePager.prevPage();
        setMessagesPager(prevPage);

        const items = prevPage.items;
        const existingMsgIdxs = messages.map(x => x.index);
        const newMessages = [...messages];
        for (const item of items) {
            const idx = existingMsgIdxs.indexOf(item.index);
            if (idx > -1) {
                newMessages.splice(idx, 1, item);
            }
            else {
                newMessages.push(item);
            }
        }
        setMessages(sortMessages(newMessages));
    }

    function toggleAddReaction(msgSid: string) {
        if (pickEmojiForMsgSid) {
            setPickEmojiForMsgSid(null);
        }
        else {
            setPickEmojiForMsgSid(msgSid);
        }
    }

    function renderMessage(msg: RenderedMessage): JSX.Element {
        const doEmojify = (val: any) => <>{emojify(val, { output: 'unicode' })}</>;
        const renderEmoji = (text: any) => doEmojify(text.value);

        return <div className="message" key={msg.index}>
            <div className="profile">
                {msg.profilePhotoUrl
                    ? <img src={msg.profilePhotoUrl} alt={msg.profileName + "'s avatar"} />
                    : <img src={defaultProfilePic} alt="default avatar" />
                }
                <FlairChip flair={msg.profileFlair} small />
            </div>
            <div className="content">
                <div className="name">{msg.profileName}</div>
                <div className="time">{msg.time}</div>
                <ReactMarkdown
                    className="body"
                    renderers={{
                        text: renderEmoji
                    }}
                >
                    {msg.body}
                </ReactMarkdown>
                <div className="reactions">
                    {Object.keys(msg.reactions).map(reaction => {
                        return <Tooltip key={reaction} title={msg.reactions[reaction].names.reduce((acc, x) => `${acc}, ${x}`, "").substr(2)}>
                            <button
                                onClick={async (ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    setPickEmojiForMsgSid(null);
                                    if (msg.reactions[reaction].ids.includes(userProfile.id)) {
                                        try {
                                            assert((await mChat?.removeReaction(props.chatSid, msg.sid, reaction))?.ok);
                                        }
                                        catch (e) {
                                            console.error(e);
                                            addError("Sorry, we could not remove your reaction.");
                                        }
                                    }
                                    else {
                                        try {
                                            assert((await mChat?.addReaction(props.chatSid, msg.sid, reaction))?.ok);
                                        }
                                        catch (e) {
                                            console.error(e);
                                            addError("Sorry, we could not add your reaction.");
                                        }
                                    }
                                }}
                            >
                                {doEmojify(reaction)}
                            </button>
                        </Tooltip>;
                    })}
                    <div className="add-reaction">
                        {pickEmojiForMsgSid === msg.sid
                            ? <EmojiPicker
                                showPreview={false}
                                useButton={false}
                                title="Pick a reaction"
                                onSelect={async (ev) => {
                                    setPickEmojiForMsgSid(null);
                                    const emojiId = ev.colons ?? ev.id;
                                    assert(emojiId);
                                    try {
                                        assert((await mChat?.addReaction(props.chatSid, msg.sid, emojiId))?.ok);
                                    }
                                    catch (e) {
                                        console.error(e);
                                        addError("Sorry, we could not add your reaction.");
                                    }
                                }}
                            />
                            : <></>}
                        <button
                            className="new"
                            onClick={(ev) => toggleAddReaction(msg.sid)}
                        >
                            <i className="fas fa-smile-beam"></i>+
                        </button>
                    </div>
                </div>
            </div>
        </div>;
    }

    // TODO: Detect if loaded messages render shorter than the available space
    //       if so, element won't present a scrollbar so we must manually load
    //       in more messages until overflow occurs.

    return <div id={props.chatSid} className="message-list">
        <InfiniteScroll
            dataLength={messages.length}
            next={() => loadMoreMessages()}
            inverse={true}
            // Has to be applied as style not scss
            style={{ display: 'flex', flexDirection: 'column-reverse' }}
            hasMore={messagePager === null || messagePager.hasPrevPage}
            loader={<LoadingSpinner />}
            endMessage={
                <p className="start-of-chat">
                    Beginning of chat.
                </p>}
            scrollableTarget={props.chatSid}
        >
            <div>
                {renderedMessages.map(x => renderMessage(x))}
            </div>
        </InfiniteScroll>
    </div>;
}
