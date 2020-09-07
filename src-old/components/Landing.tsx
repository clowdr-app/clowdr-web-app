import React, { Component } from "react";
import { Editor } from '@tinymce/tinymce-react';
import { AuthUserContext } from "./Session";
import { Button, Card, message, Tooltip } from "antd";
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import Parse from "parse";
import { ClowdrState } from "../ClowdrTypes";
import assert from "assert";

// Import TinyMCE
require('tinymce/tinymce');

// Default icons are required for TinyMCE 5.3 or above
require('tinymce/icons/default');
// A theme is also required
require('tinymce/themes/silver');
// Any plugins you want to use have to be imported
require('tinymce/plugins/advlist');
require('tinymce/plugins/autolink');
require('tinymce/plugins/lists');
require('tinymce/plugins/link');
require('tinymce/plugins/image');
require('tinymce/plugins/charmap');
require('tinymce/plugins/print');
require('tinymce/plugins/preview');
require('tinymce/plugins/anchor');
require('tinymce/plugins/searchreplace');
require('tinymce/plugins/visualblocks');
require('tinymce/plugins/code');
require('tinymce/plugins/fullscreen');
require('tinymce/plugins/insertdatetime');
require('tinymce/plugins/media');
require('tinymce/plugins/table');
require('tinymce/plugins/paste');
require('tinymce/plugins/code');
require('tinymce/plugins/help');
require('tinymce/plugins/wordcount');
require('tinymce/plugins/imagetools');

const defaultText = `
<div>
            <h2>XYZ LIVE @ CLOWDR</h2>
            <div><p>Welcome to CLOWDR!</p>
            <h3>THANK YOU TO OUR SPONSORS!</h3>
            <img width="200" src="https://www.nsf.gov/news/mmg/media/images/nsf_logo_f_efcc8036-20dc-422d-ba0b-d4b64d352b4d.jpg"/>
</div>`;

interface GuardedLandingProps {
    auth: ClowdrState,
}

interface GuardedLandingState {
    text: string;
    privateText?: string;
    isLoggedIn: boolean,
    isEditingPublicDesc: boolean,
    isEditingPrivateDesc: boolean,
}

class GuardedLanding extends Component<GuardedLandingProps, GuardedLandingState> {

    constructor(props: GuardedLandingProps) {
        super(props);

        assert(this.props.auth.currentConference, "Current conference is null");

        let text = this.props.auth.currentConference && this.props.auth.currentConference.get("landingPage") ?
            this.props.auth.currentConference.get("landingPage") : defaultText;
        let privateText = undefined;
        if (this.props.auth.currentConference.get("loggedInText") && this.props.auth.currentConference.get("loggedInText").get("value"))
            privateText = this.props.auth.currentConference.get("loggedInText").get("value");
        this.state = {
            isLoggedIn: false,
            text: text,
            privateText: privateText,
            isEditingPublicDesc: false,
            isEditingPrivateDesc: false,
        };
    }

    async componentDidMount() {
        assert(this.props.auth.currentConference, "Current conference is null");

        if (this.props.auth.isAdmin) {
            let loggedInConfig = this.props.auth.currentConference.get("loggedInText");
            if (!loggedInConfig) {
                await Parse.Cloud.run("init-loggedIn-homepage", { id: this.props.auth.currentConference.id });
                await this.props.auth.currentConference.fetchWithInclude("loggedInText");
                this.setState({ privateText: this.props.auth.currentConference.get("loggedInText").get("value") })
            }
        }
    }

    componentWillUnmount() {
    }

    onEditPublicDesc() {
        this.setState({ isEditingPublicDesc: true })
    }

    onSavePublicDesc() {
        assert(this.props.auth.currentConference, "Current conference is null");

        this.setState({ isEditingPublicDesc: false });
        console.log('Will save...');
        this.props.auth.currentConference.set("landingPage", this.state.text);
        let data = {
            id: this.props.auth.currentConference.id,
            landingPage: this.state.text
        }
        Parse.Cloud.run("update-clowdr-instance", data)
            .then(c => { message.success("Successfully saved landing text") })
            .catch(err => {
                message.error("Error saving landing text")
                console.log("[Landing]: Unable to save text: " + err)
            })
    }

    onEditPrivateDesc() {
        this.setState({ isEditingPrivateDesc: true })
    }

    async onSavePrivateDesc() {
        assert(this.props.auth.currentConference, "Current conference is null");

        this.setState({ isEditingPrivateDesc: false });
        console.log('Will save...');
        this.props.auth.currentConference.get("loggedInText").set("value", this.state.privateText);
        await this.props.auth.currentConference.get("loggedInText").save();
        message.success("Saved");
    }

    handleEditorChange = (content: string, editor: any) => {
        this.setState({ text: content });
    }

    handleEditorChangePrivateDesc = (content: string, editor: any) => {
        this.setState({ privateText: content });
    }

    render() {
        let privateControlButton = <></>;

        if (this.props.auth.isAdmin) {
            privateControlButton = <Tooltip title="Edit this page"><Button type="primary" shape="round" icon={<EditOutlined />}
                onClick={this.onEditPrivateDesc.bind(this)} /></Tooltip>
            let controlButton2 = <Tooltip title="Edit this page"><Button type="primary" shape="round" icon={<EditOutlined />}
                onClick={this.onEditPublicDesc.bind(this)} /></Tooltip>
            let publicDesc = <div dangerouslySetInnerHTML={{ __html: this.state.text }} />
            let privateDesc = <div dangerouslySetInnerHTML={
                //@ts-ignore
                { __html: this.state.privateText }} />
            if (this.state.isEditingPublicDesc) {
                controlButton2 = <Tooltip title="Save this page"><Button type="primary" shape="round" icon={<SaveOutlined />} onClick={this.onSavePublicDesc.bind(this)} /></Tooltip>

                publicDesc = <div>
                    <Editor
                        initialValue={this.state.text}
                        init={{
                            height: 600,
                            menubar: false,
                            skin_url: 'skins/ui/oxide',
                            content_css: 'https://www.tiny.cloud/css/codepen.min.css',
                            plugins: [
                                'advlist autolink lists link image charmap print preview anchor',
                                'searchreplace visualblocks code fullscreen imagetools',
                                'insertdatetime media table paste code help wordcount'
                            ],
                            toolbar:
                                // eslint-disable-next-line no-multi-str
                                'formatselect | link | image table | bold italic forecolor backcolor | \
                        alignleft aligncenter alignright alignjustify | \
                        bullist numlist outdent indent | removeformat code| help'
                        }}
                        onEditorChange={this.handleEditorChange.bind(this)}
                    /></div>;
            }
            if (this.state.isEditingPrivateDesc) {
                privateControlButton = <Tooltip title="Save this page"><Button type="primary" shape="round" icon={<SaveOutlined />} onClick={this.onSavePrivateDesc.bind(this)} /></Tooltip>
                privateDesc = <div>
                    <Editor
                        initialValue={this.state.privateText}
                        init={{
                            height: 600,
                            menubar: false,
                            skin_url: 'skins/ui/oxide',
                            content_css: 'https://www.tiny.cloud/css/codepen.min.css',
                            plugins: [
                                'advlist autolink lists link image charmap print preview anchor',
                                'searchreplace visualblocks code fullscreen imagetools',
                                'insertdatetime media table paste code help wordcount'
                            ],
                            toolbar:
                                // eslint-disable-next-line no-multi-str
                                'formatselect | link | image table | bold italic forecolor backcolor | \
                       alignleft aligncenter alignright alignjustify | \
                       bullist numlist outdent indent | removeformat code| help'
                        }}
                        onEditorChange={this.handleEditorChangePrivateDesc.bind(this)}
                    /></div>;
            }

            return <div>
                <Card title="Registered/logged in attendee conference description (shows up only after log in)" extra={privateControlButton}>
                    {privateDesc}
                </Card>

                <Card title="Public conference description (shown for users who are not logged in)" extra={controlButton2}>
                    {publicDesc}
                </Card>
            </div>

        }

        return <div dangerouslySetInnerHTML={{ __html: this.state.privateText ? this.state.privateText : this.state.text }}></div>;
    }
}

const AuthConsumer = (props: {}) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <></> :
            <GuardedLanding {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer;
