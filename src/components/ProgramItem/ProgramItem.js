import React from "react";
import ProgramItemDetails from "../ProgramItem/ProgramItemDetails";

import {AuthUserContext} from "../Session";
import {Alert, Spin} from "antd";
import {pdfjs} from 'react-pdf';

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
        let [user, item] = await Promise.all([this.props.auth.refreshUser(), this.props.auth.programCache.getProgramItemByConfKey(itemKey, this)]);

        if (!item) {
            this.setState({loading: false, error: "Unable to find the program item '" + itemKey + "'"});
        } else {
            let stateUpdate = {loading: false, error: null, ProgramItem: item};
            if (user) {
                if(item.get("chatSID")){
                    this.props.auth.helpers.setGlobalState({forceChatOpen: true, chatChannel: item.get("chatSID")});
                }
            }
            this.setState(stateUpdate);
        }
    }

    componentWillUnmount() {
        if(this.state.ProgramItem)
            this.props.auth.programCache.cancelSubscription("ProgramItem", this, this.state.ProgramItem.id);
        this.props.auth.helpers.setGlobalState({chatChannel: null, forceChatOpen: false});
        this.props.auth.setSocialSpace("Lobby");
    }

    async componentDidUpdate(prevProps) {
        let itemKey = this.props.match.params.programConfKey1 + "/" + this.props.match.params.programConfKey2;
        if (this.state.itemKey != itemKey) {
            this.props.auth.programCache.cancelSubscription("ProgramItem", this, this.state.ProgramItem.id);
            this.componentDidMount();
        }
    }

    formatTime(timestamp) {
        return moment(timestamp).tz(timezone.tz.guess()).format('LLL z')
    }

    render() {
        if (this.state.loading)
            return <Spin/>
        if (this.state.error) {
            return <Alert
                message="Unable to load program item"
                description={this.state.error}
                type="error"
            />
        }
        return <ProgramItemDetails ProgramItem={this.state.ProgramItem} isInRoom={this.state.isInRoom} openChat={true} />
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