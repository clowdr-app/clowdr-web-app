import React from "react";
import {AuthUserContext} from "../Session";
import Parse from "parse"
import {Button, Descriptions, message, Popconfirm, Space, Spin, List} from "antd";
import NewMediaLinkForm from "./NewMediaLinkForm";
import ProgramPersonDisplay from "../Program/ProgramPersonDisplay";
// @ts-ignore
import {Document, Page, pdfjs} from 'react-pdf';
import VideoRoom from "../VideoChat/VideoRoom";
import {ClowdrState} from "../../ClowdrTypes";
import ProgramItem from "../../classes/ProgramItem";
import ProgramPerson from "../../classes/ProgramPerson";
import AttachmentType from "../../classes/AttachmentType";
import ProgramItemAttachment from "../../classes/ProgramItemAttachment";
import ProgramSession from "../../classes/ProgramSession";
import ProgramSessionEvent from "../../classes/ProgramSessionEvent";
import ReactMarkdown from "react-markdown";


pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

var moment = require('moment');
var timezone = require('moment-timezone');

interface ProgramItemDetailProps {
    appState: ClowdrState | null;
    ProgramItem: ProgramItem;
    openChat?: boolean;
    isInRoom?: boolean;
    hiddenKeys?: string[] | null;
}

interface PublicProgramItemDetailProps {
    ProgramItem: ProgramItem;
    openChat?: boolean;
    isInRoom?: boolean;
    hiddenKeys?: string[];
}

interface ProgramItemDetailsState {
    loading: boolean,
    ProgramItem: ProgramItem,
    chatSID: string | null,
    AttachmentTypes: AttachmentType[]
    isInRoom: boolean;
    sessions: ProgramSession[];
    events: ProgramSessionEvent[];
}

class ProgramItemDetails extends React.Component<ProgramItemDetailProps, ProgramItemDetailsState> {
    constructor(props: ProgramItemDetailProps) {
        super(props);
        this.state = {
            loading: true,
            ProgramItem: this.props.ProgramItem,
            chatSID: null,
            AttachmentTypes: [],
            sessions: [],
            events: [],
            isInRoom: this.props.isInRoom ? true : false
        };
    }

    async componentDidMount() {
        let item, attachmentTypes, itemKey;

        [item, attachmentTypes] = await Promise.all([
            this.props.appState?.programCache.getProgramItem(this.props.ProgramItem.id, this),
            this.props.appState?.programCache.getAttachmentTypes(this)]);

        let stateUpdate = {
            loading: false,
            error: null,
            ProgramItem: item,
            inBreakoutRoom: false,
            AttachmentTypes: attachmentTypes,
            chatSID: null,
            isInRoom: this.props.isInRoom ? true : false
        };
        if(item.get("events") && item.get("events").length){
            //load all of the sessions and times first
            let events = item.get("events")
                .map((e:ProgramSessionEvent)=>
                    this.props.appState?.programCache.getProgramSessionEvent(e.id, null));
            //@ts-ignore
            let evs = await Promise.all(events);
            // @ts-ignore
            let sessions = await Promise.all(evs.map((ev)=> this.props.appState?.programCache.getProgramSession(ev.get("programSession").id, null)));
            // @ts-ignore
            stateUpdate.sessions = sessions;
            // @ts-ignore
            stateUpdate.events = evs;
        }
        if (item.get("attachments")) {
            await Parse.Object.fetchAllIfNeeded(item.get("attachments"));
        }
        if (this.props.openChat)
            this.openChat(item);
        // @ts-ignore
        this.setState(stateUpdate);
    }

    componentWillUnmount() {
        this.maybeCloseChat();
        if(this.state.ProgramItem)
            this.props.appState?.programCache.cancelSubscription("ProgramItem", this, this.state.ProgramItem.id);
    }

    async openChat(item: ProgramItem){
        if (this.props.appState?.user) {
            if (item.get("track").get("perProgramItemChat")) {
                //Join the chat room
                let chatSID = item.get("chatSID");
                if (!chatSID) {
                    chatSID = await Parse.Cloud.run("chat-getSIDForProgramItem", {
                        programItem: item.id
                    });
                }
                if (chatSID) 
                    this.props.appState?.chatClient.openChatAndJoinIfNeeded(chatSID).then((sid)=>{
                        this.setState({chatSID: sid});
                    });
            }
        }
    }

    maybeCloseChat(){
        // this.props.appState?.chatClient.closeChatAndLeaveIfUnused(this.state.chatSID);
    }
    
    componentDidUpdate(prevProps: Readonly<ProgramItemDetailProps>, prevState: Readonly<ProgramItemDetailsState>, snapshot?: any): void {
        if(!this.props.openChat && prevProps.openChat)
        {
            this.maybeCloseChat();
        }
        else if(this.props.openChat && !prevProps.openChat){
            this.openChat(this.props.ProgramItem);
        }

        if(this.props.ProgramItem != prevProps.ProgramItem){
            this.maybeCloseChat();
            if(this.state.ProgramItem)
                this.props.appState?.programCache.cancelSubscription("ProgramItem", this, this.state.ProgramItem.id);
            this.componentDidMount();
        }
    }

    formatTime(timestamp: any) {
        return moment(timestamp).tz(timezone.tz.guess()).format('LLL z')
    }

    render() {
        if (this.state.loading)
            return <Spin/>
        let hasWritePerm = this.props.appState?.helpers.userHasWritePermission(this.state.ProgramItem);
        let authors = this.state.ProgramItem.get("authors") ? this.state.ProgramItem.get("authors") : [];
        let authorstr = "";
        let authorsArr = authors.map((a: ProgramPerson) => <ProgramPersonDisplay key={a.id} auth={this.props.appState}
                                                                                 id={a.id}/>);
        if (authorsArr.length >= 1)
            authorstr = authorsArr.reduce((prev: any, curr: any) => [prev, ", ", curr]);

        let sessionInfo;
        let now = Date.now();

        let roomInfo = <></>;
        let showSessionInfo = !this.props.hiddenKeys || !this.props.hiddenKeys.includes("session");
        if(this.state.events.length){
            let now = Date.now();
            sessionInfo = [];
            let hasValidEvents = false;
            for(let event of this.state.events){
                if(this.props.hiddenKeys && this.props.hiddenKeys.includes(event.id))
                    continue;
                hasValidEvents = true;
               let session = this.state.sessions.find(s=>s.id==event.get("programSession").id);
               if(session) {
                   var timeS = session.get("startTime") ? session.get("startTime") : new Date();
                   var timeE = session.get("endTime") ? session.get("endTime") : new Date();

                   let title = session.get("title");
                   if (session.get("room") && (!this.props.hiddenKeys || !this.props.hiddenKeys.includes("joinLive"))) { // && session.get("room").get("src1") == "YouTube") {
                       let when = "now"
                       if(timeS <= now && timeE >= now)
                           title = <a href="#" className="sessionLink" onClick={()=>{
                               // @ts-ignore
                               this.props.appState?.history.push("/live/" + when + "/" + session.get("room").get("name"))
                           }}>{title}</a>

                       // if (timeE >= now)
                       //     roomInfo = <Space><Button size="small" type="primary" onClick={() => {
                               // this.props.appState?.history.push("/live/" + when + "/" + session.get("room").get("name"))
                           // }}>Join Session</Button></Space>
                        /* BCP: Crista and i decided it doesn't make sense any more to have these links be live (because it's not clear where they should go)...
                       title = <a href="#" className="sessionLink" onClick={()=>{
                           // @ts-ignore
                           this.props.appState?.history.push("/live/" + when + "/" + session.get("room").get("name"))
                       }}>{title}</a>
                       */
                   }
                   sessionInfo.push(<div className="sessionListItem" key={event.id}>
                       {title} ({this.formatTime(event.get("startTime"))} - {this.formatTime(event.get('endTime'))})
                       {roomInfo}
                   </div>);
               }
            }
            // sessionInfo = <List>
            //     {sessionInfo}
            // </List>
            if (!hasValidEvents)
                showSessionInfo = false;
        }
        else if(this.state.ProgramItem.get("programSession")){
            let session = this.state.ProgramItem.get("programSession");
            let now = Date.now();
            var timeS = session.get("startTime") ? session.get("startTime") : new Date();
            var timeE = session.get("endTime") ? session.get("endTime") : new Date();

            if (session.get("room") && (!this.props.hiddenKeys || !this.props.hiddenKeys.includes("joinLive"))) { // && session.get("room").get("src1") == "YouTube") {
                let when = "now"
                if (timeE >= now)
                    roomInfo = <Button size="small" type="primary" onClick={() => {
                        this.props.appState?.history.push("/live/" + when + "/" + session.get("room").get("name"))
                    }}>Join Session</Button>
            }
            sessionInfo = <div>
                {session.get("title")} ({this.formatTime(session.get("startTime"))} - {this.formatTime(session.get('endTime'))})
                {roomInfo}
            </div>;
        }

        let additionalDescription =[];
        let externalLinks = [];
        if (this.state.ProgramItem.get("attachments")) {
            let attachments = this.state.ProgramItem.get("attachments").sort((a: ProgramItemAttachment, b: ProgramItemAttachment) => {
                if (!a.get("attachmentType"))
                    return -1;
                if (!b.get("attachmentType"))
                    return 1;
                let t1 = this.state.AttachmentTypes.find(v => v.id == a.get("attachmentType").id);
                let t2 = this.state.AttachmentTypes.find(v => v.id == b.get("attachmentType").id);
                if (t1 && t2 && t1.get("ordinal") < t2.get("ordinal"))
                    return -1;
                return 1;
            })
            for (let attachment of attachments) {
                let type = this.state.AttachmentTypes.find(v => v && v.id == attachment.get("attachmentType").id);
                if(!type)
                    continue;
                let deleteButton = <></>

                if (hasWritePerm)
                    deleteButton =
                        <Popconfirm title={"Are you sure you want to delete this " + type.get('name') + " attachment?"}
                                    onConfirm={
                                        () => {
                                            attachment.destroy();
                                            message.success("Attachment deleted.");
                                        }
                                    }><Button danger size="small">Delete</Button></Popconfirm>
                if (type.get("displayAsLink")) {
                    let url = attachment.get("url");
                    if (!url)
                        url = attachment.get("file").url();
                    externalLinks.push(<span key={attachment.id}><a href={url}
                                                                    target="_blank">{type.get("name")}</a>&nbsp;&nbsp;&nbsp;&nbsp;{deleteButton}</span>);
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
                // @ts-ignore
                additionalDescription.push(<Descriptions.Item key="externalLinks" label="External Links">{externalLinks.reduce((prev,curr) => [prev,", ",curr])}</Descriptions.Item>)
            }
        }
        additionalDescription.push(<Descriptions.Item key="actions" label="Actions">
            <Space align="center">
                {this.props.appState?.user  && this.state.ProgramItem.get("breakoutRoom")? <Button disabled={this.state.isInRoom} type="primary" onClick={()=>{
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
                conference={this.props.appState != null ? this.props.appState.currentConference : null}
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
                    {showSessionInfo ? <Descriptions.Item label="Schedule">{sessionInfo}</Descriptions.Item> : <></>}
                    <Descriptions.Item label="Abstract"><ReactMarkdown source={this.state.ProgramItem.get("abstract")} renderers={{link:
                    this.linkRenderer}}/></Descriptions.Item>
                    {additionalDescription}
                </Descriptions>
            </div>
            <div className="embeddedVideoRoom">
                {videoRoom}
            </div>
        </div>
    }
    linkRenderer = (props: any) => {
        let currentDomain = window.location.origin;
        if(props.href && props.href.startsWith(currentDomain))
            return <a href="#" onClick={()=>{this.props.appState?.history.push(props.href.replace(currentDomain,""))}}>{props.children}</a>;
        return <a href={props.href} target="_blank">{props.children}</a>;
    };

}

const
    AuthConsumer = (props: PublicProgramItemDetailProps) => (
        <AuthUserContext.Consumer>
            {value => (
                <ProgramItemDetails {...props} appState={value}/>
            )}
        </AuthUserContext.Consumer>

    );

export default AuthConsumer;