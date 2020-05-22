import React, {Component} from 'react';
import { MuiThemeProvider } from '@material-ui/core/styles';
import theme from './theme';

import App from './App';
import AppStateProvider, {useAppState} from './state';
import {ConnectOptions} from 'twilio-video';
import ErrorDialog from './components/ErrorDialog/ErrorDialog';
import {isMobile} from './utils';
import './types';
import {VideoProvider} from './components/VideoProvider';
import {Callback} from "./types";

// See: https://media.twiliocdn.com/sdk/js/video/releases/2.0.0/docs/global.html#ConnectOptions
// for available connection options.
const connectionOptions: ConnectOptions = {
    // Bandwidth Profile, Dominant Speaker, and Network Quality
    // features are only available in Small Group or Group Rooms.
    // Please set "Room Type" to "Group" or "Small Group" in your
    // Twilio Console: https://www.twilio.com/console/video/configure
    bandwidthProfile: {
        video: {
            mode: 'collaboration',
            dominantSpeakerPriority: 'standard',
            renderDimensions: {
                high: {height: 1080, width: 1920},
                standard: {height: 720, width: 1280},
                low: {height: 90, width: 160},
            },
        },
    },
    dominantSpeaker: true,
    networkQuality: {local: 1, remote: 1},

    // Comment this line if you are playing music.
    maxAudioBitrate: 16000,

    // VP8 simulcast enables the media server in a Small Group or Group Room
    // to adapt your encoded video quality for each RemoteParticipant based on
    // their individual bandwidth constraints. This has no effect if you are
    // using Peer-to-Peer Rooms.
    preferredVideoCodecs: [{codec: 'VP8', simulcast: true}],
};

// For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
if (isMobile && connectionOptions?.bandwidthProfile?.video) {
    connectionOptions!.bandwidthProfile!.video!.maxSubscriptionBitrate = 2500000;
}


const VideoApp: React.SFC<Props> = (props) => {
    const {error, setError} = useAppState();

    connectionOptions.name = props.meetingID;
    return (
        <VideoProvider options={connectionOptions} onError={setError} meetingID={props.meetingID} meeting={props.meeting} token={props.token} onDisconnect={props.onDisconnect}>
            <ErrorDialog dismissError={() => setError(null)} error={error}/>
                 <App/>
        </VideoProvider>
    );
};

interface Props {
    onDisconnect: Callback;
    meeting: string;
    token: string;
    meetingID: string;
}
class WrappedApp extends Component<Props,{}> {
    render() {
        if(!this.props.token)
            return (<div>Loading...</div>)
        return (
            <MuiThemeProvider theme={theme}>
            <AppStateProvider meeting={this.props.meeting} token={this.props.token}>
                <VideoApp  meeting={this.props.meeting} token={this.props.token} meetingID={this.props.meetingID} onDisconnect={this.props.onDisconnect}/>
            </AppStateProvider>
            </MuiThemeProvider>
        )
    }
}
export default WrappedApp;
