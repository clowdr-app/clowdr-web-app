import React, { useState } from "react";
import useHeading from "../../../hooks/useHeading";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import VideoGrid from "../../Video/VideoGrid/VideoGrid";
import "./VideoRoom.scss";
import SplitterLayout from "react-splitter-layout";
import "react-splitter-layout/lib/index.css";
import { TextChat, VideoRoom } from "@clowdr-app/clowdr-db-schema";
import useConference from "../../../hooks/useConference";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";

interface Props {
    roomId: string;
}

export default function ViewVideoRoom(props: Props) {
    const conference = useConference();
    const [size, setSize] = useState(30);
    const [room, setRoom] = useState<VideoRoom | null>(null);
    const [chat, setChat] = useState<TextChat | "not present" | null>(null);

    useSafeAsync(
        async () => await VideoRoom.get(props.roomId, conference.id),
        setRoom,
        [props.roomId, conference.id]);
    useSafeAsync(
        async () => room ? ((await room.textChat) ?? "not present") : null,
        setChat,
        [room]);

    useHeading(room?.name ?? "Room");

    return <div className="video-room">
        <SplitterLayout
            vertical={true}
            percentage={true}
            ref={component => { component?.setState({ secondaryPaneSize: size }) }}
            onSecondaryPaneSizeChange={newSize => setSize(newSize)}
        >
            <div className="split top-split">
                {room ? <VideoGrid room={room} /> : <LoadingSpinner />}
                <button onClick={() => setSize(100)}>
                    &#9650;
                </button>
            </div>
            <div className="split bottom-split">
                <button onClick={() => setSize(0)}>
                    &#9660;
                </button>
                {chat ? chat !== "not present" ? <ChatFrame chatSid={chat.twilioID} /> : <>This room does not have a chat.</> : <LoadingSpinner />}
            </div>
        </SplitterLayout>
    </div>;
}
