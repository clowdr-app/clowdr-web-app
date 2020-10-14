import React, { useEffect, useState } from "react";
import "./MessageList.scss";
import "../../Profile/FlairChip/FlairChip.scss";

import IMessage from "../../../classes/Chat/IMessage";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useMaybeChat from "../../../hooks/useMaybeChat";
import InfiniteScroll from "react-infinite-scroll-component";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import assert from "assert";
import { ChannelEventNames } from "../../../classes/Chat/Services/Twilio/Channel";
import useConference from "../../../hooks/useConference";
import { addError } from "../../../classes/Notifications/Notifications";

import useUserProfile from "../../../hooks/useUserProfile";
import Message, { RenderedMessage, renderMessage } from "./Message";

interface Props {
    chatId: string;
    hideMessageReportButtons?: boolean;
}

export default function MessageList(props: Props) {
    const conf = useConference();
    const userProfile = useUserProfile();
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
                listeners.set("messageRemoved", await chat.channelEventOn(props.chatId, "messageRemoved", (msg) => {
                    const newMessages = messages.filter(x => x.index !== msg.index);
                    setMessages(newMessages);
                }));

                listeners.set("messageAdded", await chat.channelEventOn(props.chatId, "messageAdded", (msg) => {
                    const newMessages = [...messages, msg];
                    setMessages(sortMessages(newMessages));
                }));

                listeners.set("messageUpdated", await chat.channelEventOn(props.chatId, "messageUpdated", (msg) => {
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
                    chat.channelEventOff(props.chatId, key, listener);
                }
            }
        };
    }, [mChat, messages, props.chatId]);

    useSafeAsync(async () => {
        if (mChat) {
            try {
                const pager = await mChat.getMessages(props.chatId);
                if (pager) {
                    return { messages: pager.items, pager };
                }
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
    }, [mChat, props.chatId]);

    useSafeAsync(async () =>
        Promise.all(messages.map(async message =>
            renderMessage(conf, userProfile, props.chatId, message))),
        setRenderedMessages,
        [messages]
    );

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


    // TODO: Detect if loaded messages render shorter than the available space
    //       if so, element won't present a scrollbar so we must manually load
    //       in more messages until overflow occurs.

    return <div id={props.chatId} className="message-list">
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
            scrollableTarget={props.chatId}
        >
            <div>
                {renderedMessages.map(x => <Message key={x.sid} msg={x} hideReportButton={props.hideMessageReportButtons} />)}
            </div>
        </InfiniteScroll>
    </div>;
}
