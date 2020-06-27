import React from "react";
import {AuthUserContext} from "../Session";
import {ProgramContext} from "../Program";
import withAuthentication from "../Session/withAuthentication";
import Parse from "parse"
import {Alert, Spin} from "antd";
import ProgramVideoChat from "../VideoChat/ProgramVideoChat";

class ProgramItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            gotItems: false,
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
        //For social features, we need to wait for the login to complete before doing anything
        let user = await this.props.auth.refreshUser();

        let itemKey = this.props.match.params.programConfKey1 + "/"+this.props.match.params.programConfKey2;

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
                    this.props.auth.chatClient.openChatAndJoinIfNeeded(chatSID);
                }
            }
            this.setState({loading: false, error: null, programItem: item, inBreakoutRoom: false});
        }
    }

    componentWillUnmount() {
        this.props.auth.helpers.setGlobalState({chatChannel: null, forceChatOpen: false});
        this.props.auth.setSocialSpace("Lobby");

    }
    
    componentDidUpdate(prevProps) {

        if (this.state.waitForProgram) {
            if (this.state.gotItems) {
                console.log('[ProgramItem]: Program download complete');
                this.setState({items: this.props.items, waitingForProgram: false});
            }
            else {
                console.log('[ProgramItem]: Program still downloading...');
                if (prevProps.items.length != this.props.items.length) {
                    this.setState({gotItems: true});
                    console.log('[ProgramItem]: got items');
                }
            }
        }
        else {
            console.log('[ProgramItem]: Program cached');
        }
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
        if (this.state.programItem.get("image")) {
            img = <img src={this.state.programItem.get("image")} />
        }
        return <div className="programItemContainer">
            <div className="programItemMetadata">
                <h3>{this.state.programItem.get('title')}</h3>
                <p><b>Abstract: </b> {this.state.programItem.get("abstract")}</p>
                {this.state.programItem.get("breakoutRoom") ? <div className="embeddedVideoRoom"><ProgramVideoChat room={this.state.programItem.get("breakoutRoom")}/></div> : <></>}
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