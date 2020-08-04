import React from "react";
import {Button, Form, Input, message, Modal, Skeleton, Tooltip, Typography} from "antd";
import {AuthUserContext} from "../Session";
import {withRouter} from "react-router-dom";
import IconButton from "@material-ui/core/IconButton";
import SecurityIcon from "@material-ui/icons/Security";
import Parse from "parse"

class ReportToModsButton extends React.Component {

    state = {
        ModalText: 'Content of the modal',
        visible: this.props.visible,
        confirmLoading: false,
        loading: true,
        users: {}
    };

    constructor(props) {
        super(props);
        this.form = React.createRef();
    }

    showModal = () => {
        this.setState({
            visible: true,
        });
    };

    componentDidMount() {
        this.canceled = false;
        this.promise = this.loadMembers();
    }

    componentWillUnmount() {
        this.canceled = true;
    }

    async loadMembers() {
        let roomQ = new Parse.Query("BreakoutRoom");
        roomQ.include("members");
        let room = await roomQ.get(this.props.room.id);
        if (!this.canceled)
            this.setState({room: room, loading: false});
    }

    handleCancel = () => {
        this.setState({
            visible: false,
        });

    };

    render() {
        const { visible, confirmLoading, ModalText } = this.state;
        let buttonText = (this.props.text ? this.props.text : "Send Report");
        let buttonType = (this.props.type ? this.props.type : "primary");
        let currentParticipants = "";
        let participantIDArray = [];
        if (this.state.loading)
            currentParticipants = <Skeleton.Input/>
        else {
            if (this.state.room.get("members")) {
                for (let user of this.state.room.get('members')) {
                    participantIDArray.push(user.id);
                    currentParticipants += user.get("displayName") + ", ";
                }
            }
            if (currentParticipants.length > 0)
                currentParticipants = currentParticipants.substring(0, currentParticipants.length - 2);
            else
                currentParticipants = "(Unable to load participants. Please describe in detail what happened)";

        }
        return (
            <span>
                <Tooltip mouseEnterDelay={0.5} title="Report inappropriate behavior to the moderators">

                    <IconButton onClick={this.showModal}>
                        <SecurityIcon color="secondary" />
                    </IconButton>
                </Tooltip>
                <Modal
                    zIndex="2000"
                    title="Report Inappropriate Behavior to Moderators"
                    visible={visible}
                    // onOk={this.handleOk}
                    confirmLoading={confirmLoading}
                    footer={[
                        <Button form="modreportform" key="submit" type="primary" htmlType="submit" loading={confirmLoading}>
                            Send Report
                        </Button>
                    ]}
                    onCancel={this.handleCancel}
                >
                    <Typography.Paragraph>
                        All participants are expected to follow the {this.props.auth.currentConference.get("conferenceName")} code of conduct.
                        We take inappropriate behavior seriously, and we have a team of moderators ready to help.
                        Please use this form to make a report to the moderators, who will respond to you privately.
                        Please note that since moderators are volunteers, we are unable to provide 24/7 moderation service,
                        but we will do our best to address every complaint as quickly as possible.
                    </Typography.Paragraph>
                    <Typography.Paragraph>
                        This report will automatically capture the current list of participants in this chat:
                        {currentParticipants}
                    </Typography.Paragraph>
                    <Form
                        layout="vertical"
                        name="form_in_modal"
                        id="modreportform"
                        ref={this.form}
                        initialValues={{
                            visibility: 'listed',
                            category: 'general',
                            mode: 'group-small',
                            persistence: 'ephemeral'
                        }}
                        onFinish={async (values) => {
                            this.setState({confirmLoading: true});
                            let user = this.props.auth.user;
                            let idToken = user.getSessionToken();
                            try {
                                const data = await fetch(
                                    `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/moderator/fromVideo`
                                    , {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            roomID: this.state.room.id,
                                            message: values.message,
                                            participants: participantIDArray,
                                            identity: idToken,
                                            slackTeam: this.props.auth.currentConference.get("slackWorkspace"),
                                        }),
                                        headers: {
                                            'Content-Type': 'application/json'
                                        }
                                    });
                                let res = await data.json();
                                if (res.status == "error") {
                                    message.error(res.message);
                                    this.setState({confirmLoading: false})
                                } else {
                                    this.form.current.resetFields();
                                    this.setState({confirmLoading: false, visible: false, success: true})
                                }
                            }catch(err){
                                message.error("An internal error has occurred");
                                this.setState({confirmLoading: false})

                            }
                        }} >
                        <Form.Item
                            name="message"
                            label="Message"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please describe what went wrong.',
                                },
                            ]} >
                            <Input.TextArea rows={6} />
                        </Form.Item>
                    </Form>
                </Modal>
            </span>
        );
    }
}

const AuthConsumer = (props) => (
            <AuthUserContext.Consumer>
                {value => (
                    <ReportToModsButton {...props} auth={value} />
                )}
            </AuthUserContext.Consumer>

);

export default withRouter(AuthConsumer);
