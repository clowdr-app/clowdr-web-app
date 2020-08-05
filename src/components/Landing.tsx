import React, { Component } from "react";
import { Editor } from '@tinymce/tinymce-react';
import { AuthUserContext } from "./Session";
import { Alert, Button, Tooltip } from "antd";
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import Parse from "parse";
import { ClowdrAppState } from "../ClowdrTypes";

// Import TinyMCE
var tinymce = require('tinymce/tinymce');

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
  auth: ClowdrAppState,
}

interface GuardedLandingState {
  text: string;
  isLoggedIn: boolean,
  isEditing: boolean,
  alert: React.ReactElement | undefined | string
}

class GuardedLanding extends Component<GuardedLandingProps, GuardedLandingState> {

  constructor(props: GuardedLandingProps) {
    super(props);

    let text = this.props.auth.currentConference && this.props.auth.currentConference.get("landingPage") ?
      this.props.auth.currentConference.get("landingPage") : defaultText;
    this.state = {
      isLoggedIn: false,
      text: text,
      isEditing: false,
      alert: undefined
    };
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  onEdit() {
    this.setState({ isEditing: true })
  }

  onSave() {
    this.setState({ isEditing: false });
    console.log('Will save...');
    this.props.auth.currentConference.set("landingPage", this.state.text);
    let data = {
      id: this.props.auth.currentConference.id,
      landingPage: this.state.text
    }
    Parse.Cloud.run("update-clowdr-instance", data)
      .then(c => this.setState({ alert: "save success" }))
      .catch(err => {
        this.setState({ alert: "save error" })
        console.log("[Landing]: Unable to save text: " + err)
      })
  }

  handleEditorChange = (content: string, editor: any) => {
    this.setState({ text: content });
  }

  render() {
    let controlButton = <></>;
    let alert = <></>;
    if (this.state.alert) {
      alert = <Alert
        onClose={() => this.setState({ alert: undefined })}
        style={{
          display: "inline-block",
        }}
        message={this.state.alert}
        // @ts-ignore    TS: @Jon/@Crista This might like a real type error -- 
        // Is alert guaranteed to be a string here, even though it is assigned a ReactElement sometimes?
        type={this.state.alert.includes("success") ? "success" : "error"}
        showIcon
        closable
      />
    }

    if (this.props.auth.isAdmin) {
      if (!this.state.isEditing) {
        controlButton = <Tooltip title="Edit this page"><Button type="primary" shape="round" icon={<EditOutlined />} onClick={this.onEdit.bind(this)} /></Tooltip>
      } else {
        controlButton = <Tooltip title="Save this page"><Button type="primary" shape="round" icon={<SaveOutlined />} onClick={this.onSave.bind(this)} /></Tooltip>
        return <div><div style={{ textAlign: "right" }}>{controlButton}</div>
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
                'formatselect | link | image table | bold italic forecolor backcolor | \
                    alignleft aligncenter alignright alignjustify | \
                    bullist numlist outdent indent | removeformat code| help'
            }}
            onEditorChange={this.handleEditorChange.bind(this)}
          />
        </div>
      }
    }

    return <div><div style={{ textAlign: "right" }}>{alert}  {controlButton}</div>
      <div dangerouslySetInnerHTML={{ __html: this.state.text }} />
    </div>
  }
}

const AuthConsumer = (props: {}) => (
  <AuthUserContext.Consumer>
    {value => (value == null ? <></> :   // @ts-ignore  TS: Can value really be null here?
      <GuardedLanding {...props} auth={value} />
    )}
  </AuthUserContext.Consumer>
);

export default AuthConsumer;
