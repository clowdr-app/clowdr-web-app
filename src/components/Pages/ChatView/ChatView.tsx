import React, { useEffect } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";

interface Props {
    chatId: string;
}

export default function ChatView(props: Props) {
    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Chat Room X");
    }, [docTitle]);
    return <>
        <ChatFrame chatId={props.chatId} />
    </>;
}