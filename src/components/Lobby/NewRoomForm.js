import React from "react";
import {Button, Form, Input, message, Modal} from "antd";
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
        return (
            <div>
                <Button type="primary" onClick={this.showModal}>
                    New Video Room
                </Button>
                <Modal
                    zIndex="2000"
                    title="Create a new video room"
                    visible={visible}
                    // onOk={this.handleOk}
                    confirmLoading={confirmLoading}
                    footer={[
                        <Button form="myForm" key="submit" type="primary" htmlType="submit" loading={confirmLoading}>
                            Submit
                        </Button>
                    ]}
                    onCancel={this.handleCancel}
                >
                    <Form
                        layout="vertical"
                        name="form_in_modal"
                        id="myForm"
                        initialValues={{
                            modifier: 'public',
                        }}
                        onFinish={async (values) => {
                            this.setState({confirmLoading: true});
                            let user = this.props.auth.user;
                            let idToken = user.getSessionToken();
                            const data = await fetch(
                                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/new`

                                // 'http://localhost:3001/video/token'
                                , {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        room: values.title,
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
                                    message: 'Please input the title of the breakout room!',
                                },
                            ]}
                        >
                            <Input/>
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