import React, { useState } from "react";
import { Link } from "react-router-dom";
import SplitterLayout from "react-splitter-layout";
import { ChatDescriptor } from "../../../classes/Chat";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./ModerationHub.scss";

export default function ModerationHub() {
    const mChat = useMaybeChat();
    const [modHubId, setModHubId] = useState<string | null>(null);
    const [chatSize, setChatSize] = useState(30);
    const [allModChats, setAllModChats] = useState<Array<ChatDescriptor> | null>(null);
    const [watchedModChats, setWatchedModChats] = useState<Array<ChatDescriptor> | null>(null);

    useSafeAsync(async () => mChat?.getModerationHubChatId() ?? null, setModHubId, [mChat]);
    useSafeAsync(async () => mChat ? mChat.listAllModerationChats() : null, setAllModChats, [mChat]);
    useSafeAsync(async () => mChat ? mChat.listAllWatchedModerationChats() : null, setWatchedModChats, [mChat]);

    useHeading("Moderation Hub");

    function renderChannelLink(channel: ChatDescriptor) {
        const moderationNamePrefix = "Moderation: ";
        return <li key={channel.id}>
            <Link to={`/moderation/${channel.id}`}>
                {channel.createdAt.toLocaleString(undefined, {
                    hour12: false,
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                })}
                &nbsp;-&nbsp;
                {channel.friendlyName.substr(moderationNamePrefix.length)}
                &nbsp;(created by {channel.creator.displayName})
            </Link>
        </li>;
    }

    let watchedEl;
    let othersEl;
    if (allModChats && watchedModChats) {
        const watchedEls
            = watchedModChats
                .sort((x, y) =>
                    y.createdAt < x.createdAt
                    ? -1
                    : y.createdAt === x.createdAt
                        ? 0 : 1)
                .map(renderChannelLink);
        if (watchedEls.length === 0) {
            watchedEl = <p>You are not following any moderation channels.</p>;
        }
        else {
            watchedEl = <ul>
                {watchedEls}
            </ul>;
        }

        const otherEls = allModChats
            .filter(x => !watchedModChats.some(y => y.id === x.id))
            .sort((x, y) =>
                    y.createdAt < x.createdAt
                    ? -1
                    : y.createdAt === x.createdAt
                        ? 0 : 1)
            .map(renderChannelLink);
        if (otherEls.length === 0) {
            othersEl = <p>There are no other moderation channels to show.</p>;
        }
        else {
            othersEl = <ul>
                {otherEls}
            </ul>;
        }
    }
    else {
        watchedEl = <LoadingSpinner message="Loading all moderation channels" />;
        othersEl = <LoadingSpinner message="Loading all moderation channels" />;
    }

    return <div className="moderation-hub">
        <SplitterLayout
            vertical={true}
            percentage={true}
            ref={component => { component?.setState({ secondaryPaneSize: chatSize }) }}
            onSecondaryPaneSizeChange={newSize => setChatSize(newSize)}
        >
            <div className="split top-split">
                <button onClick={() => setChatSize(100)}>
                    &#9650;
                </button>
                <div className="all-channels">
                    <div className="col">
                        <h4>Following</h4>
                        {watchedEl}
                    </div>
                    <div className="col">
                        <h4>All others</h4>
                        {othersEl}
                    </div>
                </div>
            </div>
            <div className="split bottom-split">
                <div className="embedded-content">
                    {!modHubId
                        ? <LoadingSpinner />
                        : <ChatFrame chatId={modHubId} hideMessageReportButtons={true} />}
                </div>
                <button onClick={() => setChatSize(0)}>
                    &#9660;
                </button>
            </div>
        </SplitterLayout>
    </div>;
}
