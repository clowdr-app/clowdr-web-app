import React from "react";
import {AuthUserContext} from "../Session";
import {ProgramContext} from "../Program";
import Parse from "parse"
import {Alert, Spin} from "antd";
import ProgramVideoChat from "../VideoChat/ProgramVideoChat";
import {videoURLFromData} from "../LiveStreaming/utils";

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

            // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            this.state.items = this.props.items;
            this.state.waitForProgram = false;
        }        
    
    }

    async componentDidMount() {
        let itemKey = this.props.match.params.programConfKey1 + "/"+this.props.match.params.programConfKey2;
        this.setState({itemKey: itemKey});

        //For social features, we need to wait for the login to complete before doing anything
        let user = await this.props.auth.refreshUser();


        let item = this.props.items ? this.props.items.find(item => item.get("confKey") == itemKey) : undefined;

        if (!item) {
            let pq = new Parse.Query("ProgramItem");
            pq.equalTo("confKey", itemKey);
            pq.include("track");
            pq.include("programSession")
            pq.include("programSession.room")
            pq.include("programSession.room.socialSpace")
            pq.include("breakoutRoom");
            item = await pq.first();
        }

        if (!item) {
            this.setState({loading: false, error: "Unable to find the program item '" + itemKey + "'"});
        } else {
            let stateUpdate = {loading: false, error: null, programItem: item, inBreakoutRoom: false};
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
        this.props.auth.helpers.setGlobalState({chatChannel: null, forceChatOpen: false});
        this.props.auth.setSocialSpace("Lobby");
    }

    maybeCloseChat(){
        this.props.auth.chatClient.closeChatAndLeaveIfUnused(this.state.chatSID);

    }
    async componentDidUpdate(prevProps) {

        if (this.state.waitForProgram) {
            if (this.state.gotItems) {
                // console.log('[ProgramItem]: Program download complete');
                this.setState({items: this.props.items, waitingForProgram: false});
            }
            else {
                // console.log('[ProgramItem]: Program still downloading...');
                if (prevProps.items.length != this.props.items.length) {
                    this.setState({gotItems: true});
                    console.log('[ProgramItem]: got items');
                }
            }
        }
        else {
            // console.log('[ProgramItem]: Program cached');
        }
        let itemKey = this.props.match.params.programConfKey1 + "/"+this.props.match.params.programConfKey2;
        if(this.state.itemKey != itemKey){
            this.maybeCloseChat();
            this.setState({itemKey: itemKey, loading: true});
            let item = this.props.items ? this.props.items.find(item => item.get("confKey") == itemKey) : undefined;

            if (!item) {
                let pq = new Parse.Query("ProgramItem");
                pq.equalTo("confKey", itemKey);
                pq.include("track");
                pq.include("programSession")
                pq.include("programSession.room")
                pq.include("programSession.room.socialSpace")
                pq.include("breakoutRoom");
                item = await pq.first();
            }

            if (!item) {
                this.setState({loading: false, error: "Unable to find the program item '" + itemKey + "'"});
            } else {
                let chatSID = undefined;
                if (this.props.auth.user) {
                    if(item.get("programSession") && item.get("programSession").get("room") && item.get("programSession").get("room").get("socialSpace")){
                        //set the social space...
                        let ss = item.get("programSession").get("room").get("socialSpace");
                        this.props.auth.setSocialSpace(ss.get("name"));
                        this.props.auth.helpers.setGlobalState({forceChatOpen: true});
                    }
                    if (item.get("track").get("perProgramItemChat")) {
                        //Join the chat room
                        chatSID = item.get("chatSID");
                        if (!chatSID) {
                            chatSID = await Parse.Cloud.run("chat-getSIDForProgramItem", {
                                programItem: item.id
                            });
                        }
                        this.props.auth.chatClient.openChatAndJoinIfNeeded(chatSID);
                    }
                }
                this.setState({loading: false, error: null, programItem: item, inBreakoutRoom: false, chatSID: chatSID});
            }

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
        if (this.state.programItem.get("posterImage")) {
            img = <img src={this.state.programItem.get("posterImage").url()} />
        }
        let authors = this.state.programItem.get("authors") ? this.state.programItem.get("authors") : [];
        let authorstr = authors.map(a => a.get('name')).join(", ");
        let sessionInfo;
        let now = Date.now();

        if(this.state.programItem.get("programSession")){
            let session = this.state.programItem.get("programSession");
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
                <h3>{this.state.programItem.get('title')}</h3>
                <p><i>{authorstr}</i></p>
                {sessionInfo}
                <p><b>Abstract: </b> {this.state.programItem.get("abstract")}</p>
                {this.props.auth.user  && this.state.programItem.get("breakoutRoom")? <div className="embeddedVideoRoom"><ProgramVideoChat room={this.state.programItem.get("breakoutRoom")}/></div> : <></>}
            </div>
            <div className="fill">
                {img}
            </div>
        </div>
    }
}

const
    AuthConsumer = (props) => (
        <ProgramContext.Consumer>
            {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
                <AuthUserContext.Consumer>
                    {value => (
                        <ProgramItem {...props} auth={value} items={items} onDown={onDownload} downloaded={downloaded}/>
                    )}
                </AuthUserContext.Consumer>
            )}
        </ProgramContext.Consumer>

    );

export default AuthConsumer;