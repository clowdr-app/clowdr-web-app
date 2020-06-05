import Container from "@material-ui/core/Container";
import useHeight from "clowdr-video-frontend/lib/hooks/useHeight/useHeight";
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import clsx from 'clsx';

import useRoomState from "clowdr-video-frontend/lib/hooks/useRoomState/useRoomState";
import MenuBar from "clowdr-video-frontend/lib/components/MenuBar/MenuBar";
import Controls from "clowdr-video-frontend/lib/components/Controls/Controls";
import ConnectTriggeringLocalVideoPreview from "clowdr-video-frontend/lib/components/LocalVideoPreview/ConnectTriggeringLocalVideoPreview"
import ReconnectingNotification
    from "clowdr-video-frontend/lib/components/ReconnectingNotification/ReconnectingNotification";
import Room from "clowdr-video-frontend/lib/components/Room/Room";
import {styled} from "@material-ui/core";
import React, {Component} from "react";
import Grid from '@material-ui/core/Grid';

import useVideoContext from "clowdr-video-frontend/lib/hooks/useVideoContext/useVideoContext";
import useParticipants from "clowdr-video-frontend/lib/hooks/useParticipants/useParticipants";
import useSelectedParticipant
    from "clowdr-video-frontend/lib/components/VideoProvider/useSelectedParticipant/useSelectedParticipant";
import ParticipantConnectionIndicator
    from "clowdr-video-frontend/lib/components/ParticipantInfo/ParticipantConnectionIndicator/ParticipantConnectionIndicator";
import NetworkQualityLevel from "clowdr-video-frontend/lib/components/NewtorkQualityLevel/NetworkQualityLevel";
import AudioLevelIndicator from "clowdr-video-frontend/lib/components/AudioLevelIndicator/AudioLevelIndicator";
import {ScreenShare, VideocamOff} from "@material-ui/icons";
import PinIcon from "clowdr-video-frontend/lib/components/ParticipantInfo/PinIcon/PinIcon";
import BandwidthWarning from "clowdr-video-frontend/lib/components/BandwidthWarning/BandwidthWarning";
import usePublications from "clowdr-video-frontend/lib/hooks/usePublications/usePublications";
import useParticipantNetworkQualityLevel
    from "clowdr-video-frontend/lib/hooks/useParticipantNetworkQualityLevel/useParticipantNetworkQualityLevel";
import useTrack from "clowdr-video-frontend/lib/hooks/useTrack/useTrack";
import useIsTrackSwitchedOff from "clowdr-video-frontend/lib/hooks/useIsTrackSwitchedOff/useIsTrackSwitchedOff";
import Publication from "clowdr-video-frontend/lib/components/Publication/Publication";
const Main = styled('main')({
    overflow: 'hidden',
});

const ParticipantContainer = styled('Grid')(({ theme }) => ({
    // position: 'relative',
    height: '80vh',
    // display: 'grid',
    flexGrow: 1,
    // gridTemplateColumns: `${theme.sidebarWidth}px 1fr`,
    gridTemplateAreas: '". participantList"',
    gridTemplateRows: '100%',
    spacing: 0,
    // [theme.breakpoints.down('xs')]: {
    //     gridTemplateAreas: '"participantList" "."',
    //     gridTemplateColumns: `auto`,
    //     gridTemplateRows: `calc(100% - ${theme.sidebarMobileHeight + 12}px) ${theme.sidebarMobileHeight + 6}px`,
    //     gridGap: '6px',
    // },
}));


export default function App() {
    const roomState = useRoomState();

    // Here we would like the height of the main container to be the height of the viewport.
    // On some mobile browsers, 'height: 100vh' sets the height equal to that of the screen,
    // not the viewport. This looks bad when the mobile browsers location bar is open.
    // We will dynamically set the height with 'window.innerHeight', which means that this
    // will look good on mobile browsers even after the location bar opens or closes.
    // const height = useHeight();

    return (
        <div>
            <MenuBar />
            <Main>
                {roomState === 'disconnected' ? <ConnectTriggeringLocalVideoPreview /> : <div>
                    <ParticipantStrip />
                </div>}
                <Controls />
            </Main>
            <ReconnectingNotification />
        </div>
    );
}

const ParticipantStripContainer = styled('aside')(({ theme }) => ({
    padding: '0.5em',
    overflowY: 'auto',
    [theme.breakpoints.down('xs')]: {
        overflowY: 'initial',
        overflowX: 'auto',
        padding: 0,
        display: 'flex',
    },
}));

const ScrollContainer = styled('div')(({ theme }) => ({
    [theme.breakpoints.down('xs')]: {
        display: 'flex',
    },
}));

function ParticipantStrip() {
    const {
        room: { localParticipant },
    } = useVideoContext();
    const participants = useParticipants();
    const [selectedParticipant, setSelectedParticipant] = useSelectedParticipant();
    // const height = useHeight();

    return (
        // <ParticipantStripContainer>
        //     <ScrollContainer>
        // <Container style={{ height }}>

        <Grid container spacing={0} style={{height: "80vh"}}>
            <Grid item xs={6}>
        <Participant
                    participant={localParticipant}
                    isSelected={selectedParticipant === localParticipant}
                    onClick={() => setSelectedParticipant(localParticipant)}
                /></Grid>
                {participants.map(participant => (
                    <Grid item xs={6}
                          key={participant.sid}
                    ><Participant
                        key={participant.sid}
                        participant={participant}
                        isSelected={selectedParticipant === participant}
                        enableScreenShare={true}
                        onClick={() => setSelectedParticipant(participant)}
                    /></Grid>
                ))}
        </Grid>
        // </ParticipantStripContainer>
    );
}

function Participant({
                         participant,
                         disableAudio,
                         enableScreenShare,
                         onClick,
                         isSelected,
                     }) {
    return (
        <ParticipantInfo participant={participant} onClick={onClick} isSelected={isSelected}>
            <ParticipantTracks participant={participant} disableAudio={disableAudio} enableScreenShare={enableScreenShare} />
        </ParticipantInfo>
    );
}

const useStyles = makeStyles((theme) =>
    createStyles({
        container: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            cursor: 'pointer',
            '& video': {
                filter: 'none',
            },
            '& svg': {
                stroke: 'black',
                strokeWidth: '0.8px',
            },
            [theme.breakpoints.down('xs')]: {
                height: theme.sidebarMobileHeight,
                marginRight: '3px',
                fontSize: '10px',
            },
        },
        isVideoSwitchedOff: {
            '& video': {
                filter: 'blur(4px) grayscale(1) brightness(0.5)',
            },
        },
        infoContainer: {
            position: 'absolute',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            padding: '0.4em',
            width: '100%',
            background: 'transparent',
        },
        hideVideo: {
            background: 'black',
        },
        identity: {
            background: 'rgba(0,0,0, 0.7)',
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
                        {participant.identity.substring(1 + participant.identity.indexOf(':'))}
                    </h4>
                    <NetworkQualityLevel qualityLevel={networkQualityLevel} />
                </div>
                <div>
                    <AudioLevelIndicator audioTrack={audioTrack} background="white" />
                    {!isVideoEnabled && <VideocamOff />}
                    {isScreenShareEnabled && <ScreenShare />}
                    {isSelected && <PinIcon />}
                </div>
            </div>
            {isVideoSwitchedOff && <BandwidthWarning />}
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