import { AuthUserContext } from "../Session";
import * as React from "react";
import { Button } from "antd";
import VideoRoom from "./VideoRoom";
import { ClowdrState } from '../../ClowdrTypes';

interface ProgramVideoChatState {
    loading: boolean;
    room: any;    // TS: ???
    isInRoom: boolean;
}

interface ProgramVideoChatProps {
    room: any;    // TS: ???
    isInRoom: boolean;
    clowdrAppState: ClowdrState | null;
}
class ProgramVideoChat extends React.Component<ProgramVideoChatProps, ProgramVideoChatState>{

    constructor(props: ProgramVideoChatProps) {
        super(props);
        this.state = { room: props.room, isInRoom: this.props.isInRoom, loading: false };  // TS: is false the right initial value?
    }

    componentDidUpdate(prevProps: any, prevState: any, snapshot: any) {
        // TS: Should there be a function body here??
        // if(this.props.auth.activePublicVideoRooms !== this.state.activePublicVideoRooms){
        //     this.setState({activePublicVideoRooms: this.props.auth.activePublicVideoRooms})
        // }
    }
    joinRoom() {
        if (this.props.clowdrAppState != null) {
            this.setState({ isInRoom: true });
        }
    }
    render() {
        if (!this.state.isInRoom) {
            return <div>
                <Button type="primary" loading={this.state.loading} onClick={this.joinRoom.bind(this)}>Join the video chat room</Button>
            </div>
        }
        return <VideoRoom
            hideInfo={true} room={this.state.room}
            conference={this.props.clowdrAppState != null ? this.props.clowdrAppState.currentConference : null}
            onHangup={() => {
                this.setState({ isInRoom: false })
            }
            } />
    }
}
const AuthConsumer = (props: ProgramVideoChatProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramVideoChat {...props} clowdrAppState={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;
