import React, { useState } from "react";
import { VideoRoom } from "@clowdr-app/clowdr-db-schema";
import "./VideoGrid.scss";
import Toggle from "react-toggle";
import AsyncButton from "../../AsyncButton/AsyncButton";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import useMaybeVideo from "../../../hooks/useMaybeVideo";
import { addError } from "../../../classes/Notifications/Notifications";

interface Props {
    room: VideoRoom;
}

export default function VideoGrid(props: Props) {
    // TODO: Two stages: 1. Ask camera/mic on/off, 2. Show the video grid

    // Why do we do the ask here? Because VideoGrids can be embedded as Content
    // Feeds in lots of different places, so it's convenient to handle the join
    // procedure consistently here.

    const mVideo = useMaybeVideo();
    const [enteringRoom, setEnteringRoom] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(null);
    const [shouldEnableMic, setShouldEnableMic] = useState<boolean>(false);
    const [shouldEnableCam, setShouldEnableCam] = useState<boolean>(true);

    const enableMicEl = <>
        <label htmlFor="enable-mic">Enable microphone?</label>
        <Toggle
            name="enable-mic"
            defaultChecked={shouldEnableMic}
            onChange={(ev) => setShouldEnableMic(ev.target.checked)}
            icons={{ checked: <i className="fas fa-microphone"></i>, unchecked: <i className="fas fa-microphone-slash"></i> }}
        />
    </>;
    const enableCamEl = <>
        <label htmlFor="enable-cam">Enable camera?</label>
        <Toggle
            name="enable-cam"
            defaultChecked={shouldEnableCam}
            onChange={(ev) => setShouldEnableCam(ev.target.checked)}
            icons={{ checked: <i className="fas fa-video"></i>, unchecked: <i className="fas fa-video-slash"></i>}}
        />
    </>;
    const enterButton =
        <AsyncButton action={(ev) => enterRoom(ev)} content="Enter the room" disabled={!mVideo} />;

    async function enterRoom(ev: React.FormEvent) {
        setEnteringRoom(true);
        const _token = await mVideo?.fetchFreshToken(props.room);
        // TODO: Handle the expiry time
        if (_token) {
            setToken(_token.token);
        }
        else {
            setToken(null);
            addError("Sorry, we were unable to initialise a connection to this room at the moment. Please try again in a few moments or contact your conference organiser.");
        }
    }

    // TODO: Camera/microphone preview/test prior to entering the room

    return token
        ? <div className="video-grid">
            VIDEO GRID {props.room.id}
        </div>
        : enteringRoom
        ? <LoadingSpinner message="Entering room, please wait" />
        : <div className="enter-room-choices">
            <p className="main-message">
                You are about to enter a video room.
                Please choose your initial camera and microphone states.
                You can turn your video and microphone on or off (independently) at any time.
                To leave the room at any time, simply navigate to a different page or close your web-browser's tab.
            </p>
            <p className="no-preview-message">
                Clowdr is currently unable to provide a preview of your mic/camera. This feature
                will be added at our earliest opportunity.
            </p>
            <form onSubmit={(ev) => enterRoom(ev)}>
                {enableMicEl}
                {enableCamEl}
                {!!mVideo ? enterButton : <LoadingSpinner message="Video service initialising, please wait" />}
            </form>
        </div>;
}
