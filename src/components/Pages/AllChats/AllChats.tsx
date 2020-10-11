import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { removeNull } from "@clowdr-app/clowdr-db-schema/build/Util";
import React, { useEffect, useState } from "react";
import { ChatDescriptor } from "../../../classes/Chat";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import Column, { DefaultItemRenderer, Item as ColumnItem } from "../../Columns/Column/Column";
import Columns from "../../Columns/Columns";
import "./AllChats.scss";

export default function ChatView() {
    useHeading("All Chats");

    const conference = useConference();
    const mChat = useMaybeChat();
    const currentProfile = useUserProfile();
    const [allProfiles, setAllProfiles] = useState<Array<UserProfile> | null>(null);
    const [allTwilioChats, setAllChats] = useState<Array<ChatDescriptor> | null>(null);

    const [dmChatItems, setDmChatItems] = useState<ColumnItem[] | undefined>();
    const [allOtherUserItems, setAllOtherUserItems] = useState<ColumnItem[] | undefined>();
    const [allOtherChatsItems, setAllOtherChatsItems] = useState<ColumnItem[] | undefined>();

    useSafeAsync(async () => UserProfile.getAll(conference.id), setAllProfiles, [conference.id]);
    useSafeAsync(async () => mChat ? mChat.listAllChats() : null, setAllChats, [mChat]);

    useEffect(() => {
        const items = removeNull(allTwilioChats
            ?.filter(chat =>
                chat.isDM &&
                chat.friendlyName.includes(currentProfile.id))
            ?.map(chat => {
                const profile = allProfiles?.find(profile => chat.friendlyName.includes(profile.id));
                return profile
                    ? {
                        text: profile.displayName,
                        link: `/chat/${chat.id}`,
                        key: profile.id,
                        renderData: undefined,
                    } as ColumnItem
                    : null;
            }) ?? []);
        setDmChatItems(items);
    }, [allTwilioChats, allProfiles, currentProfile.id])

    useEffect(() => {
        const items = allProfiles
            ?.filter(profile => !allTwilioChats
                ?.some(chat => chat.isDM && chat.friendlyName.includes(profile.id)))
            ?.map(profile => {
                return {
                    text: profile.displayName,
                    link: `/chat/new/${profile.id}`,
                    key: profile.id,
                    renderData: undefined,
                } as ColumnItem
            }) ?? [];
        setAllOtherUserItems(items);
    }, [allTwilioChats, allProfiles, currentProfile.id]);

    useEffect(() => {
        const items = allTwilioChats
            ?.filter(chat => !chat.isDM)
            ?.map(chat => {
                return {
                    text: chat.friendlyName,
                    link: `/chat/${chat.id}`,
                    key: chat.id,
                    renderData: undefined,
                } as ColumnItem
            }) ?? [];
        setAllOtherChatsItems(items);
    }, [allTwilioChats]);

    return <Columns className="all-chats">
        <>
            <Column
                className="col"
                items={dmChatItems}
                itemRenderer={new DefaultItemRenderer()}
                loadingMessage="Loading direct messages">
                <h2>Direct messages</h2>
            </Column>
            <Column
                className="col"
                items={allOtherUserItems}
                itemRenderer={new DefaultItemRenderer()}
                loadingMessage="Loading users">
                <h2>Users</h2>
            </Column>
            <Column
                className="col"
                items={allOtherChatsItems}
                itemRenderer={new DefaultItemRenderer()}
                loadingMessage="Loading chats">
                <h2>Chats</h2>
            </Column>
        </>
    </Columns>;
}
