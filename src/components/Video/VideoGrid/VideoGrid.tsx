import React from "react";
import { VideoRoom } from "@clowdr-app/clowdr-db-schema";
import "./VideoGrid.scss";

interface Props {
    room: string | VideoRoom;
}

export default function VideoGrid(props: Props) {
    // TODO: Two stages: 1. Ask camera/mic on/off, 2. Show the video grid

    // Why do we do the ask here? Because VideoGrids can be embedded as Content
    // Feeds in lots of different places, so it's convenient to handle the join
    // procedure consistently here.

    return <div className="video-grid">
        VIDEO GRID {typeof props.room === "string" ? props.room : props.room.id}
    </div>;
}
