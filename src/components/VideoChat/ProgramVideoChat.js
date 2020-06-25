import {AuthUserContext} from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import React from "react";
import {Button, Popconfirm, Tag, Tooltip} from "antd";
import {isMobile} from "clowdr-video-frontend/lib/utils";
import AboutModal from "../SignIn/AboutModal";
import {MuiThemeProvider} from "@material-ui/core/styles";
import theme from "./theme";
import AppStateProvider from "clowdr-video-frontend/lib/state";
import {VideoContext, VideoProvider} from "clowdr-video-frontend/lib/components/VideoProvider";
import ReportToModsButton from "./ReportToModsButton";
import EmbeddedVideoWrapper from "./EmbeddedVideoWrapper";
import VideoRoom, {DeviceSelector} from "./VideoRoom";
import FlipCameraIosIcon from '@material-ui/icons/FlipCameraIos';

import {SyncOutlined} from "@material-ui/icons";

class ProgramVideoChat extends React.Component{

    constructor(props) {
        super(props);
        this.state ={room: props.room, isInRoom: false};
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        // if(this.props.auth.activePublicVideoRooms != this.state.activePublicVideoRooms){
        //     this.setState({activePublicVideoRooms: this.props.auth.activePublicVideoRooms})
        // }
    }
    joinRoom(){
        let user = this.props.authContext.user;
        this.setState({isInRoom: true});
    }
    render() {
        if(!this.state.isInRoom){
            return <div>
                <Button type="primary" loading={this.state.loading} onClick={this.joinRoom.bind(this)}>Join the video room</Button>
            </div>
        }
        return <VideoRoom hideInfo={true} room={this.state.room} conference={this.props.authContext.currentConference} onHangup={()=>{
            this.setState({isInRoom: false})
        }
        }/>
    }
}
const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramVideoChat {...props} authContext={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;
