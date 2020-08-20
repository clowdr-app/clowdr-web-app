import React from "react";
import {AuthUserContext} from "../Session";
import Parse from "parse"
import {Badge, Button, Tag, Tooltip} from "antd";
import {ShrinkOutlined, ExpandAltOutlined} from "@ant-design/icons";
// @ts-ignore
import {Document, Page, pdfjs} from 'react-pdf';
import VideoRoom from "../VideoChat/VideoRoom";
import {ChatChannelConsumer, ClowdrState, JoinedChatChannel, MultiChatApp} from "../../ClowdrTypes";
import ProgramItem from "../../classes/ProgramItem";
import ProgramPerson from "../../classes/ProgramPerson";
import AttachmentType from "../../classes/AttachmentType";
import ProgramItemAttachment from "../../classes/ProgramItemAttachment";
import ChatChannelChanger from "./ChatChannelChanger"
import ChatFrame from "./ChatFrame"
import ChatChannelArea from "./ChatChannelArea"
import {Channel} from "twilio-chat/lib/channel";
import MultiChatWindowHeader from "./MultiChatWindowHeader";

var moment = require('moment');
var timezone = require('moment-timezone');

interface MultiChatWindowProps {
    appState: ClowdrState | null;
    addUser: (sid: string)=>void;
    toVideo: (sid:string)=>void;
    setChatWindowHeight: (heightWithPxSuffix:string)=>void;
    parentRef: any;
}

interface MultiChatWindowState {
    loading: boolean,
    activeChatSID?: string,
    joinedChannels: string[],
    expanded: boolean,
    nDMs: number,
    nSubscribedMessages: number,
    nOtherMessages: number,
    nPaperMessages: number

}


class MultiChatWindow extends React.Component<MultiChatWindowProps, MultiChatWindowState> implements MultiChatApp {
    private joinedChannels: string[];
    private allChannels: Channel[];
    private channelConsumers: ChatChannelConsumer[];
    private unreadConsumers: Map<string, object[]>;
    private unreadCounts: Map<string, {count : number, category : string}>; // sid -> {count, category}
    private notificationHeader?: MultiChatWindowHeader;
    constructor(props: MultiChatWindowProps) {
        super(props);
        this.unreadConsumers = new Map<string, object[]>();
        this.unreadCounts = new Map<string, {count : number, category : string}>();
        this.state = {
            loading: true,
            activeChatSID: undefined,
            joinedChannels: [],
            expanded: true,
            nDMs: 0,
            nSubscribedMessages: 0,
            nOtherMessages: 0,
            nPaperMessages: 0                    
        };
        this.joinedChannels = [];
        this.allChannels = [];
        this.channelConsumers = [];
    }

    registerUnreadConsumer(sid: string, category: string, consumer: any): void {
        if(!this.unreadConsumers?.get(sid)){
            this.unreadConsumers.set(sid, []);
        }
        //@ts-ignore
        this.unreadConsumers.get(sid).push(consumer);

        this.unreadCounts.set(sid, {count: 0, category: category});
    }

    cancelUnreadConsumer(sid: string, consumer: any): void {
        if(this.unreadConsumers.get(sid)){
            //@ts-ignore
            this.unreadConsumers.set(sid, this.unreadConsumers.get(sid).filter(v=>v!=consumer));
        }
    }

    registerChannelConsumer(consumer: ChatChannelConsumer): void {
        if(this.joinedChannels.length > 0){
            consumer.setJoinedChannels(this.joinedChannels);
        }
        if(this.allChannels.length > 0){
            consumer.setAllChannels(this.allChannels);
        }
        this.channelConsumers.push(consumer);
    }

    openChat(sid: string, dontBringIntoFocus: boolean): void {
        this.setState({activeChatSID: sid});
    }

    setAllChannels(channels: Channel[]){
        this.allChannels = channels;
        for(let consumer of this.channelConsumers){
            consumer.setAllChannels(channels);
        }
    }

    setJoinedChannels(channels: string[]){
        this.joinedChannels = channels;
        this.setState({joinedChannels: channels});
        for (let consumer of this.channelConsumers){
            consumer.setJoinedChannels(channels);
        }
        // this.setState({channels: channels, loading: false});
    }

    componentDidMount(): void {
        this.props.appState?.chatClient.initMultiChatWindow(this);
    }

    setUnreadCount(sid: string, count: number){
        if (this.unreadConsumers.get(sid)){
            //@ts-ignore
            for (let consumer of this.unreadConsumers.get(sid)){
                //@ts-ignore
                consumer.setState({unread: count});
            }
        }
        let obj = this.unreadCounts.get(sid);
        if (obj) {
            let oldCount = obj.count;
            let cat = obj.category;
            if (cat == "dm")
                this.notificationHeader?.setState({nDMs: Math.max(0, this.notificationHeader?.state.nDMs + count - oldCount)});
            else if (cat =="subscriptions")
                this.notificationHeader?.setState({nSubscribedMessages: Math.max(0, this.notificationHeader?.state.nSubscribedMessages + count - oldCount)});
            else if (cat =="others")
                this.notificationHeader?.setState({nOtherMessages: Math.max(0, this.notificationHeader?.state.nOtherMessages + count - oldCount)});
            else if (cat =="papers")
                this.notificationHeader?.setState({nPaperMessages: Math.max(0, this.notificationHeader?.state.nPaperMessages + count - oldCount)});

            this.unreadCounts.set(sid, {count: count, category: cat});
        }
    }

    changeSize(expand: boolean) {
        let height = expand ? '300px' : '35px';
        this.props.setChatWindowHeight(height);
        this.setState({expanded: expand})
    }


    render() {
        // if (this.state.loading)
        //     return <Spin/>


        let icon = this.state.expanded ? <ShrinkOutlined title="Minimize panel"/> : <ExpandAltOutlined title="Expand panel"/>
        let actions = <span className="actions">
            <Button type="primary" shape="round" icon={icon}
                        onClick={this.changeSize.bind(this, !this.state.expanded)}/></span> 
        
        return <div className="multiChatWindow">
            <div className="multiChatWindowHeader"><span className="title">Text Channels</span> <MultiChatWindowHeader onMount={(header)=>{
                this.notificationHeader = header;
            }}/> {actions}</div>
            <div
                className="multiChatWindowContent"
        >
                <div className="multiChatChannelChanger"><ChatChannelChanger multiChatWindow={this} />
                </div>
                <div className="multiChatWindowChatArea">
                    {
                        this.state.joinedChannels
                            // .filter(sid=>{
                            // @ts-ignore
                            // let chan = this.props.appState?.chatClient.joinedChannels[sid];
                            // if(chan){
                            //     if(chan.attributes && chan.attributes.category != 'socialSpace')
                            //         return true;
                            // }
                            // return false;
                        // })
                            //Uncomment above to hide social-space chats
                    .map((sid)=>{
                            return <div key={sid} className={sid == this.state.activeChatSID ? "visibleChat" : "hiddenChat"}>
                                <ChatChannelArea sid={sid} visible={this.state.activeChatSID == sid}
                                                 toVideo={this.props.toVideo.bind(null, sid)}
                                                 addUser={this.props.addUser.bind(null, sid)}
                                                 parentRef={this.props.parentRef}
                                                 multiChatWindow={this}
                                />
                            </div>
                        })
                    }
                    {/*<div className="embeddedChatListContainer">Messages!</div>*/}
                    {/*<div className="multiChatMessageEntry">Enter your message here</div>*/}

                </div>

            </div></div>
        }
}

const
    AuthConsumer = (props: MultiChatWindowProps) => (
        <AuthUserContext.Consumer>
            {value => (
                <MultiChatWindow {...props} appState={value}/>
            )}
        </AuthUserContext.Consumer>

    );

export default AuthConsumer;