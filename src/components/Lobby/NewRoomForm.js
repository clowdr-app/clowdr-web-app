import React from "react";
import {Button, Form, Input, message, Modal, Radio, Select} from "antd";
import {AuthUserContext} from "../Session";
import {withRouter} from "react-router-dom";

class NewRoomForm extends React.Component {

    state = {
        ModalText: 'Content of the modal',
        visible: this.props.visible,
        confirmLoading: false,
    };

    showModal = () => {
        this.setState({
            visible: true,
        });
    };

    handleOk = () => {
        this.setState({
            ModalText: 'The modal will be closed after two seconds',
            confirmLoading: true,
        });
        setTimeout(() => {
            this.setState({
                visible: false,
                confirmLoading: false,
            });
        }, 2000);
    };

    handleCancel = () => {
        console.log('Clicked cancel button');
        this.setState({
            visible: false,
        });

    };

    render() {
        const { visible, confirmLoading, ModalText } = this.state;
        let buttonText = (this.props.text ? this.props.text : "New Room");
        let buttonType= (this.props.type ? this.props.type : "primary");
        return (
            <div>
                <Button type={buttonType} onClick={this.showModal} style={this.props.style}>
                    {buttonText}
                </Button>
                <Modal
                    zIndex="2000"
                    title="Create a new video chat room"
                    visible={visible}
                    // onOk={this.handleOk}
                    confirmLoading={confirmLoading}
                    footer={[
                        <Button form="myForm" key="submit" type="primary" htmlType="submit" loading={confirmLoading}>
                            Create and Join
                        </Button>
                    ]}
                    onCancel={this.handleCancel}
                >
                    <Form
                        layout="vertical"
                        name="form_in_modal"
                        id="myForm"
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
                            const data = await fetch(
                                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/new`
                                , {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        room: values.title,
                                        visibility: values.visibility,
                                        category: values.category,
                                        persistence: values.persistence,
                                        mode: values.mode,
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
                                this.setState({confirmLoading: false, visible: false})
                                this.props.history.push("/video/" + encodeURI(this.props.auth.currentConference.get("conferenceName")) + "/" + encodeURI(values.title));
                            }
                        }}
                    >
                        <Form.Item
                            name="title"
                            label="Title"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input the title for your video room.',
                                },
                            ]}
                        >
                            <Input/>
                        </Form.Item>
                        <Form.Item
                            name="category"
                            label="Category"
                        >
                            <Select>
                                <Select.Option value="general">General</Select.Option>
                                <Select.Option value="bof">Birds-of-a-Feather</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="persistence"
                            label="Persistence"
                            extra={"Ephemeral rooms disappear 5 minutes after the last participant leaves"}>
                            <Radio.Group buttonStyle="solid">
                                <Radio.Button value="ephemeral">Ephemeral</Radio.Button>
                                <Radio.Button value="persistent">Persistent</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="mode"
                            label="mode"
                            extra={"Peer-to-peer is best for 2 participants, small-group up to 4, large group up to 50"}>
                            <Radio.Group buttonStyle="solid">
                                <Radio.Button value="peer-to-peer">Peer-to-Peer</Radio.Button>
                                <Radio.Button value="group-small">Small Group</Radio.Button>
                                <Radio.Button value="group">Large Group</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            name="visibility"
                            label="Visibility"
                            extra={"All video calls can be joined by any member of the " + this.props.auth.currentConference.get("conferenceName") +" slack workspace. " +
                            "However, you can restrict others from finding this room by selecting unlisted and can then share a link to join it"
                            }
                        >
                            <Radio.Group buttonStyle="solid">
                                <Radio.Button value="listed">Listed</Radio.Button>
                                <Radio.Button value="unlisted">Unlisted</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        );
    }
}
const AuthConsumer = (props) => (
            <AuthUserContext.Consumer>
                {value => (
                    <NewRoomForm {...props} auth={value} />
                )}
            </AuthUserContext.Consumer>

);
export default withRouter(AuthConsumer);