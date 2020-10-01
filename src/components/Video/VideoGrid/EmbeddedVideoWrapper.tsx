import clsx from 'clsx';

import useRoomState from "../VideoFrontend/hooks/useRoomState/useRoomState";
import React, { useEffect, useState } from "react";

import ConnectBridge from "../VideoFrontend/components/MenuBar/ConnectBridge";
import useVideoContext from "../VideoFrontend/hooks/useVideoContext/useVideoContext";
import useParticipants from "../VideoFrontend/hooks/useParticipants/useParticipants";
import useSelectedParticipant
    from "../VideoFrontend/components/VideoProvider/useSelectedParticipant/useSelectedParticipant";
import ParticipantConnectionIndicator
    from "../VideoFrontend/components/ParticipantInfo/ParticipantConnectionIndicator/ParticipantConnectionIndicator";
import NetworkQualityLevel from "../VideoFrontend/components/NewtorkQualityLevel/NetworkQualityLevel";
import AudioLevelIndicator from "../VideoFrontend/components/AudioLevelIndicator/AudioLevelIndicator";
import { ScreenShare, VideocamOff } from "@material-ui/icons";
import usePublications from "../VideoFrontend/hooks/usePublications/usePublications";
import useParticipantNetworkQualityLevel
    from "../VideoFrontend/hooks/useParticipantNetworkQualityLevel/useParticipantNetworkQualityLevel";
import useTrack from "../VideoFrontend/hooks/useTrack/useTrack";
import useIsTrackSwitchedOff from "../VideoFrontend/hooks/useIsTrackSwitchedOff/useIsTrackSwitchedOff";
import Publication from "../VideoFrontend/components/Publication/Publication";
import useIsUserActive from "../VideoFrontend/components/Controls/useIsUserActive/useIsUserActive";
import ToggleAudioButton from "../VideoFrontend/components/Controls/ToggleAudioButton/ToggleAudioButton";
import ToggleVideoButton from "../VideoFrontend/components/Controls/ToggleVideoButton/ToggleVideoButton";
import ToggleScreenShareButton
    from "../VideoFrontend/components/Controls/ToogleScreenShareButton/ToggleScreenShareButton";
import EndCallButton from "../VideoFrontend/components/Controls/EndCallButton/EndCallButton";
import { AudioTrack, Participant as TwilioParticipant, RemoteVideoTrack, LocalVideoTrack } from "twilio-video";
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner';
import { useAppState } from '../VideoFrontend/state';
import { DeviceSelector } from '../VideoFrontend/components/MenuBar/DeviceSelector/DeviceSelector';
import FlipCameraButton from '../VideoFrontend/components/MenuBar/FlipCameraButton/FlipCameraButton';
import ToggleFullscreenButton from '../VideoFrontend/components/MenuBar/ToggleFullScreenButton/ToggleFullScreenButton';

export default function App() {
    const roomState = useRoomState();
    const stateContext = useAppState();
    const videoContext = useVideoContext();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_roomName, setRoomName] = useState('');

    useEffect(() => {
        console.log(`Room state: ${roomState}`);
        if (roomState === "disconnected") {
            if (videoContext.isConnecting || !stateContext.token) {
                return;
            }

            videoContext.isConnecting = true;

            // tslint:disable-next-line:no-console
            console.log('Attempting to connect video context...');

            videoContext
                .connect(stateContext.token)
                .then(() => {
                    // tslint:disable-next-line:no-console
                    console.log('Video context connected.');

                    if (videoContext.onConnect) {
                        videoContext.onConnect();
                    }
                })
                .catch(err => videoContext.onError);
        }
    }, [roomState, stateContext.token, videoContext.isConnecting, videoContext]);

    return <>
        <ConnectBridge videoContext={videoContext} setRoomName={setRoomName} />
        {roomState === "disconnected"
            ? <LoadingSpinner message="Connecting" />
            : <ParticipantStrip />
        }
    </>;
}


function ParticipantStrip() {
    const {
        room: { localParticipant },
    } = useVideoContext();
    const participants = useParticipants();
    const roomState = useRoomState();

    let tmp: Array<TwilioParticipant> = [];
    tmp = tmp.concat(participants)
    // DEBUG: Create multiple copies of the local participant
    // const duplicates = 10;
    // for (let i = 0; i < duplicates; i++) {
    tmp.push(localParticipant);
    // }


    const isReconnecting = roomState === 'reconnecting';
    const isUserActive = useIsUserActive();
    const showControls = isUserActive || roomState === 'disconnected';

    const [selectedParticipant, setSelectedParticipant] = useSelectedParticipant();
    const defaultPriority = "low";

    return (
        <>
            <div className="videos">
                {selectedParticipant ? <Participant
                    key={selectedParticipant.sid}
                    participant={selectedParticipant}
                    isSelected={true}
                    enableScreenShare={true}
                    priority={"high"}
                    onClick={() => setSelectedParticipant(selectedParticipant)}
                /> : ""}
                {// TODO: Create a stable ordering
                    tmp.filter((participant) => (participant !== selectedParticipant))
                    .sort((x, y) => x.identity.localeCompare(y.identity))
                    .map((participant, idx) =>
                        (<Participant
                            key={"" + idx + participant.sid}
                            participant={participant}
                            isSelected={selectedParticipant === participant}
                            enableScreenShare={true}
                            priority={defaultPriority}
                            onClick={() => setSelectedParticipant(participant)}
                        />
                        ))}
            </div>

            <div className={clsx("controls", { showControls })}>
                <DeviceSelector />
                <FlipCameraButton />
                <ToggleAudioButton disabled={isReconnecting} />
                <ToggleVideoButton disabled={isReconnecting} />
                {roomState !== 'disconnected' && (
                    <>
                        <ToggleScreenShareButton disabled={isReconnecting} />
                        <EndCallButton />
                        <ToggleFullscreenButton />
                        {/* TODO: <ReportToModsButton room={this.state.room} /> */}
                    </>
                )}
            </div>
        </>
    );
}

function Participant({
    participant,
    disableAudio,
    enableScreenShare,
    onClick,
    isSelected,
    priority,
}: {
    participant: TwilioParticipant,
    disableAudio?: boolean,
    enableScreenShare: boolean,
    onClick: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
    isSelected: boolean,
    priority: "low" | "standard" | "high" | null | undefined
}) {
    return <ParticipantInfo participant={participant} onClick={onClick} isSelected={isSelected}>
        <ParticipantTracks participant={participant} disableAudio={disableAudio}
            enableScreenShare={enableScreenShare} videoPriority={priority} />
    </ParticipantInfo>;
}

function ParticipantInfo(
    { participant, onClick, isSelected, children }: {
        participant: TwilioParticipant,
        onClick: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
        isSelected: boolean,
        children: JSX.Element
    }) {
    const publications = usePublications(participant);

    const audioPublication = publications.find(p => p.kind === 'audio');
    const videoPublication = publications.find(p => p.trackName.includes('camera'));

    const networkQualityLevel = useParticipantNetworkQualityLevel(participant);
    const isVideoEnabled = Boolean(videoPublication);
    const isScreenShareEnabled = publications.find(p => p.trackName.includes('screen'));

    const videoTrack = useTrack(videoPublication) as RemoteVideoTrack | LocalVideoTrack | undefined | null;
    const isVideoSwitchedOff = useIsTrackSwitchedOff(videoTrack);

    const audioTrack = useTrack(audioPublication) as AudioTrack | undefined;

    return (
        <div
            className={clsx("participant",
                isSelected ? "selected" : "",
                (isVideoSwitchedOff || !isVideoEnabled) ? "videoOff" : "")}
            onClick={onClick}
            data-cy-participant={participant.identity}
        >
            <div className="border-provider"></div>
            <div className="infoContainer">
                <h4 className="identity">
                    <LoadingSpinner message="Loading name" />
                    {/* TODO: <UserStatusDisplay inline={true} profileID={participant.identity} /> */}
                </h4>
                <ParticipantConnectionIndicator participant={participant} />
                <AudioLevelIndicator audioTrack={audioTrack} background="white" />
                <NetworkQualityLevel qualityLevel={networkQualityLevel} />
            </div>
            {children}
        </div>
    );
}

function ParticipantTracks({
    participant,
    disableAudio,
    enableScreenShare,
    videoPriority,
}: {
    participant: TwilioParticipant,
    disableAudio?: boolean,
    enableScreenShare: boolean,
    videoPriority: "low" | "standard" | "high" | null | undefined
}) {
    const { room } = useVideoContext();
    // eslint-disable-next-line no-undef
    const publications = usePublications(participant);
    // eslint-disable-next-line no-undef
    const isLocal = participant === room.localParticipant;

    let filteredPublications;

    if (enableScreenShare && publications.some(p => p.trackName.includes('screen'))) {
        filteredPublications = publications.filter(p => !p.trackName.includes('camera'));
    } else {
        filteredPublications = publications.filter(p => !p.trackName.includes('screen'));
    }

    return (
        <>
            {filteredPublications.map(publication => (
                <Publication
                    key={publication.kind}
                    publication={publication}
                    participant={participant}
                    isLocal={isLocal}
                    disableAudio={disableAudio}
                    videoPriority={videoPriority}
                />
            ))}
        </>
    );
}
