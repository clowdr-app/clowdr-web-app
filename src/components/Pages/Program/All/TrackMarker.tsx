import { ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import React from "react";

interface Props {
    track: ProgramTrack | string;
    small?: boolean;
}

export default function TrackMarker(props: Props) {
    return <svg
        className={`track-marker${props.small ? " small" : ""}`}
    >
        <circle cx="50%" cy="50%" r={props.small ? 5 : 10} fill={typeof props.track === "string" ? props.track : props.track.colour} />
    </svg>;
}
