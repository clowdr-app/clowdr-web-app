import React, { useState } from "react";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useMaybeChat from "../../../hooks/useMaybeChat";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import { computeChatDisplayName, upgradeChatDescriptor } from "../../Sidebar/Sidebar";
import "./ChatView.scss";

interface Props {
    chatId: string;
}

export default function ChatView(props: Props) {
    const conf = useConference();
    const mUser = useUserProfile();
    const mChat = useMaybeChat();
    const [chatName, setChatName] = useState<string>("Chat");
    useHeading(chatName);

    useSafeAsync(async () => {
        if (mChat) {
            const chatD = await mChat.getChat(props.chatId);
            const chatSD = await upgradeChatDescriptor(conf, chatD);
            const { friendlyName, skip } = computeChatDisplayName(chatSD, mUser);
            return skip ? "Chat" : friendlyName;
        }
        else {
            return "Chat";
        }
    }, setChatName, [props.chatId, mChat]);

    const chat = <ChatFrame chatSid={props.chatId} />;

    // TODO: Action buttons / members view / etc
    // TODO: Start/stop watching action button

    // TODO: memberAdded
    // TODO: memberRemoved
    // TODO: memberUpdated

    return <div className="chat-view">
        {chat}
    </div>;
}
