import React from "react";
import {AuthUserContext} from "../Session";
import Parse from "parse"
import {Alert, Button, Descriptions, message, Popconfirm, Space, Spin} from "antd";
import NewMediaLinkForm from "./NewMediaLinkForm";
import ProgramPersonDisplay from "../Program/ProgramPersonDisplay";
import {Document, Page, pdfjs} from 'react-pdf';
import VideoRoom from "../VideoChat/VideoRoom";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

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
        if(this.props.match.path.startsWith("/breakoutRoom")){
            this.setState({isInRoom: true});
        }

        //For social features, we need to wait for the login to complete before doing anything
        let [user, item, attachmentTypes] = await Promise.all([this.props.auth.refreshUser(), this.props.auth.programCache.getProgramItemByConfKey(itemKey, this),
        this.props.auth.programCache.getAttachmentTypes(this)]);

        if (!item) {
            this.setState({loading: false, error: "Unable to find the program item '" + itemKey + "'"});
        } else {
            let stateUpdate = {loading: false, error: null, ProgramItem: item, inBreakoutRoom: false, AttachmentTypes: attachmentTypes};
            if (item.get("attachments")) {
                await Parse.Object.fetchAllIfNeeded(item.get("attachments"));
            }
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
        let hasWritePerm = this.props.auth.helpers.userHasWritePermission(this.state.ProgramItem);
        if(this.state.error){
            return  <Alert
                message="Unable to load program item"
                description={this.state.error}
                type="error"
            />
        }
        let authors = this.state.ProgramItem.get("authors") ? this.state.ProgramItem.get("authors") : [];
        let authorstr = "";
        let authorsArr = authors.map(a => <ProgramPersonDisplay key={a.id} auth={this.props.auth} id={a.id} />);
        if (authorsArr.length >= 1)
            authorstr= authorsArr.reduce((prev,curr) => [prev,", ",curr]);

        let sessionInfo;
        let now = Date.now();

        let roomInfo = <></>;
        if(this.state.ProgramItem.get("programSession")){
            let session = this.state.ProgramItem.get("programSession");
            let now = Date.now();
            var timeS = session.get("startTime") ? session.get("startTime") : new Date();
            var timeE = session.get("endTime") ? session.get("endTime") : new Date();

            if (session.get("room")){ // && session.get("room").get("src1") == "YouTube") {
                let when = "now"
                if(timeE >= now)
                    roomInfo = <Button type="primary" onClick={() => {
                    this.props.history.push("/live/" + when + "/" + session.get("room").get("name"))
                }}>Join Live Session</Button>
            }
            sessionInfo = <div>
                {session.get("title")} ({this.formatTime(session.get("startTime"))} - {this.formatTime(session.get('endTime'))})
            </div>;
        }

        let additionalDescription =[];
        let externalLinks = [];
        if(this.state.ProgramItem.get("attachments")){
            let attachments = this.state.ProgramItem.get("attachments").sort((a,b)=>{
                if(!a.get("attachmentType"))
                    return -1;
                if(!b.get("attachmentType"))
                    return 1;
                let t1 = this.state.AttachmentTypes.find(v=>v.id == a.get("attachmentType").id);
                let t2 = this.state.AttachmentTypes.find(v=>v.id == b.get("attachmentType").id);
                if(t1.get("ordinal") < t2.get("ordinal"))
                    return -1;
                return 1;
            })
            for (let attachment of attachments) {
                let type = this.state.AttachmentTypes.find(v => v && v.id == attachment.get("attachmentType").id);
                let deleteButton = <></>

                if (hasWritePerm)
                    deleteButton =
                        <Popconfirm title={"Are you sure you want to delete this " + type.get('name') + " attachment?"}
                                    onConfirm={
                                        () => {
                                            attachment.destroy();
                                            message.success("Attachment deleted.");
                                        }
                                    }><Button type="text" danger size="small">Delete</Button></Popconfirm>
                if (type.get("displayAsLink")) {
                    let url = attachment.get("url");
                    if (!url)
                        url = attachment.get("file").url();
                    externalLinks.push(<span key={attachment.id}><a href={url}
                                                                    target="_blank">{type.get("name")}</a>{deleteButton}</span>);
                } else {
                    let url = attachment.get("url");
                    if (!url)
                    {
                        if(!attachment.get("file"))
                            continue;
                        url = attachment.get("file").url();
                    }
                    let viewer = url;
                    if (url.endsWith(".pdf")) {
                        viewer = <Space><Document
                            file={url}
                            // onLoadSuccess={onDocumentLoadSuccess}
                        >
                            <Page pageNumber={1}/>
                        </Document>{deleteButton}</Space>
                    } else {
                        viewer = <Space>
                            <a href={url} target="_blank"><img src={url} alt={type.get("name")}
                                                               width={300}/></a> {deleteButton}</Space>
                    }
                    additionalDescription.push(<Descriptions.Item key={attachment.id} label={type.get('name')}>{viewer}</Descriptions.Item>)
                }
            }
            if (externalLinks.length) {
                additionalDescription.push(<Descriptions.Item key="externalLinks"
                                                              label="External Links">{externalLinks.reduce((prev,curr) => [prev,", ",curr])}</Descriptions.Item>)
            }
        }
        additionalDescription.push(<Descriptions.Item key="actions" label="Actions">
            <Space align="center">
                {roomInfo}
                {this.props.auth.user  && this.state.ProgramItem.get("breakoutRoom")? <Button disabled={this.state.isInRoom} type="primary" onClick={()=>{
                    this.setState({isInRoom: true});
                }
                }>Join Breakout Room</Button> : <></>}
                {hasWritePerm ? <NewMediaLinkForm ProgramItem={this.state.ProgramItem} /> : <></>}
            </Space>
        </Descriptions.Item>)
        let videoRoom = <></>
        if(this.state.isInRoom){
            videoRoom = <VideoRoom
                hideInfo={true} room={this.state.ProgramItem.get("breakoutRoom")}
                conference={this.props.auth != null ? this.props.auth.currentConference : null}
                onHangup={() => {
                    this.setState({ isInRoom: false })
                }
                } />
        }

        return <div className="programItemContainer">
            <div className="programItemMetadata">
                <h3>{this.state.ProgramItem.get('title')}</h3>
                <Descriptions layout="horizontal" column={1} bordered>
                    <Descriptions.Item label="Authors">{authorstr}</Descriptions.Item>
                    <Descriptions.Item label="Session">{sessionInfo}</Descriptions.Item>
                    <Descriptions.Item label="Abstract">{this.state.ProgramItem.get("abstract")}</Descriptions.Item>
                    {additionalDescription}
                </Descriptions>
            </div>
            <div className="embeddedVideoRoom">
                {videoRoom}
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