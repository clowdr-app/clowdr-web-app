import React, { useEffect, useState } from "react";
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
import { Flair, UserProfile } from "@clowdr-app/clowdr-db-schema/build/DataLayer";
import useConference from "../../../hooks/useConference";

interface Props {
    chatSid: string;
}

type RenderedMessage = {
    body: string;
    profileId: string;
    profileName: string;
    profilePhotoUrl: string | null;
    profileFlair: Flair;
    time: string;
    index: number;
    // TODO: Reactions
};

export default function MessageList(props: Props) {
    const conf = useConference();
    const [messagePager, setMessagesPager] = useState<Paginator<IMessage> | null>(null);
    const [messages, setMessages] = useState<Array<IMessage>>([]);
    const [renderedMessages, setRenderedMessages] = useState<Array<RenderedMessage>>([]);
    const mChat = useMaybeChat();

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
            const pager = await mChat.getMessages(props.chatSid);
            setMessages(pager.items);
            setMessagesPager(pager);
        }
        return null;
    }, setMessagesPager, [mChat, props.chatSid]);

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
            const profilePhotoUrl
                = profile.profilePhoto
                    // TODO: I think this weirdness is caused by the indexeddb caching
                    // This code has been copied around - search for all copies
                    ? "url" in profile.profilePhoto
                        ? profile.profilePhoto.url()
                        // @ts-ignore
                        : profile.profilePhoto._url as string
                    : null;
            const result: RenderedMessage = {
                body,
                profileFlair: flair,
                profileId: profile.id,
                profileName: profile.displayName,
                profilePhotoUrl,
                time: (isOver24HrOld ? time.toLocaleDateString() : "") + time.toLocaleTimeString().split(":").slice(0, 2).join(":"),
                index: message.index
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

    function renderMessage(msg: RenderedMessage): JSX.Element {
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
                <ReactMarkdown className="body">{msg.body}</ReactMarkdown>
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
