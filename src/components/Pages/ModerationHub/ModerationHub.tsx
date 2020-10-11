import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SplitterLayout from "react-splitter-layout";
import { ChatDescriptor } from "../../../classes/Chat";
import useChats from "../../../hooks/useChats";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useWatchedItems from "../../../hooks/useWatchedItems";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import Column, { Item as ColumnItem } from "../../Columns/Column/Column";
import Columns from "../../Columns/Columns";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./ModerationHub.scss";

interface ModerationChannelData {
    completed: boolean;
    created: Date;
}

export default function ModerationHub() {
    useHeading("Moderation Hub");
    const mChat = useMaybeChat();
    const [modHubId, setModHubId] = useState<string | null>(null);
    const [chatSize, setChatSize] = useState(30);
    const allChats = useChats();
    const watchedItems = useWatchedItems();
    const [modChannels, setModChannels] = useState<Array<ChatDescriptor> | null>(null);
    const [watchedModChannels, setWatchedModChannels] = useState<Array<ChatDescriptor> | null>(null);

    const [modChannelItems, setModChannelItems] = useState<Array<ColumnItem<ModerationChannelData>> | undefined>();
    const [watchedModChannelItems, setWatchedModChannelItems] = useState<Array<ColumnItem<ModerationChannelData>> | undefined>();

    useSafeAsync(async () => mChat?.getModerationHubChatId() ?? null, setModHubId, [mChat]);
    useSafeAsync(async () => mChat ? mChat.listAllModerationChats() : null, setModChannels, [mChat, allChats]);
    useSafeAsync(async () => mChat ? mChat.listAllWatchedModerationChats() : null, setWatchedModChannels, [mChat, allChats, watchedItems?.watchedChats]);

    const moderationNamePrefix = "Moderation: ";
    function channelName(channel: ChatDescriptor) {
        return `${channel.createdAt.toLocaleString(undefined, {
            hour12: false,
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        })} - ${channel.friendlyName.substr(moderationNamePrefix.length)}
        (created by ${channel.creator.displayName})`
    };

    useEffect(() => {
        setModChannelItems(modChannels
            ?.filter(x => !watchedModChannels?.some(y => y.id === x.id) ?? true)
            ?.map(channel => ({
                key: channel.id,
                renderData: { completed: channel.isModeration && !channel.isActive, created: channel.createdAt },
                text: channelName(channel),
                link: `/moderation/${channel.id}`
            })))
    }, [modChannels, watchedModChannels]);

    useEffect(() => {
        setWatchedModChannelItems(watchedModChannels?.map(channel => ({
            key: channel.id,
            renderData: { completed: channel.isModeration && !channel.isActive, created: channel.createdAt },
            text: channelName(channel),
            link: `/moderation/${channel.id}`
        })))
    }, [watchedModChannels]);

    function modChannelRenderer(item: ColumnItem<ModerationChannelData>): JSX.Element {
        return item.link
            ? <Link className={item.renderData.completed ? "completed" : ""} to={item.link}>
                {item.text} {item.renderData.completed && " - Completed"}
            </Link>
            : <>{item.text} {item.renderData.completed && " - Completed"}</>;
    }

    function sortModChannelItems(a: ColumnItem<ModerationChannelData>, b: ColumnItem<ModerationChannelData>): number {
        return b.renderData.created < a.renderData.created
            ? -1
            : b.renderData.created === a.renderData.created
                ? 0 : 1
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
                <Columns className="all-channels">
                    <>
                        <Column
                            className="col"
                            itemRenderer={{ render: modChannelRenderer }}
                            loadingMessage="Loading channels"
                            emptyMessage="You are not following any moderation channels."
                            sort={sortModChannelItems}
                            items={watchedModChannelItems}>
                            <h4>Following</h4>
                        </Column>
                        <Column
                            className="col"
                            itemRenderer={{ render: modChannelRenderer }}
                            loadingMessage="Loading channels"
                            emptyMessage="No other moderation channels found."
                            sort={sortModChannelItems}
                            items={modChannelItems}>
                            <h4>All others</h4>
                        </Column>
                    </>
                </Columns>
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
