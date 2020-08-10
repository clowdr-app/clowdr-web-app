import React from "react";
import {AuthUserContext} from "../Session";
import Parse from "parse"
import {Button, Descriptions, Divider, Menu, message, Popconfirm, Space, Spin, Tooltip} from "antd";
// @ts-ignore
import {Document, Page, pdfjs} from 'react-pdf';
import VideoRoom from "../VideoChat/VideoRoom";
import {ChatChannelConsumer, ClowdrState, JoinedChatChannel, MultiChatApp} from "../../ClowdrTypes";
import ProgramItem from "../../classes/ProgramItem";
import ProgramPerson from "../../classes/ProgramPerson";
import AttachmentType from "../../classes/AttachmentType";
import ProgramItemAttachment from "../../classes/ProgramItemAttachment";
import { Resizable, ResizableBox } from 'react-resizable';
import CollapsedChatDisplay from "./CollapsedChatDisplay";
import ChatChannelChanger from "./ChatChannelChanger"
import ChatFrame from "./ChatFrame"
import ChatChannelArea from "./ChatChannelArea"
import {Channel} from "twilio-chat/lib/channel";

var moment = require('moment');
var timezone = require('moment-timezone');

interface MultiChatWindowProps {
    appState: ClowdrState | null;
    addUser: (sid: string)=>void;
    toVideo: (sid:string)=>void;
    parentRef: any;
}

interface MultiChatWindowState {
    loading: boolean,
    activeChatSID?: string,
    joinedChannels: string[]
}


class MultiChatWindow extends React.Component<MultiChatWindowProps, MultiChatWindowState> implements MultiChatApp {
    private joinedChannels: string[];
    private allChannels: Channel[];
    private channelConsumers: ChatChannelConsumer[];
    private unreadConsumers: Map<string, object[]>;
    constructor(props: MultiChatWindowProps) {
        super(props);
        this.unreadConsumers = new Map<string, object[]>();
        this.state = {
            loading: true,
            activeChatSID: undefined,
            joinedChannels: []
        };
        this.joinedChannels = [];
        this.allChannels = [];
        this.channelConsumers = [];
    }

    registerUnreadConsumer(sid: string, consumer: any): void {
        if(!this.unreadConsumers?.get(sid)){
            this.unreadConsumers.set(sid, []);
        }
        //@ts-ignore
        this.unreadConsumers.get(sid).push(consumer);
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
        console.log("Opening chat: " + sid)
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
        for(let consumer of this.channelConsumers){
            consumer.setJoinedChannels(channels);
        }
        // this.setState({channels: channels, loading: false});
    }
    componentDidMount(): void {
        this.props.appState?.chatClient.initMultiChatWindow(this);
    }

    setUnreadCount(sid: string, count: number){
        if(this.unreadConsumers.get(sid)){
            //@ts-ignore
            for(let consumer of this.unreadConsumers.get(sid)){
                //@ts-ignore
                consumer.setState({unread: count});
            }
        }
    }

    render() {
        // if (this.state.loading)
        //     return <Spin/>

        return <div className="multiChatWindow"><ResizableBox width={800} height={300} minConstraints={[100,100]} maxConstraints={[1000,1000]}
                             resizeHandles={['ne','n','e']}
                                                              className="multiChatWindowFrame"
                             axis={"both"}
        >
            <div className="multiChatWindowHeader">Chat</div>
            <div
                className="multiChatWindowContent"
        >
                <div className="multiChatChannelChanger"><ChatChannelChanger multiChatWindow={this} />
                </div>
                <div className="multiChatWindowChatArea">
                    {
                        this.state.joinedChannels.filter(sid=>{
                            // @ts-ignore
                            let chan = this.props.appState?.chatClient.joinedChannels[sid];
                            if(chan){
                                if(chan.attributes && chan.attributes.category != 'socialSpace')
                                    return true;
                            }
                            return false;
                        }).map((sid)=>{
                            return <div key={sid} className={sid == this.state.activeChatSID ? "visibleChat" : "hiddenChat"}>
                                <ChatChannelArea sid={sid} visible={this.state.activeChatSID == sid}
                                                 toVideo={this.props.toVideo.bind(sid)}
                                                 addUser={this.props.addUser.bind(sid)}
                                                 parentRef={this.props.parentRef}
                                                 multiChatWindow={this}
                                />
                            </div>
                        })
                    }
                    {/*<div className="embeddedChatListContainer">Messages!</div>*/}
                    {/*<div className="multiChatMessageEntry">Enter your message here</div>*/}

                </div>

            </div></ResizableBox></div>
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