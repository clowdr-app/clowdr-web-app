import React from "react";
import {AuthUserContext} from "../Session";
import Parse from "parse"
import {Alert, Spin} from "antd";
import ProgramVideoChat from "../VideoChat/ProgramVideoChat";
import {videoURLFromData} from "../LiveStreaming/utils";
import ProgramPersonDisplay from "../Program/ProgramPersonDisplay";

var moment = require('moment');
var timezone = require('moment-timezone');

class ProgramItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            gotItems: false,
            itemKey: null,
            items: [],
            waitingForProgram: true
        };
    }

    async componentDidMount() {
        let itemKey = this.props.match.params.programConfKey1 + "/"+this.props.match.params.programConfKey2;
        this.setState({itemKey: itemKey});

        //For social features, we need to wait for the login to complete before doing anything
        let [user, item] = await Promise.all([this.props.auth.refreshUser(), this.props.auth.programCache.getProgramItemByConfKey(itemKey, this)]);

        if (!item) {
            this.setState({loading: false, error: "Unable to find the program item '" + itemKey + "'"});
        } else {
            let stateUpdate = {loading: false, error: null, ProgramItem: item, inBreakoutRoom: false};
            if (user) {
                if(item.get("programSession") && item.get("programSession").get("room") && item.get("programSession").get("room").get("socialSpace")){
                    //set the social space...
                    let ss = item.get("programSession").get("room").get("socialSpace");
                    this.props.auth.setSocialSpace(ss.get("name"));
                    this.props.auth.helpers.setGlobalState({forceChatOpen: true});
                }
                if (item.get("track").get("perProgramItemChat")) {
                    //Join the chat room
                    let chatSID = item.get("chatSID");
                    if (!chatSID) {
                        chatSID = await Parse.Cloud.run("chat-getSIDForProgramItem", {
                            programItem: item.id
                        });
                    }
                    if(chatSID)
                        this.props.auth.chatClient.openChatAndJoinIfNeeded(chatSID);
                    stateUpdate.chatSID = chatSID;
                }
            }
            this.setState(stateUpdate);
        }
    }

    componentWillUnmount() {
        this.maybeCloseChat();
        if(this.state.ProgramItem)
            this.props.auth.programCache.cancelSubscription("ProgramItem", this, this.state.ProgramItem.id);
        this.props.auth.helpers.setGlobalState({chatChannel: null, forceChatOpen: false});
        this.props.auth.setSocialSpace("Lobby");
    }

    maybeCloseChat(){
        this.props.auth.chatClient.closeChatAndLeaveIfUnused(this.state.chatSID);

    }
    async componentDidUpdate(prevProps) {
        let itemKey = this.props.match.params.programConfKey1 + "/"+this.props.match.params.programConfKey2;
        if(this.state.itemKey != itemKey){
            this.props.auth.programCache.cancelSubscription("ProgramItem", this, this.state.ProgramItem.id);
            this.maybeCloseChat();
            this.componentDidMount();
        }
    }
    formatTime(timestamp) {
        return moment(timestamp).tz(timezone.tz.guess()).format('LLL z')
    }
    render() {
        if (this.state.loading)
            return <Spin/>
        if(this.state.error){
            return  <Alert
                message="Unable to load program item"
                description={this.state.error}
                type="error"
            />
        }
        let img = ""
        if (this.state.ProgramItem.get("posterImage")) {
            img = <img src={this.state.ProgramItem.get("posterImage").url()} />
        }
        let authors = this.state.ProgramItem.get("authors") ? this.state.ProgramItem.get("authors") : [];
        let authorstr = "";
        let authorsArr = authors.map(a => <ProgramPersonDisplay key={a.id} auth={this.props.auth} id={a.id} />);
        if (authorsArr.length >= 1)
            authorstr= authorsArr.reduce((prev,curr) => [prev,", ",curr]);

        let sessionInfo;
        let now = Date.now();

        if(this.state.ProgramItem.get("programSession")){
            let session = this.state.ProgramItem.get("programSession");
            let roomInfo;
            if (session.get("room") && session.get("room").get("src1") == "YouTube") {
                let when = "now"
                roomInfo = <p><b>Virtual room (stream): </b><a href="#" onClick={() => {
                    this.props.history.push("/live/" + when + "/" + session.get("room").get("name"))
                }}>{session.get("room").get("name")}</a></p>
            } else if (session.get("room") && session.get("room").get("src1") == "ZoomUS") {
                let video = session.get("room"); // names :(
                var timeS = session.get("startTime") ? session.get("startTime") : new Date();
                let ts_window = moment(timeS).subtract(8, 'h').toDate().getTime();
                let ts_future = moment(timeS).add(8, 'h').toDate().getTime();
                let show_link = (timeS > now && ts_window < now);
                if(show_link && video.get("src1")) {
                    let country = this.props.auth.userProfile.get("country");
                    var src = video.get("src1");
                    var id = video.get("id1");
                    var pwd = video.get("pwd1");

                    var inChina = false;
                    if (country && (country.toLowerCase().includes("china") || country.toLowerCase().trim() == "cn")) {
                        // Commenting it for now until we get conformation of the Chinese URL
                        // src = this.props.video.get("src2");
                        // id = this.props.video.get("id2");
                        inChina = true;
                    }
                    let video_url= videoURLFromData(src, id, pwd, country);

                    roomInfo = <p><b>Virtual room (stream): </b> <a target="_blank" href={video_url}>Join via Zoom</a></p>
                }
                else
                    roomInfo = <p><b>Virtual room (stream): </b> A zoom link will be available here to join, 8 hours before the event starts.</p>
            }
            sessionInfo = <div>
                <b>Session:</b> {session.get("title")} ({this.formatTime(session.get("startTime"))} - {this.formatTime(session.get('endTime'))}){roomInfo}
            </div>;
        }

        return <div className="programItemContainer">
            <div className="programItemMetadata">
                <h3>{this.state.ProgramItem.get('title')}</h3>
                <div><i>{authorstr}</i></div>
                {sessionInfo}
                <p><b>Abstract: </b> {this.state.ProgramItem.get("abstract")}</p>
                {this.props.auth.user  && this.state.ProgramItem.get("breakoutRoom")? <div className="embeddedVideoRoom"><ProgramVideoChat room={this.state.ProgramItem.get("breakoutRoom")}/></div> : <></>}
            </div>
            <div className="fill">
                {img}
            </div>
        </div>
    }
}

const
    AuthConsumer = (props) => (
                <AuthUserContext.Consumer>
                    {value => (
                        <ProgramItem {...props} auth={value} />
                    )}
                </AuthUserContext.Consumer>

    );

export default AuthConsumer;