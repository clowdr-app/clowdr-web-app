import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { removeNull } from "@clowdr-app/clowdr-db-schema/build/Util";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChatDescriptor } from "../../../classes/Chat";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import Column, { DefaultItemRenderer, Item as ColumnItem } from "../../Columns/Column/Column";
import Columns from "../../Columns/Columns";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./AllChats.scss";

type Rendered1to1Chat = {
    dmExists: boolean,
    name: string,
    el: JSX.Element
};

export default function ChatView() {
    useHeading("All Chats");

    const conference = useConference();
    const mChat = useMaybeChat();
    const currentProfile = useUserProfile();
    const [allProfiles, setAllProfiles] = useState<Array<UserProfile> | null>(null);
    const [allTwilioChats, setAllChats] = useState<Array<ChatDescriptor> | null>(null);

    useSafeAsync(async () => UserProfile.getAll(conference.id), setAllProfiles, [conference.id]);
    useSafeAsync(async () => mChat ? mChat.listAllChats() : null, setAllChats, [mChat]);

    const dmChatItems: ColumnItem[] = removeNull(allTwilioChats
        ?.filter(chat =>
            chat.isDM &&
            chat.friendlyName.includes(currentProfile.id))
        ?.map(chat => {
            const profile = allProfiles?.find(profile => chat.friendlyName.includes(profile.id));
            return profile
                ? {
                    text: profile.displayName,
                    link: `/chat/${chat.id}`,
                } as ColumnItem
                : null;
        }) ?? []);

    const allOtherUserItems: ColumnItem[] = allProfiles
        ?.filter(profile => !allTwilioChats
            ?.some(chat => chat.isDM && chat.friendlyName.includes(currentProfile.id)))
        ?.map(profile => {
            return {
                text: profile.displayName,
                link: `/chat/new/${profile.id}`,
            } as ColumnItem
        }) ?? [];

    const allOtherChatsItems: ColumnItem[] = allTwilioChats
        ?.filter(chat => !chat.isDM)
        ?.map(chat => {
            return {
                text: chat.friendlyName,
                link: `/chat/${chat.id}`,
            } as ColumnItem
        }) ?? [];

    return <Columns className="all-chats">
        <>
            <Column
                className="col"
                items={dmChatItems}
                itemRenderer={new DefaultItemRenderer()}
                loadingMessage="Loading direct messages">
                <h4>Direct messages</h4>
            </Column>
            <Column
                className="col"
                items={allOtherUserItems}
                itemRenderer={new DefaultItemRenderer()}
                loadingMessage="Loading users">
                <h4>Users</h4>
            </Column>
            <Column
                className="col"
                items={allOtherChatsItems}
                itemRenderer={new DefaultItemRenderer()}
                loadingMessage="Loading chats">
                <h4>Chats</h4>
            </Column>
        </>
    </Columns>;
}
