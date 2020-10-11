import { TextChat } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { useCallback, useState } from "react";
import { ChatDescriptor } from "../classes/Chat";
import useConference from "./useConference";
import useDataSubscription from "./useDataSubscription";
import useMaybeChat from "./useMaybeChat";
import useSafeAsync from "./useSafeAsync";

export default function useChats(): Array<ChatDescriptor> | null {
    const [allChats, setChats] = useState<Array<TextChat> | null>(null);
    const [allChatDescriptors, setChatDescriptors] = useState<Array<ChatDescriptor> | null>(null);
    const mChat = useMaybeChat();
    const conference = useConference();

    useSafeAsync(async () => await TextChat.getAll(conference.id), setChats, [conference.id]);

    const onChatsUpdated = useCallback(async function _onChatsUpdated(ev: DataUpdatedEventDetails<"TextChat">) {
        setChats(existing => {
            const updated = Array.from(existing ?? []);
            const idx = updated?.findIndex(x => x.id === ev.object.id);
            let item = ev.object as TextChat;
            if (idx === -1) {
                updated.push(item);
            } else {
                updated.splice(idx, 1, item);
            }
            return updated;
        });
    }, []);

    const onChatsDeleted = useCallback(function _onChatsDeleted(ev: DataDeletedEventDetails<"TextChat">) {
        setChats(existing => (existing ?? []).filter(item => item.id !== ev.objectId));
    }, []);

    useDataSubscription("TextChat", onChatsUpdated, onChatsDeleted, !allChats, conference);

    useSafeAsync(async () => {
        if (!mChat || !allChats) {
            return null;
        }
        return Promise.all(allChats?.map(async chat => await mChat.getChat(chat.id)));
    }, setChatDescriptors, [mChat, allChats]);

    return allChatDescriptors;
}
