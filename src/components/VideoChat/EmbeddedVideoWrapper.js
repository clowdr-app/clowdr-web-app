import { createStyles, makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';

import useRoomState from "./VideoFrontend/hooks/useRoomState/useRoomState";
import ConnectBridge from "./VideoFrontend/components/MenuBar/ConnectBridge";
import ConnectTriggeringLocalVideoPreview
    from "./VideoFrontend/components/LocalVideoPreview/ConnectTriggeringLocalVideoPreview"
import ReconnectingNotification
    from "./VideoFrontend/components/ReconnectingNotification/ReconnectingNotification";
import { styled } from "@material-ui/core";
import React, { useState } from "react";
import { PushpinFilled, PushpinOutlined } from "@ant-design/icons"

import useVideoContext from "./VideoFrontend/hooks/useVideoContext/useVideoContext";
import useParticipants from "./VideoFrontend/hooks/useParticipants/useParticipants";
import useSelectedParticipant
    from "./VideoFrontend/components/VideoProvider/useSelectedParticipant/useSelectedParticipant";
import ParticipantConnectionIndicator
    from "./VideoFrontend/components/ParticipantInfo/ParticipantConnectionIndicator/ParticipantConnectionIndicator";
import NetworkQualityLevel from "./VideoFrontend/components/NewtorkQualityLevel/NetworkQualityLevel";
import AudioLevelIndicator from "./VideoFrontend/components/AudioLevelIndicator/AudioLevelIndicator";
import { ScreenShare, VideocamOff } from "@material-ui/icons";
import usePublications from "./VideoFrontend/hooks/usePublications/usePublications";
import useParticipantNetworkQualityLevel
    from "./VideoFrontend/hooks/useParticipantNetworkQualityLevel/useParticipantNetworkQualityLevel";
import useTrack from "./VideoFrontend/hooks/useTrack/useTrack";
import useIsTrackSwitchedOff from "./VideoFrontend/hooks/useIsTrackSwitchedOff/useIsTrackSwitchedOff";
import Publication from "./VideoFrontend/components/Publication/Publication";
import Masonry from "react-masonry-css";
import useIsUserActive from "./VideoFrontend/components/Controls/useIsUserActive/useIsUserActive";
import ToggleAudioButton from "./VideoFrontend/components/Controls/ToggleAudioButton/ToggleAudioButton";
import ToggleVideoButton from "./VideoFrontend/components/Controls/ToggleVideoButton/ToggleVideoButton";
import ToggleScreenShareButton
    from "./VideoFrontend/components/Controls/ToogleScreenShareButton/ToggleScreenShareButton";
import EndCallButton from "./VideoFrontend/components/Controls/EndCallButton/EndCallButton";
import UserStatusDisplay from "../Lobby/UserStatusDisplay";

const Main = styled('main')({
});

export default function App() {
    const roomState = useRoomState();
    const fullVideoContext = useVideoContext();
    const [setRoomName] = useState('');

    return (
        <div>
            <ConnectBridge videoContext={fullVideoContext} setRoomName={setRoomName} />
            <Main>
                {roomState === 'disconnected' ? <ConnectTriggeringLocalVideoPreview /> : <div>
                    <ParticipantStrip />
                </div>}
            </Main>
            <ReconnectingNotification />
        </div>
    );
}


function ParticipantStrip() {
    const {
        room: { localParticipant },
    } = useVideoContext();
    const participants = useParticipants();
    const classes = useStyles();
    const roomState = useRoomState();

    let tmp = [];
    tmp = tmp.concat(participants)
    // for(let i = 0; i < 10; i++){
    tmp.push(localParticipant);
    // }


    const isReconnecting = roomState === 'reconnecting';
    const isUserActive = useIsUserActive();
    const showControls = isUserActive || roomState === 'disconnected';

    const [selectedParticipant, setSelectedParticipant] = useSelectedParticipant();
    let nImages = tmp.length;
    let defaultPriority = "low";
    let breakpointColumnsObj = {
        default: 4,
        1100: 3,
        700: 2,
        500: 1
    };
    if (nImages === 1) {
        breakpointColumnsObj = {
            default: 1
        }
    } else if (nImages === 2) {
        breakpointColumnsObj = {
            default: 2,
            1200: 1
        };
    } else if (nImages <= 9) {
        breakpointColumnsObj = {
            default: 3,
            1100: 3,
            500: 3
        };
    } else if (nImages <= 16) {
        breakpointColumnsObj = {
            default: 4,
            1100: 4,
            500: 4
        }
    } else {
        breakpointColumnsObj = {
            default: 10,
            1100: 6,
            500: 4
        }
    }
    if (selectedParticipant) {
        breakpointColumnsObj = {
            default: 8,
            1100: 6,
            700: 4,
            500: 2
        };
        if (nImages === 1) {
            breakpointColumnsObj = {
                default: 1
            }
        } else if (nImages === 2) {
            breakpointColumnsObj = {
                default: 4,
                500: 2
            };
        } else if (nImages <= 8) {
            breakpointColumnsObj = {
                default: 5,
                1100: 3,
                500: 3
            };
        } else {
            breakpointColumnsObj = {
                default: 8
            }
        }
    }
    if (selectedParticipant && !tmp.find(p => p.sid === selectedParticipant.sid)) {
        //selected is gone
        setSelectedParticipant(null);
    }

    return (
        <div style={{ paddingLeft: "5px" }}>
            {selectedParticipant ? <Participant
                key={selectedParticipant.sid}
                participant={selectedParticipant}
                isSelected={true}
                enableScreenShare={true}
                priority={"high"}
                onClick={() => setSelectedParticipant(selectedParticipant)}
                showWhenJustListening={true}
            /> : ""}
            <Masonry breakpointCols={breakpointColumnsObj}
                className="video-masonry-grid" columnClassName="video-masonry-column">
                {tmp.filter((participant) => (participant !== selectedParticipant))
                    .map((participant, idx) =>
                        (<Participant
                            key={"" + idx + participant.sid}
                            participant={participant}
                            isSelected={selectedParticipant === participant}
                            enableScreenShare={true}
                            priority={defaultPriority}
                            onClick={() => setSelectedParticipant(participant)}
                            showWhenJustListening={false}
                        />
                        ))}
            </Masonry>

            <div className={clsx(classes.controlsContainer, { showControls })}>
                <ToggleAudioButton disabled={isReconnecting} />
                <ToggleVideoButton disabled={isReconnecting} />
                {roomState !== 'disconnected' && (
                    <>
                        <ToggleScreenShareButton disabled={isReconnecting} />
                        <EndCallButton />
                    </>
                )}
            </div>
        </div>
    );
}

function Participant({
    participant,
    disableAudio,
    enableScreenShare,
    onClick,
    isSelected,
    priority,
    showWhenJustListening,
}) {
    return <ParticipantInfo participant={participant} onClick={onClick} isSelected={isSelected}>
        <ParticipantTracks participant={participant} disableAudio={disableAudio}
            enableScreenShare={enableScreenShare} videoPriority={priority} />
    </ParticipantInfo>;
}

const useStyles = makeStyles((theme) =>
    createStyles({
        container: {
            cursor: 'pointer',
            '& video': {
                filter: 'none',
            },
            '& svg': {
                stroke: 'black',
                strokeWidth: '0.8px',
            },
            border: "1px solid black",
            [theme.breakpoints.down('xs')]: {
                fontSize: '10px',
            },
        },
        isVideoSwitchedOff: {
            '& video': {
                filter: 'blur(4px) grayscale(1) brightness(0.5)',
            },
        },
        infoContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0.4em',
            background: 'transparent',
        },
        hideVideo: {
        },
        identity: {
            fontSize: '12px',
            padding: '0.1em 0.3em',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
        },
        controlsContainer: {
            display: 'flex',
            position: 'sticky',
            bottom: 0,
            transition: 'opacity 1.2s, transform 1.2s, visibility 0s 1.2s',
            opacity: 0,
            visibility: 'hidden',
            maxWidth: 'min-content',
            '&.showControls, &:hover': {
                transition: 'opacity 0.6s, transform 0.6s, visibility 0s',
                opacity: 1,
                visibility: 'visible',
                transform: 'translate(50%, 0px)',
            },
            [theme.breakpoints.down('xs')]: {
                bottom: `${theme.sidebarMobileHeight + 3}px`,
            },
        },
    })
);

function ParticipantInfo({ participant, onClick, isSelected, children }) {
    const publications = usePublications(participant);

    const audioPublication = publications.find(p => p.kind === 'audio');
    const videoPublication = publications.find(p => p.trackName.includes('camera'));

    const networkQualityLevel = useParticipantNetworkQualityLevel(participant);
    const isVideoEnabled = Boolean(videoPublication);
    const isScreenShareEnabled = publications.find(p => p.trackName.includes('screen'));

    const videoTrack = useTrack(videoPublication);
    const isVideoSwitchedOff = useIsTrackSwitchedOff(videoTrack);

    const audioTrack = useTrack(audioPublication);

    const classes = useStyles();

    return (
        <div
            className={clsx(classes.container, {
                [classes.isVideoSwitchedOff]: isVideoSwitchedOff,
            })}
            onClick={onClick}
            data-cy-participant={participant.identity}
        >
            <div className={clsx(classes.infoContainer, { [classes.hideVideo]: !isVideoEnabled })}>
                <div className={classes.infoRow}>
                    <h4 className={classes.identity}>
                        <ParticipantConnectionIndicator participant={participant} />
                        <UserStatusDisplay inline={true} profileID={participant.identity} />
                    </h4>
                    <NetworkQualityLevel qualityLevel={networkQualityLevel} />
                </div>
                <div>
                    <AudioLevelIndicator audioTrack={audioTrack} background="white" />
                    {!isVideoEnabled && <VideocamOff />}
                    {isScreenShareEnabled && <ScreenShare />}
                    {isSelected ? <PushpinFilled /> : <PushpinOutlined />}
                </div>
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
}) {
    const { room } = useVideoContext();
    const publications = usePublications(participant);
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
