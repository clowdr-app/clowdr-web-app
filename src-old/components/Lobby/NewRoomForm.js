import React from "react";
import { Button, Form, Input, message, Modal, Radio, Tooltip, Typography } from "antd";
import { AuthUserContext } from "../Session";
import { withRouter } from "react-router-dom";

class NewRoomForm extends React.Component {

    constructor(props) {
        super(props);
        this.form = React.createRef();
        this.state = {
            ModalText: 'Content of the modal',
            visible: this.props.visible,
            confirmLoading: false,
        };
    }
    showModal = () => {
        this.setState({
            visible: true,
        });
    };

    handleCancel = () => {
        if (this.form && this.form.current)
            this.form.current.resetFields();
        this.setState({
            visible: false,
            confirmLoading: false
        });

    };

    componentDidMount() {
    }

    render() {
        const { visible, confirmLoading } = this.state;
        let buttonText = (this.props.text ? this.props.text : "New Room");
        let buttonType = (this.props.type ? this.props.type : "primary");

        let defaultSpace;
        if (this.props.auth.activeSpace) {
            defaultSpace = this.props.auth.activeSpace.id;
        }
        // BCP: Anybody can create video rooms
        //     this.props.auth.helpers.ifPermission("createVideoRoom",
        return <div>
            <Button type={buttonType} onClick={this.showModal} style={this.props.style}>
                {buttonText}
            </Button>
            <Modal
                zIndex="200"
                title="Create a New Video Chat Room"
                visible={visible}
                confirmLoading={confirmLoading}
                footer={[
                    <Button form="myForm" key="submit" type="primary" htmlType="submit" loading={confirmLoading}>
                        Create and Join
                        </Button>
                ]}
                onCancel={this.handleCancel}
            >
                <Typography.Paragraph>
                    CLOWDR lets you create video chat rooms with other conference participants.
                    You can create a new room, or join existing rooms. Public rooms are open to all
                    conference participants, while private rooms use a simple access control list:
                    you can add any conference participant to be able to see the room, and then
                    they will have the same options to add more people.
                    </Typography.Paragraph>
                <Form
                    layout="vertical"
                    name="form_in_modal"
                    ref={this.form}

                    id="myForm"
                    initialValues={{
                        title: this.props.initialName,
                        visibility: 'listed',
                        // category: 'general',
                        // mode: 'group-small',
                        socialSpace: defaultSpace,
                        mode: 'peer-to-peer',
                        persistence: 'ephemeral'
                    }}
                    onFinish={async (values) => {
                        this.setState({ confirmLoading: true });
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
                                    // mode: values.mode,
                                    mode: 'group',
                                    identity: idToken,
                                    socialSpace: values.socialSpace,
                                    conference: this.props.auth.currentConference.id
                                }),
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                        let res = await data.json();
                        if (res.status === "error") {
                            message.error(res.message);
                            this.setState({ confirmLoading: false })
                        } else {
                            this.form.current.resetFields();
                            this.setState({ confirmLoading: false, visible: false })
                            this.props.history.push("/video/" + encodeURI(this.props.auth.currentConference.get("conferenceName")) + "/" + encodeURI(values.title));
                        }
                    }}
                >
                    <Form.Item
                        name="title"
                        label="Room title"
                        extra="Shown in sidebar"
                        rules={[
                            {
                                required: true,
                                message: 'Please input the title for your video room.',
                            },
                            ({ getFieldValue }) => ({
                                validator(rule, value) {
                                    if (!value || !value.includes("/")) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject('Room title cannot include /');
                                },
                            }),
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    {/*<Form.Item*/}
                    {/*    name="socialSpace"*/}
                    {/*    label="Parent Room"*/}
                    {/*    extra="Help attendees find your new chat room by associating it with an existing room"*/}
                    {/*>*/}
                    {/*    <Select options={selectOptions}>*/}
                    {/*    </Select>*/}
                    {/*</Form.Item>*/}
                    <Form.Item
                        name="persistence"
                        label="Persistence"
                        extra={"Ephemeral rooms disappear five minutes after the last participant leaves.  Persistent rooms last until deleted by a platform moderator."}>
                        <Radio.Group buttonStyle="solid">
                            <Radio.Button value="ephemeral">Ephemeral</Radio.Button>
                            {this.props.auth.isModerator
                                ? <Radio.Button value="persistent">Persistent</Radio.Button>
                                : <Tooltip mouseEnterDelay={0.5} title="You do not have enough permissions to create persistent rooms. Please ask a moderator (e.g. by posting on the Tech Support channel) if you need a persistent room."><Radio.Button disabled={true} value="persistent">Persistent</Radio.Button></Tooltip>
                            }
                        </Radio.Group>
                    </Form.Item>
                    {/*<Form.Item*/}
                    {/*    name="mode"*/}
                    {/*    label="Room Type"*/}
                    {/*    extra={"Small groups and Large groups provide the best quality; Peer group rooms will allow you to see up to 9 other people at a time. Large group rooms will only show 6 active speakers at a time."}>*/}
                    {/*    <Radio.Group buttonStyle="solid">*/}
                    {/*        {this.props.auth.helpers.ifPermission("createVideoRoom-smallgroup",<Radio.Button value="group-small">Small Group (1-4)</Radio.Button>,*/}
                    {/*            <Tooltip mouseEnterDelay={0.5} title="You do not have access permissions to create small group rooms"><Radio.Button value="group-small" disabled={true}>Small Group (1-4)</Radio.Button></Tooltip>)}*/}
                    {/*        {this.props.auth.helpers.ifPermission("createVideoRoom-peer-to-peer",*/}
                    {/*            <Radio.Button value="peer-to-peer">Peer Group (1-10)</Radio.Button>,*/}
                    {/*            <Tooltip mouseEnterDelay={0.5} title="You do not have access permissions to create peer-to-peer rooms"><Radio.Button value="peer-to-peer" disabled={true}>Peer-to-Peer (1-10)</Radio.Button></Tooltip>)}*/}
                    {/*        {this.props.auth.helpers.ifPermission("createVideoRoom-group",<Radio.Button value="group">Large Group (4-50)</Radio.Button>,*/}
                    {/*            <Tooltip mouseEnterDelay={0.5} title="You do not have access permissions to create peer-to-peer rooms"><Radio.Button value="group">Large Group (4-50)</Radio.Button></Tooltip>)}*/}

                    {/*    </Radio.Group>*/}
                    {/*</Form.Item>*/}
                    <Form.Item
                        name="visibility"
                        label="Visibility"
                        extra={"'Public' video calls can be joined by any participant of " + this.props.auth.currentConference.get("conferenceName") + ". " +
                            "Private rooms allow you to restrict access to specific users"
                        }
                    >
                        <Radio.Group buttonStyle="solid">
                            <Radio.Button value="listed">Public</Radio.Button>
                            {  // BCP: Ripping out this permission check: everybody can create private rooms
                                // this.props.auth.helpers.ifPermission("createVideoRoom-private",
                                <Radio.Button value="unlisted">Private</Radio.Button>
                                // , <Tooltip mouseEnterDelay={0.5} title="You do not have access permissions to create private rooms"><Radio.Button disabled={true} value="unlisted">Private</Radio.Button></Tooltip> )
                            }
                        </Radio.Group>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    }
}
const AuthConsumer = withRouter((props) => (
    <AuthUserContext.Consumer>
        {value => (
            <NewRoomForm {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
