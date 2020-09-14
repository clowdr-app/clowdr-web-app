import React, { useEffect, useState } from "react";
import useDocTitle from "../../../hooks/useDocTitle";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import VideoGrid from "../../Video/VideoGrid/VideoGrid";
import "./BreakoutRoom.scss";
import SplitPane, { Size } from "react-split-pane";

export default function BreakoutRoom() {
    const [split, setSplit] = useState<Size>("70%");

    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Breakout Room Y");
    }, [docTitle]);
    return <div className="breakout-room">
        <SplitPane split="horizontal" size={split} onChange={(size: Size) => setSplit(size)}>
            <div className="top-split">
                <VideoGrid />
                <button
                    className="maximize-button"
                    onClick={() => setSplit(0)}
                >
                    &#9650;
                </button>
            </div>
            <div className="bottom-split">
                <button
                    className="minimize-button"
                    onClick={() => setSplit("100%")}
                >
                    &#9660;
                </button>
                <ChatFrame chatId="TODO" />
            </div>
        </SplitPane>
    </div>;
}