import React from "react";
import {AuthUserContext} from "../Session";
import {withRouter} from "react-router-dom";
import Parse from "parse";
import {Badge, Button, Divider, Form, Input, Select, Skeleton, Spin, Tooltip} from "antd";

import {isDNDColor,isAvailableColor, isLookingForConversationColor} from "./LobbyColors";

let UserProfile = Parse.Object.extend("UserProfile");

let UserPresence = Parse.Object.extend("UserPresence");

class PresenceForm extends React.Component {
    constructor(props) {
        super(props);
        this.form = React.createRef();

        this.state= {dirty: false};
    }

    componentDidMount() {
        this.initStatusFromProps()
    }
    async initStatusFromProps(){
        let myStatus = this.props.auth.userProfile.get("presence");
        let isShowNewStatus = false;
        if (!myStatus) {
            try {
                isShowNewStatus = true;
                //Create a new one...
                let presence = new UserPresence();
                presence.set("user", this.props.auth.userProfile);
                presence.set("isAvailable", true);
                presence.set("isDND", false);
                presence.set("isDNT", false);
                presence.set("isLookingForConversation", false);
                presence.set("isOpenToConversation", false);
                presence.set("isOnline", true);
                presence.set("conference", this.props.auth.currentConference);
                presence.set("socialSpace", this.props.auth.activeSpace);

                let presenceACL = new Parse.ACL();
                presenceACL.setPublicReadAccess(false);
                presenceACL.setRoleReadAccess(this.props.auth.currentConference.id + "-conference", true);
                presenceACL.setWriteAccess(this.props.auth.user, true);
                presenceACL.setReadAccess(this.props.auth.user, true);

                presence.setACL(presenceACL);
                await presence.save();
                myStatus = presence;
                this.props.auth.userProfile.set("presence", presence);
                await this.props.auth.userProfile.save();
            }catch(err){
                console.log(err);
            }
        }
        this.setState({presence: myStatus, isShowWelcome: isShowNewStatus});
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.props.auth.userProfile.get("presence") && this.props.auth.userProfile.get("presence") != this.state.presence){
            this.setState({presence: this.props.auth.userProfile.get("presence")});
        }
    }

    async updatePresence(values) {
        let theValue = values.target.value;
        if(theValue != this.state.presence.get("status")) {
            this.setState({saving: true})

            this.state.presence.set("status", theValue);
            await this.state.presence.save();

            this.props.auth.helpers.updateMyPresence(this.state.presence);

            this.setState({saving: false, visible: false})
        }
    }

    isDifferentStatus(availabilityString, presence) {
        return !presence.get(availabilityString);
    }

    async valuesChange(value) {
        if (value!= this.state.presence.get("status") || this.isDifferentStatus(value, this.state.presence)){
            this.setState({saving: true});
            if (value== "isDNT" && !this.state.presence.get("isDNT")) {
                //set the ACL
                let acl = this.state.presence.getACL();
                acl.setRoleReadAccess(this.props.auth.currentConference.id + "-conference", false);
                acl.setReadAccess(this.props.auth.user, true);
            } else if (this.state.presence.get("isDNT") && value!= "isDNT") {
                //relase ACL
                let acl = this.state.presence.getACL();
                acl.setRoleReadAccess(this.props.auth.currentConference.id + "-conference", true);

            }
            this.state.presence.set("isLookingForConversation", false);
            this.state.presence.set("isOpenToConversation", false);
            this.state.presence.set("isAvailable", false);
            this.state.presence.set("isDND", false);
            this.state.presence.set("isDNT", false);
            this.state.presence.set(value, true);
            this.props.auth.helpers.updateMyPresence(this.state.presence);
            await this.state.presence.save();
            this.setState({saving: false})

        }
        else{
            this.setState({dirty: false});
        }
    }

    availabilityByPresence(presence) {
        if (presence.get("isLookingForConversation")) {
            return "isLookingForConversation";
        } else if (presence.get("isOpenToConversation")) {
            return "isOpenToConversation";
        } else if (presence.get("isAvailable")) {
            return "isAvailable";
        } else if (presence.get("isDND")) {
            return "isDND";
        } else if (presence.get("isDNT")) {
            return "isDNT";
        }
    }
    handleCancel = () => {
        if (this.form && this.form.current)
            this.form.current.resetFields();
        this.setState({
            visible: false,
            confirmLoading: false
        });

    };

    render() {
        const layout = {
            labelCol: { span: 8 },
            wrapperCol: { span: 16 },
        };
        const tailLayout = {
            wrapperCol: {offset: 8, span: 16},
        };

        return <></>
//         if(!this.state.presence)
//             return <Skeleton.Input />
//         return <div>
//             My status:
//             <Form layout="inline"
//                   ref={this.form}
//                   id="statusForm"
//                   initialValues={{
//                       status: this.state.presence.get("status"),
//                       availability: this.availabilityByPresence(this.state.presence)
//                   }
//                   }>
//
//                     <Form.Item name="availability">
//             <Select
//                 // style={{ width: 240 }}
//                 // placeholder="Availability"
//                 onChange={this.valuesChange.bind(this)}
//                 loading={this.state.saving}
//                 dropdownMatchSelectWidth={false}
//                 dropdownRender={menu => (
//                     <div className="availabilityOptionsOpen">
//                         {menu}
//                     </div>
//                 )}
//             >
//             {/* BCP: Not sure I got this quite right -- I'm not certain what status="processing" does... */}
//             <Select.Option value="isAvailable"><Badge color={isAvailableColor}/><span className="availabilityOption">(No special status)</span></Select.Option>
//             <Select.Option value="isLookingForConversation"><Badge status="processing" color={isLookingForConversationColor} /><span className="availabilityOption">Looking for conversation</span></Select.Option>
//             <Select.Option value="isDND"><Badge color={isDNDColor}/><span className="availabilityOption">Busy: do not disturb</span></Select.Option>
//                 <Select.Option value="isDNT"><Badge status="default"/><span className="availabilityOption">Do not show others
//                     my presence/status</span></Select.Option>
//             {/*
//                <Select.Option value="isOpenToConversation"><Badge color="black" /><span className="availabilityOption">Open to conversation</span></Select.Option> */}
//         {/*
//             <Select.Option value="isAvailable"><Badge color="geekblue"/><span className="availabilityOption">In a conversation: come
//                     join if you like</span></Select.Option>
// */}
//
//             </Select>
//                     </Form.Item>
//                 <Form.Item name="status">
//                     <Tooltip mouseEnterDelay={0.5} defaultVisible={this.state.isShoWWelcome} title="CLOWDR shows other participants your availability based on this indicator. Use this dropdown to set your availability, then set a status message to make
//                     it easier for other participants to know when it's OK to contact you."
//                              placement={"top"}
//                     >
//                     <Input placeholder="Status message" onBlur={this.updatePresence.bind(this)} onPressEnter={this.updatePresence.bind(this)}
//                            autoComplete="off"
//                            disabled={this.state.saving} />
//                     </Tooltip>
//                 </Form.Item>
//                 {/*<Button type="primary" htmlType="submit" disabled={!this.state.dirty} loading={this.state.saving}>*/}
//                 {/*    Update Status*/}
//                 {/*</Button>*/}
//             </Form>
//             {/*<Modal*/}
//             {/*    zIndex="200"*/}
//             {/*    title="Update your status"*/}
//             {/*    visible={this.state.visible}*/}
//             {/*    confirmLoading={this.state.saving}*/}
//             {/*    footer={[*/}
//             {/*        <Button form="statusForm" key="submit" type="primary" htmlType="submit" disabled={!this.state.dirty} loading={this.state.saving}>*/}
//             {/*            Update*/}
//             {/*        </Button>*/}
//             {/*    ]}*/}
//             {/*    onCancel={this.handleCancel}*/}
//             {/*>*/}
//             {/*<Form {...layout} onFinish={this.updatePresence.bind(this)} onValuesChange={this.valuesChange.bind(this)}*/}
//             {/*      ref={this.form}*/}
//             {/*      id="statusForm"*/}
//             {/*      initialValues={{*/}
//             {/*    status: this.state.presence.get("status"),*/}
//             {/*    availability: this.availabilityByPresence(this.state.presence)*/}
//             {/*}*/}
//             {/*}>*/}
//             {/*    <Form.Item label="Availability" name="availability">*/}
//             {/*        <Select style={{width: "100%"}}>*/}
//             {/*            <Select.Option value="isLookingForConversation"><Badge status="success"/>Looking for conversation</Select.Option>*/}
//             {/*            <Select.Option value="isAvailable"><Badge status="processing"/>In a conversation; but come*/}
//             {/*                join if you like</Select.Option>*/}
//             {/*            <Select.Option value="isDND"><Badge status="warning"/>Busy / Do Not Disturb</Select.Option>*/}
//             {/*            <Select.Option value="isDNT"><Badge status="default"/>Do not show others*/}
//             {/*                my presence/status</Select.Option>*/}
//             {/*        </Select>*/}
//             {/*    </Form.Item>*/}
//             {/*    <Form.Item label="Status" name="status">*/}
//             {/*        <Input placeholder="Share a status message for other attendees to see at a glance" />*/}
//             {/*    </Form.Item>*/}
//
//             {/*</Form>*/}
//             {/*</Modal>*/}
//         </div>
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <PresenceForm {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default withRouter(AuthConsumer);
