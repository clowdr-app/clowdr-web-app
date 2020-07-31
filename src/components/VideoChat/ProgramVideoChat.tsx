import { AuthUserContext } from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import * as React from "react";
import { Button, Popconfirm, Tag, Tooltip } from "antd";
import { isMobile } from "clowdr-video-frontend/lib/utils";
import AboutModal from "../SignIn/AboutModal";
import { MuiThemeProvider } from "@material-ui/core/styles";
import theme from "./theme";
import AppStateProvider from "clowdr-video-frontend/lib/state";
import { VideoContext, VideoProvider } from "clowdr-video-frontend/lib/components/VideoProvider";
import ReportToModsButton from "./ReportToModsButton";
import EmbeddedVideoWrapper from "./EmbeddedVideoWrapper";
import VideoRoom, { DeviceSelector } from "./VideoRoom";
import FlipCameraIosIcon from '@material-ui/icons/FlipCameraIos';
import { ClowdrAppState } from '../../ClowdrTypes';

import { SyncOutlined } from "@material-ui/icons";

interface ProgramVideoChatState {
    loading: boolean;
    room: any;    // TS: ???
    isInRoom: boolean;
}

interface ProgramVideoChatProps {
    room: any;    // TS: ???
    isInRoom: boolean;
    authContext: ClowdrAppState | null;
}
class ProgramVideoChat extends React.Component<ProgramVideoChatProps, ProgramVideoChatState>{

    constructor(props: ProgramVideoChatProps) {
        super(props);
        this.state = { room: props.room, isInRoom: this.props.isInRoom, loading: false };  // TS: is false the right initial value?
    }

    componentDidUpdate(prevProps: any, prevState: any, snapshot: any) {
        // TS: Should there be a function body here??
        // if(this.props.auth.activePublicVideoRooms != this.state.activePublicVideoRooms){
        //     this.setState({activePublicVideoRooms: this.props.auth.activePublicVideoRooms})
        // }
    }
    joinRoom() {
        if (this.props.authContext != null) {
            let user = this.props.authContext.user;
            this.setState({ isInRoom: true });
        }
    }
    render() {
        if (!this.state.isInRoom) {
            return <div>
                <Button type="primary" loading={this.state.loading} onClick={this.joinRoom.bind(this)}>Join the breakout room</Button>
            </div>
        }
        return <VideoRoom
            hideInfo={true} room={this.state.room}
            conference={this.props.authContext != null ? this.props.authContext.currentConference : null}
            onHangup={() => {
                this.setState({ isInRoom: false })
            }
            } />
    }
}
const AuthConsumer = (props: ProgramVideoChatProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramVideoChat {...props} authContext={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;
