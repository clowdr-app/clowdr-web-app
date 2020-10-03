import clsx from 'clsx';

import useRoomState from "../VideoFrontend/hooks/useRoomState/useRoomState";
import React, { useEffect, useState } from "react";

import ConnectBridge from "../VideoFrontend/components/MenuBar/ConnectBridge";
import useVideoContext from "../VideoFrontend/hooks/useVideoContext/useVideoContext";
import useParticipants, { ParticipantWithSlot } from "../VideoFrontend/hooks/useParticipants/useParticipants";
import useSelectedParticipant
    from "../VideoFrontend/components/VideoProvider/useSelectedParticipant/useSelectedParticipant";
import ParticipantConnectionIndicator
    from "../VideoFrontend/components/ParticipantInfo/ParticipantConnectionIndicator/ParticipantConnectionIndicator";
import NetworkQualityLevel from "../VideoFrontend/components/NewtorkQualityLevel/NetworkQualityLevel";
import AudioLevelIndicator from "../VideoFrontend/components/AudioLevelIndicator/AudioLevelIndicator";
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
// import EndCallButton from "../VideoFrontend/components/Controls/EndCallButton/EndCallButton";
import { AudioTrack, Participant as TwilioParticipant, RemoteVideoTrack, LocalVideoTrack } from "twilio-video";
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner';
import { useAppState } from '../VideoFrontend/state';
import { DeviceSelector } from '../VideoFrontend/components/MenuBar/DeviceSelector/DeviceSelector';
import FlipCameraButton from '../VideoFrontend/components/MenuBar/FlipCameraButton/FlipCameraButton';
import ToggleFullscreenButton from '../VideoFrontend/components/MenuBar/ToggleFullScreenButton/ToggleFullScreenButton';
import { UserProfile } from '@clowdr-app/clowdr-db-schema';
import useConference from '../../../hooks/useConference';
import { makeCancelable } from '@clowdr-app/clowdr-db-schema/build/Util';

export default function App() {
    const roomState = useRoomState();
    const stateContext = useAppState();
    const videoContext = useVideoContext();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_roomName, setRoomName] = useState('');

    useEffect(() => {
        if (roomState === "disconnected") {
            if (videoContext.isConnecting || !stateContext.token) {
                return;
            }

            videoContext.isConnecting = true;

            videoContext
                .connect(stateContext.token)
                .then(() => {
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

    let tmp: Array<ParticipantWithSlot> = [];
    tmp = tmp.concat(participants)
    // DEBUG: Create multiple copies of the local participant
    // const duplicates = 10;
    // for (let i = 0; i < duplicates; i++) {
    tmp.push({
        participant: localParticipant,
        slot: 0 // Slot 0 is reserved for local participant
    });
    // }


    const isReconnecting = roomState === 'reconnecting';
    const isUserActive = useIsUserActive();
    const showControls = isUserActive || roomState === 'disconnected';

    const [selectedParticipant, setSelectedParticipant] = useSelectedParticipant();
    const defaultPriority = "low";

    function participantSorter(x: ParticipantWithSlot, y: ParticipantWithSlot): number {
        return x.slot < y.slot ? -1 : x.slot === y.slot ? 0 : 1;
    }

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
                {tmp.filter(p => (p.participant !== selectedParticipant))
                    .sort(participantSorter)
                    .map((p, idx) =>
                        (<Participant
                            key={idx.toString() + p.participant.sid}
                            participant={p.participant}
                            isSelected={selectedParticipant === p.participant}
                            enableScreenShare={true}
                            priority={defaultPriority}
                            onClick={() => setSelectedParticipant(p.participant)}
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
                        {/*TODO: Clicking this breaks everything (inc. the sidebar updates): <EndCallButton />*/}
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
                    <UserDisplayName profileId={participant.identity} />
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

function UserDisplayName({ profileId }: { profileId: string }) {
    const conference = useConference();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    useEffect(() => {
        const p = makeCancelable(UserProfile.get(profileId, conference.id));
        p.promise.then(setProfile).catch(err => {
            if (!err.isCanceled) {
                throw err;
            }
        });
        return p.cancel;
    }, [conference.id, profileId]);
    return profile ? <>{profile.displayName}</> : <LoadingSpinner message="Loading name" />;
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
