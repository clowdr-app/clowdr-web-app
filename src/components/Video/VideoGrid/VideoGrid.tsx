import React from "react";
import "./VideoGrid.scss";

interface Props {
    roomId: string;
}

export default function BreakoutRoom(props: Props) {
    return <div className="video-grid">
        VIDEO GRID {props.roomId}
    </div>;
}