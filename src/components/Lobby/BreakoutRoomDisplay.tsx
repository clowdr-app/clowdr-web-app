import React from 'react';
import {ClowdrAppState} from "../../ClowdrTypes";
import {AuthUserContext} from '../Session';
import BreakoutRoom from "../../classes/BreakoutRoom";
import {Menu, Skeleton} from "antd";
import UserStatusDisplay from "./UserStatusDisplay";

interface BreakoutRoomDisplayProps {
    auth: ClowdrAppState | null;
    id: string;
}

interface BreakoutRoomDisplayState {
    loading: Boolean,
    BreakoutRoom?: BreakoutRoom;
}

class BreakoutRoomDisplay extends React.Component<BreakoutRoomDisplayProps, BreakoutRoomDisplayState> {
    constructor(props: BreakoutRoomDisplayProps) {
        super(props);
        this.state = {
            loading: true,
        }
    }

    componentDidMount(): void {
        this.props.auth?.helpers.getBreakoutRoom(this.props.id, this).then((room: BreakoutRoom) => {
            this.setState({BreakoutRoom: room});
        })
    }
    componentWillUnmount(): void {
        if(this.state.BreakoutRoom){
            this.props.auth?.helpers.cancelBreakoutRoomSubscription(this.props.id, this);
        }
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        let list = <></>;
        if(!this.state.BreakoutRoom)
            return <Skeleton.Input />
        if (this.state.BreakoutRoom.get("members") && this.state.BreakoutRoom.get("members").length > 0)
            list = this.state.BreakoutRoom.get("members").map((user: any)=>{
                if(user) {
                    let className = "personHoverable";
                    return <UserStatusDisplay popover={true} profileID={user.id} key={user.id} />
                }
                return <></>
            }) //}>
        else
            list = <></>
       return <div>{list}</div>
    }
}
interface PublicBreakoutRoomDisplayProps{
    id: string;
}
const AuthConsumer = (props: PublicBreakoutRoomDisplayProps) => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <BreakoutRoomDisplay id={props.id} auth={value}/>
        )}
    </AuthUserContext.Consumer>
// )}</Router.Consumer>

);

export default AuthConsumer;