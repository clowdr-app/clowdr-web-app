import {createStyles, makeStyles} from '@material-ui/core/styles';
import clsx from 'clsx';

import useRoomState from "clowdr-video-frontend/lib/hooks/useRoomState/useRoomState";
import MenuBar from "clowdr-video-frontend/lib/components/MenuBar/MenuBar";
import ConnectTriggeringLocalVideoPreview
    from "clowdr-video-frontend/lib/components/LocalVideoPreview/ConnectTriggeringLocalVideoPreview"
import ReconnectingNotification
    from "clowdr-video-frontend/lib/components/ReconnectingNotification/ReconnectingNotification";
import {styled} from "@material-ui/core";
import React, {useContext} from "react";
import Grid from '@material-ui/core/Grid';
import {Skeleton} from "antd"
import {PushpinFilled, PushpinOutlined} from "@ant-design/icons"

import useVideoContext from "clowdr-video-frontend/lib/hooks/useVideoContext/useVideoContext";
import useParticipants from "clowdr-video-frontend/lib/hooks/useParticipants/useParticipants";
import useSelectedParticipant
    from "clowdr-video-frontend/lib/components/VideoProvider/useSelectedParticipant/useSelectedParticipant";
import ParticipantConnectionIndicator
    from "clowdr-video-frontend/lib/components/ParticipantInfo/ParticipantConnectionIndicator/ParticipantConnectionIndicator";
import NetworkQualityLevel from "clowdr-video-frontend/lib/components/NewtorkQualityLevel/NetworkQualityLevel";
import AudioLevelIndicator from "clowdr-video-frontend/lib/components/AudioLevelIndicator/AudioLevelIndicator";
import {ScreenShare, VideocamOff} from "@material-ui/icons";
import usePublications from "clowdr-video-frontend/lib/hooks/usePublications/usePublications";
import useParticipantNetworkQualityLevel
    from "clowdr-video-frontend/lib/hooks/useParticipantNetworkQualityLevel/useParticipantNetworkQualityLevel";
import useTrack from "clowdr-video-frontend/lib/hooks/useTrack/useTrack";
import useIsTrackSwitchedOff from "clowdr-video-frontend/lib/hooks/useIsTrackSwitchedOff/useIsTrackSwitchedOff";
import Publication from "clowdr-video-frontend/lib/components/Publication/Publication";
import Masonry from "react-masonry-css";
import useIsUserActive from "clowdr-video-frontend/lib/components/Controls/useIsUserActive/useIsUserActive";
import ToggleAudioButton from "clowdr-video-frontend/lib/components/Controls/ToggleAudioButton/ToggleAudioButton";
import ToggleVideoButton from "clowdr-video-frontend/lib/components/Controls/ToggleVideoButton/ToggleVideoButton";
import ToggleScreenShareButton
    from "clowdr-video-frontend/lib/components/Controls/ToogleScreenShareButton/ToggleScreenShareButton";
import EndCallButton from "clowdr-video-frontend/lib/components/Controls/EndCallButton/EndCallButton";
import AuthUserContext from "../Session/context";
import useLocalTracks from "clowdr-video-frontend/lib/components/VideoProvider/useLocalTracks/useLocalTracks";

let backgroundImg = require('../../clowdr-background.jpg');
const Main = styled('main')({
    // overflow: 'hidden',
});

const ParticipantContainer = styled('Grid')(({theme}) => ({
    // position: 'relative',
    height: '80vh',
    // display: 'grid',
    flexGrow: 1,
    // gridTemplateColumns: `${theme.sidebarWidth}px 1fr`,
    gridTemplateAreas: '". participantList"',
    // gridTemplateRows: '100%',
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
            <MenuBar/>
            <Main>
                {roomState === 'disconnected' ? <ConnectTriggeringLocalVideoPreview/> : <div>
                    <ParticipantStrip/>
                </div>}
            </Main>
            <ReconnectingNotification/>
        </div>
    );
}


function ParticipantStrip() {
    const {
        room: {localParticipant},
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
    // const height = useHeight();o
    // let nImages = participants.length;
    let nImages = tmp.length; //don't forget +1 for you!
    // console.log(nImages)
    let defaultPriority = "low";
    let breakpointColumnsObj = {
        default: 4,
        1100: 3,
        700: 2,
        500: 1
    };
    if (nImages == 1) {
        breakpointColumnsObj = {
            default: 1
        }
    } else if (nImages == 2) {
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
        if (nImages == 1) {
            breakpointColumnsObj = {
                default: 1
            }
        } else if (nImages == 2) {
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
    if (selectedParticipant && !tmp.find(p => p.sid == selectedParticipant.sid)) {
        //selected is gone
        setSelectedParticipant(null);
    }

    return (
        // <ParticipantStripContainer>
        //     <ScrollContainer>
        // <Container style={{ height }}>

        <div style={{paddingLeft: "5px"}}>
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
                {/*{selectedParticipant == localParticipant ? "" : <Participant*/}
                {/*        participant={localParticipant}*/}
                {/*        isSelected={selectedParticipant === localParticipant}*/}
                {/*        onClick={() => setSelectedParticipant(localParticipant)}*/}
                {/*    />}*/}
                {tmp.filter((participant) => (participant != selectedParticipant))
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

            <div className={clsx(classes.controlsContainer, {showControls})}>
                <ToggleAudioButton disabled={isReconnecting}/>
                <ToggleVideoButton disabled={isReconnecting}/>
                {roomState !== 'disconnected' && (
                    <>
                        <ToggleScreenShareButton disabled={isReconnecting}/>
                        <EndCallButton/>
                    </>
                )}
            </div>
        </div>
        // </ParticipantStripContainer>
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
    const publications = usePublications(participant);
    const audioPublication = publications.find(p => p.kind === 'audio');
    const videoPublication = publications.find(p => p.trackName.includes('camera'));

    /*
       const justListening = (audioPublication == null && videoPublication == null);
           <div>
               showWhenJustListening = {showWhenJustListening.toString()} <br/>
               audioPublication = { audioPublication != null ? audioPublication.toString() : "null"} <br/>
               videoPublication = { videoPublication != null ? videoPublication.toString() : "null"} <br/>
               {justListening ? "Just listening!" : ""}
             */
    return <ParticipantInfo participant={participant} onClick={onClick} isSelected={isSelected}>
        <ParticipantTracks participant={participant} disableAudio={disableAudio}
                           enableScreenShare={enableScreenShare} videoPriority={priority}/>
    </ParticipantInfo>;
    /*
            </div>;
            */
}

const useStyles = makeStyles((theme) =>
    createStyles({
        container: {
            // position: 'relative',
            // display: 'flex',
            // alignItems: 'stretch',
            // overflow: 'hidden',
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
                // height: theme.sidebarMobileHeight,
                // marginRight: '3px',
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
            // background: 'black',
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

class UserProfileDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.state = {name: this.props.id, loading: true};
    }

    async componentDidMount() {
        let profile = await this.props.clowdrAppState.helpers.getUserRecord(this.props.id);
        if (profile)
            this.setState({name: profile.get("displayName"), loading: false});

    }

    render() {
        if (this.state.loading) {
            return <Skeleton.Input active style={{width: '200px'}}/>
        }
        return <span>{this.state.name}</span>
    }
}

function ParticipantInfo({participant, onClick, isSelected, children}) {
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

    const clowdrAppState = useContext(AuthUserContext);
    let name = participant.identity;

    return (
        <div
            className={clsx(classes.container, {
                [classes.isVideoSwitchedOff]: isVideoSwitchedOff,
            })}
            onClick={onClick}
            data-cy-participant={participant.identity}
        >
            <div className={clsx(classes.infoContainer, {[classes.hideVideo]: !isVideoEnabled})}>
                <div className={classes.infoRow}>
                    <h4 className={classes.identity}>
                        <ParticipantConnectionIndicator participant={participant}/>
                        <UserProfileDisplay clowdrAppState={clowdrAppState} id={participant.identity}/>
                    </h4>
                    <NetworkQualityLevel qualityLevel={networkQualityLevel}/>
                </div>
                <div>
                    <AudioLevelIndicator audioTrack={audioTrack} background="white"/>
                    {!isVideoEnabled && <VideocamOff/>}
                    {isScreenShareEnabled && <ScreenShare/>}
                    {isSelected ? <PushpinFilled/> : <PushpinOutlined/>}
                </div>
            </div>
            {/*{isVideoSwitchedOff && <BandwidthWarning />}*/}
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
    const {room} = useVideoContext();
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
