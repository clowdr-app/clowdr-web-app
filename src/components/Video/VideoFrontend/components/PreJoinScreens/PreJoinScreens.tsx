import React from "react";
import DeviceSelectionScreen from "./DeviceSelectionScreen/DeviceSelectionScreen";
import IntroContainer from "../IntroContainer/IntroContainer";
import { VideoRoom } from "@clowdr-app/clowdr-db-schema";

export default function PreJoinScreens(props: { room: VideoRoom; setMediaError?(error: Error): void }) {
    return (
        <IntroContainer>
            <DeviceSelectionScreen room={props.room} setMediaError={props.setMediaError} />
        </IntroContainer>
    );
}
