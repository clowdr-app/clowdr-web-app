import React from 'react';
import { ClowdrState } from "../../ClowdrTypes";
import { AuthUserContext } from '../Session';
import BreakoutRoom from "../../classes/BreakoutRoom";
import { Skeleton } from "antd";
import UserStatusDisplay from "./UserStatusDisplay";

interface BreakoutRoomDisplayProps {
    auth: ClowdrState | null;
    id: string;
}

interface BreakoutRoomDisplayState {
    loading: Boolean,
    breakoutRoom: BreakoutRoom | null;
}

class BreakoutRoomDisplay extends React.Component<BreakoutRoomDisplayProps, BreakoutRoomDisplayState> {
    constructor(props: BreakoutRoomDisplayProps) {
        super(props);
        this.state = {
            loading: true,
            breakoutRoom: null
        }
    }

    componentDidMount(): void {
        this.props.auth?.helpers.getBreakoutRoom(this.props.id, this).then((room: BreakoutRoom | null) => {
            this.setState({ breakoutRoom: room });
        });
    }
    componentWillUnmount(): void {
        if (this.state.breakoutRoom) {
            this.props.auth?.helpers.cancelBreakoutRoomSubscription(this.props.id, this);
        }
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        let list = <></>;
        if (!this.state.breakoutRoom)
            return <Skeleton.Input />
        if (this.state.breakoutRoom.get("members") && this.state.breakoutRoom.get("members").length > 0)
            list = this.state.breakoutRoom.get("members").map((user: any) => {
                if (user) {
                    return <UserStatusDisplay popover={true} profileID={user.id} key={user.id} />
                }
                return <></>
            }) //}>
        else
            list = <></>
        return <div>{list}</div>
    }
}
interface PublicBreakoutRoomDisplayProps {
    id: string;
}
const AuthConsumer = (props: PublicBreakoutRoomDisplayProps) => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <BreakoutRoomDisplay id={props.id} auth={value} />
        )}
    </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer;
