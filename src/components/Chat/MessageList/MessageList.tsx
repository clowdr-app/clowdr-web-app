import React, { useState } from "react";
import "./MessageList.scss";

import IMessage from "../../../classes/Chat/IMessage";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useMaybeChat from "../../../hooks/useMaybeChat";
import InfiniteScroll from "react-infinite-scroll-component";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import ReactMarkdown from "react-markdown";
import assert from "assert";

interface Props {
    chatSid: string;
}

export default function MessageList(props: Props) {
    const [messagePager, setMessagesPager] = useState<Paginator<IMessage> | null>(null);
    const [messages, setMessages] = useState<Array<IMessage>>([]);
    const mChat = useMaybeChat();

    function sortMessages(msgs: Array<IMessage>): Array<IMessage> {
        return msgs.sort((x, y) => x.index < y.index ? -1 : x.index === y.index ? 0 : 1);
    }

    useSafeAsync(async () => {
        if (mChat) {
            const pager = await mChat.getMessages(props.chatSid);
            setMessages(pager.items);
            setMessagesPager(pager);
        }
        return null;
    }, setMessagesPager, [props.chatSid]);

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

    function renderMessage(msg: IMessage): JSX.Element {
        return <div className="message" key={msg.index}>
            <ReactMarkdown>{msg.body}</ReactMarkdown>
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
                {messages.map(x => renderMessage(x))}
            </div>
        </InfiniteScroll>
    </div>;
}
