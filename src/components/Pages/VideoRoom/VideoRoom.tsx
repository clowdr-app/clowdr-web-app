import React, { useState } from "react";
import useHeading from "../../../hooks/useHeading";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import VideoGrid from "../../Video/VideoGrid/VideoGrid";
import "./VideoRoom.scss";
import SplitterLayout from "react-splitter-layout";
import "react-splitter-layout/lib/index.css";

interface Props {
    roomId: string;
}

export default function VideoRoom(props: Props) {
    const [size, setSize] = useState(30);

    useHeading("Video Room Y");

    return <div className="video-room">
        <SplitterLayout
            vertical={true}
            percentage={true}
            ref={component => { component?.setState({ secondaryPaneSize: size }) }}
            onSecondaryPaneSizeChange={newSize => setSize(newSize)}
        >
            <div className="split top-split">
                <VideoGrid room={props.roomId} />
                <button onClick={() => setSize(100)}>
                    &#9650;
                </button>
            </div>
            <div className="split bottom-split">
                <button onClick={() => setSize(0)}>
                    &#9660;
                </button>
                <ChatFrame chatSid="TODO" />
            </div>
        </SplitterLayout>
    </div>;
}
