import React from "react";
import { VideoRoom } from "@clowdr-app/clowdr-db-schema";
import "./VideoGrid.scss";

interface Props {
    room: string | VideoRoom;
}

export default function VideoGrid(props: Props) {
    return <div className="video-grid">
        VIDEO GRID {typeof props.room === "string" ? props.room : props.room.id}
    </div>;
}
