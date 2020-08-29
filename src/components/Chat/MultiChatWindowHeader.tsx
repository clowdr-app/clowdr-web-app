import React from "react";
import { Badge, Tag, Tooltip } from "antd";

interface MultiChatWindowHeaderProps {
    onMount: (header: MultiChatWindowHeader) => void;
}

interface MultiChatWindowHeaderState {
    nDMs: number,
    nSubscribedMessages: number,
    nOtherMessages: number,
    nPaperMessages: number

}


export default class MultiChatWindowHeader extends React.Component<MultiChatWindowHeaderProps, MultiChatWindowHeaderState> {
    constructor(props: MultiChatWindowHeaderProps) {
        super(props);
        this.state = {
            nDMs: 0,
            nSubscribedMessages: 0,
            nOtherMessages: 0,
            nPaperMessages: 0
        };

    }

    componentDidMount(): void {
        this.props.onMount(this);
    }

    notificationSummary(unreadCount: number, tooltipText: string, className: string, shortName: string) {
        if (unreadCount <= 0)
            return "";
        return <Tooltip title={tooltipText} key={shortName}><Tag><Badge count={unreadCount} className={className} overflowCount={99} />{shortName}</Tag></Tooltip>
    }
    render() {
        // if (this.state.loading)
        //     return <Spin/>
        // let nMessages = {
        //     nDMs: 0,
        //     nMyChannelMessages: 0,
        //     otherChannelMessages: 0,
        //     paperChannelMessages: 0
        // }

        let notifications = <span className="notifications">
            {this.notificationSummary(this.state.nDMs, "New Direct Messages", "dms", "DMs")}
            {this.notificationSummary(this.state.nSubscribedMessages, "New messages in subscribed channels", "subscribed", "in subscribed channels")}
            {this.notificationSummary(this.state.nPaperMessages, "New messages in paper channels", "papers", "in paper channels")}
            {/*{this.notificationSummary(4,"New Direct Messages","dms","DMs")}*/}
            {/*<Badge count={this.state.nDMs}  title="New DMs" />&nbsp;*/}
            {/*<Badge count={this.state.nSubscribedMessages}  title="New messages in subscribed channels" style={{ backgroundColor: '#CD2EC9' }}/>&nbsp;*/}
            {/*<Badge count={this.state.nOtherMessages}  title="New messages in other channels" style={{ backgroundColor: '#151388' }}/>&nbsp;*/}
            {/*<Badge count={this.state.nPaperMessages}  title="New messages in paper channels" style={{ backgroundColor: '#087C1D' }}/>*/}
        </span>;

        return notifications;
    }
}

