import React from "react";
import {Avatar, Badge, Button, Card, Popover, Skeleton, Tooltip} from "antd";
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

    componentWillUnmount() {
        this.mounted = false;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(!this.mounted)
            return;
        if(this.props.auth.presences[this.state.id] != this.state.presence){
            this.setState({presence: this.props.auth.presences[this.state.id]});
        }
    }
    
    openDM(){
        this.props.auth.helpers.createOrOpenDM(this.state.profile);
    }

    render() {
        if (!this.state.profile)
            return <Skeleton.Input active style={{width: '100px', height: '1em'}}/>
        let presenceDesc = "";
        let badgeColor = "";
        let badgeStyle = "success";
        let dntWaiver = "";
        if (!this.state.presence){
            if(this.props.onlyShowWithPresence)
                return <div></div>
            badgeStyle = "default";
            presenceDesc = "Offline";
        } else if (this.state.presence.get("isLookingForConversation")) {
            presenceDesc = "looking for conversation";
            badgeColor = "green";
            badgeStyle = "processing";
        } else if (this.state.presence.get("isAvailable")) {
            // presenceDesc = "In a conversation: come join if you like";
            presenceDesc = "";
            badgeColor = "lightgray";
        } else if (this.state.presence.get("isOpenToConversation")) {
            presenceDesc = "open to conversation";
            badgeColor = "geekBlue";
        } else if (this.state.presence.get("isDND")) {
            presenceDesc = "busy: do not disturb";
            badgeColor = "orange";
        } else if (this.state.presence.get("isDNT")){
            presenceDesc = "Do not track"
            badgeStyle = "default"
            dntWaiver = "Only you can see this status. Others will still see your presence in public rooms, but won't see a status"
        }
        // BCP: We should really do the italic styling and color in a style sheet!
        let statusDesc = (this.state.presence ? <i><span style={{color:"gray"}}>{this.state.presence.get("status")}</span></i> : <></>);
        let onClick = ()=>{};
        if (this.props.auth.userProfile.id != this.state.profile.id){
            onClick = this.openDM.bind(this);
        }
        let avatar, inlineAvatar;
        if (this.state.profile && this.state.profile.get("profilePhoto") != null)
            avatar = <Avatar src={this.state.profile.get("profilePhoto").url()}/>

        let affiliation = "";
        // This way of writing the tests is certainly suboptimal!
        if ("" + this.state.profile.get("affiliation") != "undefined") {
            affiliation = "" + this.state.profile.get("affiliation");
        }
        let popoverTitle = <div className="nameAndAvatar">{avatar} {this.state.profile.get("displayName")}</div>;
        let webpage = "";
        if ("" + this.state.profile.get("webpage") != "undefined") {
            webpage = <div>
                <a href={this.state.profile.get("webpage")} target="_blank">
                    {this.state.profile.get("webpage")}</a>
                </div>;
        }
        let bio = "";
        if ("" + this.state.profile.get("bio") != "undefined") {
            bio = <div>
                {"" + this.state.profile.get("bio")}
                </div>;
        }
        let tags = "";
        if (this.state.profile.get("tags")) {
            tags = this.state.profile.get("tags").toString;
        }
        // BCP: Not quite right -- needs some spaces after non-empty elements, and some vertical space after the first line if the whole first line is nonempty:
        let firstLine = <div><div className="presenceDesc">{presenceDesc}</div> {tags} {statusDesc} {dntWaiver} </div>;
        // BCP: And this needs a bit more vertical spacing between non-empty elements too:
        let popoverContent = <div className="userPopover"> {firstLine} {affiliation} {bio} {webpage} </div>;
/*
        let popoverContent = <span></span>
        // BCP: Not clear to me why we treat these popovers differently
        // in different contexts; I am going to make them all the same for now
        if (this.props.popover)
*/
        return <div className="userDisplay" style={this.props.style}
                    onClick={onClick}>
                 <Popover title={popoverTitle}
                          content={popoverContent} >
                    <Badge status={badgeStyle} color={badgeColor} />
                    {this.state.profile.get("displayName")}
                    {this.props.popover && statusDesc != "" ? <></> : <span> &nbsp; {statusDesc} </span>}
                 </Popover>
              </div>
/*
    else return <div
        key={this.state.profile.id}
        className="userTag"
        onClick={onClick}
        title=
        {dntWaiver}>
        <Popover
            title={presenceDesc}
            content={popoverContent}>
        <Badge  status={badgeStyle} color={badgeColor} />
           {this.state.profile.get("displayName")} {statusDesc}</Popover>
    </div>
*/
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
