import React, { useState } from "react";
import { VideoRoom } from "@clowdr-app/clowdr-db-schema";
import "./VideoGrid.scss";
import Toggle from "react-toggle";
import AsyncButton from "../../AsyncButton/AsyncButton";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import useMaybeVideo from "../../../hooks/useMaybeVideo";
import { addError } from "../../../classes/Notifications/Notifications";
import { Tag } from "@primer/octicons-react";
import Tooltip from "material-ui/internal/Tooltip";
import { MuiThemeProvider } from "@material-ui/core/styles";
import { DeviceSelector } from "../VideoFrontend/components/MenuBar/DeviceSelector/DeviceSelector";
import FlipCameraButton from "../VideoFrontend/components/MenuBar/FlipCameraButton/FlipCameraButton";
import ToggleFullscreenButton from "../VideoFrontend/components/MenuBar/ToggleFullScreenButton/ToggleFullScreenButton";
import { VideoProvider, VideoContext } from "../VideoFrontend/components/VideoProvider";
import AppStateProvider from "../VideoFrontend/state";
import theme from "./theme";
import { useHistory } from "react-router-dom";
import { TwilioError, ConnectOptions } from "twilio-video";
import { isMobile } from "../VideoFrontend/utils";
import EmbeddedVideoWrapper from "./EmbeddedVideoWrapper";
import useLogger from "../../../hooks/useLogger";

interface Props {
    room: VideoRoom;
}

export default function VideoGrid(props: Props) {
    // TODO: Two stages: 1. Ask camera/mic on/off, 2. Show the video grid

    // Why do we do the ask here? Because VideoGrids can be embedded as Content
    // Feeds in lots of different places, so it's convenient to handle the join
    // procedure consistently here.

    const logger = useLogger("VideoGrid");
    const history = useHistory();
    const mVideo = useMaybeVideo();
    const [enteringRoom, setEnteringRoom] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(null);
    const [shouldEnableMic, setShouldEnableMic] = useState<boolean>(false);
    const [shouldEnableCam, setShouldEnableCam] = useState<boolean>(true);

    // TODO: Disable in production
    logger.enable();

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
            icons={{ checked: <i className="fas fa-video"></i>, unchecked: <i className="fas fa-video-slash"></i> }}
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

    // TODO: Capacity control
    // TODO: Ephemeral vs persistant message
    // TODO: Private vs public badge
    // TODO: Members/free spaces counters


    // Copied from old:
    // See:
    // for available connection options.https://media.twiliocdn.com/sdk/js/video/releases/2.0.0/docs/global.html#ConnectOptions
    const connectionOptions: ConnectOptions = {
        // Bandwidth Profile, Dominant Speaker, and Network Quality
        // features are only available in Small Group or Group Rooms.
        // Please set "Room Type" to "Group" or "Small Group" in your
        // Twilio Console: https://www.twilio.com/console/video/configure
        bandwidthProfile: {
            video: {
                mode: 'grid',
                maxTracks: 4,
                // dominantSpeakerPriority: 'standard',
                renderDimensions: {
                    high: { height: 720, width: 1080 },
                    standard: { height: 240, width: 320 },
                    low: { height: 176, width: 144 }
                },
            },
        },
        dominantSpeaker: false,
        networkQuality: { local: 1, remote: 1 },
        audio: shouldEnableMic,
        video: shouldEnableCam,

        // Comment this line if you are playing music.
        maxAudioBitrate: 16000,

        // VP8 simulcast enables the media server in a Small Group or Group Room
        // to adapt your encoded video quality for each RemoteParticipant based on
        // their individual bandwidth constraints. This has no effect if you are
        // using Peer-to-Peer Rooms.
        preferredVideoCodecs: [{ codec: 'VP8', simulcast: false }],

        // @ts-ignore
        onError: (err) => {
            addError("Unable to connect to video: unable to acquire browser permissions for camera " + err.toString());
        }
    };

    // For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
    if (isMobile && connectionOptions.bandwidthProfile?.video) {
        connectionOptions.bandwidthProfile.video.maxSubscriptionBitrate = 2500000;
        connectionOptions.video = { height: 480, frameRate: 24, width: 640 };
    }

    let videoGrid = <></>;

    function handleLogout() {
        history.push("/");
    }

    function onError(e: TwilioError) {
        logger.error("Twilio error", e);
        addError(e.message);
    }

    if (token) {
        videoGrid = <MuiThemeProvider theme={theme}>
            <AppStateProvider
                meeting={props.room.twilioID}
                token={token}
                isEmbedded={true}
                onConnect={(room, videoContext) => {
                    // if(this.state.room.get("mode") === "group") {
                    //     let localTracks = videoContext.localTracks;
                    //     const audioTrack = localTracks.find(track => track.kind === 'audio');
                    //     audioTrack.disable();
                    // }
                }
                }
                onDisconnect={() => handleLogout}>
                <VideoProvider
                    onError={(e) => onError(e)}
                    options={connectionOptions}
                    onDisconnect={() => handleLogout}
                >
                    {<div style={{ display: "flex" }}>
                        {/*</div><div style={{ flex: 1 }}>
                            {this.props.hideInfo
                                ? (<VideoContext.Consumer>
                                    {
                                        videoContext => {
                                            let desc = videoContext.room.state;
                                            if (desc) {
                                                desc = desc[0].toUpperCase() + desc.slice(1);
                                                let color = "red";
                                                if (desc === "Connected") {
                                                    color = "#87d068";
                                                }
                                                return <Tag color={color}>{desc}</Tag>
                                            }
                                            else {
                                                return <Tag color={"warning"} icon={<SyncOutlined spin />}>Connecting...</Tag>
                                            }
                                        }
                                    }
                                </VideoContext.Consumer>)
                                : (<h3>{this.state.meetingName} <VideoContext.Consumer>
                                    {
                                        videoContext => {
                                            let desc = videoContext.room.state;
                                            if (desc) {
                                                desc = desc[0].toUpperCase() + desc.slice(1);
                                                let color = "red";
                                                if (desc === "Connected") {
                                                    color = "#87d068";
                                                }
                                                return <Tag color={color}>{desc}</Tag>
                                            }
                                            else {
                                                return <Tag color={"warning"} icon={<SyncOutlined spin />}>Connecting...</Tag>
                                            }
                                        }
                                    }
                                </VideoContext.Consumer>
                                    <Tooltip mouseEnterDelay={0.5} title={"This room was created as a " +
                                        this.state.room.get("mode") + " room with a capacity of " +
                                        this.state.room.get("capacity") + "; currently " + (this.state.room.get("capacity") - nMembers) + " spot" + ((this.state.room.get("capacity") - nMembers) !== 1 ? "s" : "") + " available."} ><Tag color={membersListColor}>{nMembers + "/" + this.state.room.get("capacity")}</Tag></Tooltip>
                                    {fullLabel}{visibilityDescription}
                                    {privacyDescription}</h3>)}
                        </div>*/}

                        <div style={{}}>
                            <FlipCameraButton />
                            <DeviceSelector />
                            <ToggleFullscreenButton />
                            {/* TODO: <ReportToModsButton room={this.state.room} /> */}
                        </div>
                    </div>}

                    {/* ACLdescription */}

                    {/* {(this.props.clowdrAppState.user && !this.props.hideInfo && this.props.clowdrAppState.isManager ? <Popconfirm title="Are you sure you want to delete and end this room?"
                        onConfirm={this.deleteRoom.bind(this)}><Button size="small" danger loading={this.state.roomDeleteInProgress}>Delete Room</Button></Popconfirm> : <></>)} */}

                    {/* {!this.props.hideInfo ? <div>
                        {(this.state.room.get("mode") === "group" ? <span>This is a big group room. It supports up to {this.state.room.get("capacity")} participants, but will only show the video of the most active participants. Click a participant to pin them to always show their video. </span> :
                            this.state.room.get("mode") === "peer-to-peer" ? "This is a peer to peer room. It supports up to 10 participants, but the quality may not be as good as a group room" : "This is a small group room. It supports up to 4 participants.")}
                    </div> : <></>} */}

                    <div className={"videoEmbed"}>
                        <EmbeddedVideoWrapper />
                    </div>
                </VideoProvider>
            </AppStateProvider>
        </MuiThemeProvider>;
    }

    return token
        ? <div className="video-grid">
            {videoGrid}
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
