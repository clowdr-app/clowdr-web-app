import React, {Component} from "react";
import { Editor } from '@tinymce/tinymce-react';
import {AuthUserContext} from "./Session";
import {Alert, Button, Tooltip} from "antd";
import {EditOutlined, SaveOutlined} from '@ant-design/icons';
import Parse from "parse";

import tinymce from 'tinymce/tinymce';

// Default icons are required for TinyMCE 5.3 or above
import 'tinymce/icons/default';

// A theme is also required
import 'tinymce/themes/silver';

// Any plugins you want to use has to be imported
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/print';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/paste';
import 'tinymce/plugins/code';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/imagetools';

const defaultText = `
<div>
            <h2>XYZ LIVE @ CLOWDR</h2>
            <div><p>Welcome to CLOWDR!</p>
            <h3>THANK YOU TO OUR SPONSORS!</h3>
            <img width="200" src="https://www.nsf.gov/news/mmg/media/images/nsf_logo_f_efcc8036-20dc-422d-ba0b-d4b64d352b4d.jpg"/>
</div>`;


class GuardedLanding extends Component {

    constructor(props) {
      super(props);

      let text = this.props.auth.currentConference && this.props.auth.currentConference.get("landingPage") ? 
                 this.props.auth.currentConference.get("landingPage"): defaultText;
      this.state = {
        isLoggedIn: false,
        text: text,
        isEditing: false,
        alter: undefined
      };
    }

    componentDidMount() { 
    }

    componentWillUnmount() { 
    }

    onEdit() {
      this.setState({isEditing: true})
    }

    onSave() {
      this.setState({isEditing: false});
      console.log('Will save...');
      this.props.auth.currentConference.set("landingPage", this.state.text);
      let data = {
        confID: this.props.auth.currentConference.id,
        instanceData: {landingPage: this.state.text}
      }
      Parse.Cloud.run("save-instance", data)
      .then(c => this.setState({alert: "save success"}))
      .catch(err => {
        this.setState({alert: "save error"})
        console.log("[Landing]: Unable to save text: " + err)
      })
    }

    handleEditorChange = (content, editor) => {
      this.setState({text: content});
    }

    render () {
      console.log('isAdmin? ' + this.props.auth.isAdmin);

      let controlButton = "";
      let alert = "";
      if (this.state.alert) {
        alert = <Alert
                  onClose={() => this.setState({alert: undefined})}
                  style={{
                      display: "inline-block",
                  }}
                  message={this.state.alert}
                  type={this.state.alert.includes("success") ? "success": "error"}
                  showIcon
                  closable
                />
      }

      if (this.props.auth.isAdmin) {
        if (!this.state.isEditing) {
          controlButton = <Tooltip title="Edit this page"><Button type="primary" shape="round" icon={<EditOutlined />} onClick={this.onEdit.bind(this)}/></Tooltip>
        }
 
        else {
          controlButton = <Tooltip title="Save this page"><Button type="primary" shape="round" icon={<SaveOutlined />} onClick={this.onSave.bind(this)}/></Tooltip>
          return <div><div style={{textAlign: "right"}}>{controlButton}</div>
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

      return <div><div style={{textAlign: "right"}}>{alert}  {controlButton}</div>
        <div dangerouslySetInnerHTML={{__html: this.state.text}} />
        </div>

    }
}

const Landing = (props) => (
  <AuthUserContext.Consumer>
      {value => (
          <GuardedLanding {...props} auth={value}/>
      )}
  </AuthUserContext.Consumer>
);

export default Landing;
