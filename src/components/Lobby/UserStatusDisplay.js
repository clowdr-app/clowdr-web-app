import React from "react";
import {Badge, Card, Popover, Skeleton, Tooltip} from "antd";
import {AuthUserContext} from "../Session";
import {withRouter} from "react-router-dom";

class UserStatusDisplay extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            id: this.props.profileID
        }
    }

    async componentDidMount() {
        this.mounted = true;
        let profile = await this.props.auth.helpers.getUserProfilesFromUserProfileID(this.state.id);
        if(!this.mounted)
            return;
        let userStatus = this.props.auth.presences[this.state.id];
        this.setState({profile: profile, presence: userStatus})
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.props.auth.presences[this.state.id] != this.state.presence){
            this.setState({presence: this.props.auth.presences[this.state.id]});
        }
    }

    render() {
        if (!this.state.profile)
            return <Skeleton.Input active style={{width: '100px', height: '1em'}}/>
        if (!this.state.presence){

            if(this.props.onlyShowWithPresence)
                return <div></div>
            return <div className="userDisplay">{this.state.profile.get("displayName")}
            </div>
        }
        else{

            let presenceDesc = "";
            let badgeColor = "";
            let badgeStyle = "success";
            let dntWaiver = "";
            if (this.state.presence.get("isLookingForConversation")) {
                presenceDesc = "Looking for Conversation";
                badgeColor = "green";
                badgeStyle = "processing";
            } else if (this.state.presence.get("isAvailable")) {
                presenceDesc = "In a conversation; but come join if you like";
                badgeColor = "geekblue";
            } else if (this.state.presence.get("isDND")) {
                presenceDesc = "Busy / Do Not Disturb";
                badgeColor = "orange";
            } else if(this.state.presence.get("isDNT")){
                presenceDesc = "Do not track"
                badgeStyle = "default"
                dntWaiver = "Only you can see this status. Others will still see your presence in public rooms, but won't see a status"
            }
            let statusDesc = <i>{this.state.presence.get("status")}</i>;
            if (this.props.popover)
                return <div className="userDisplay" style={this.props.style}>
                    <Popover title={this.state.profile.get("displayName") + "'s availability is: " + presenceDesc}
                             content={<div>{statusDesc} {dntWaiver}</div>}>
                        <Badge status={badgeStyle} color={badgeColor} /> {this.state.profile.get("displayName")}</Popover>
                </div>
            else return <div
                key={this.state.profile.id}
                className="userTag"
                title=
                {dntWaiver}>
                <Tooltip
                    title={this.state.profile.get("displayName") +"'s availability is: " + presenceDesc}>
                    <Badge  status={badgeStyle} color={badgeColor} /> {this.state.profile.get("displayName")} {statusDesc}</Tooltip>
            </div>
        }

    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <UserStatusDisplay {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default withRouter(AuthConsumer);