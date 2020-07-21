import React, {Component} from "react";
import { Editor } from '@tinymce/tinymce-react';
import {AuthUserContext} from "./Session";
import {Button, Tooltip} from "antd";
import {EditOutlined} from '@ant-design/icons';

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
            <div><p><strong>What to do during virtual XYZ:</strong> Besides attending the live sessions, you can interact with other participants in many ways!</p>
            <ul>
                <li>Chat and ask questions during the talks in the live rooms, and upvote existing questions. Questions will be answered, live, at the end of each talk.
                    Don't be shy about chatting during the talks: not only it will not be disruptive, but it will make the presenters feel the presence of the audience!
                </li>
                <li>Continue the conversation with the presenters by locating the papers in the Exhibit Hall, and using the paper-specific text channels.</li>
                <li>If you are a presenter, consider starting a video chat right after your session, so others can talk to you.</li>
                <li>If you are a senior member of the community, consider volunteering for one-on-one or small group mentoring sessions. Meet up with younger people 
                    either in one of the existing video chat rooms or in your own video room.</li>
                <li>If you'd like to organize an informal public gathering, create one using the "New video chat room" button (please give it a meaningful name!), and announce it in
                    the Lobby.</li>
                <li> If you're just looking for casual conversation, feel free to drop into one of the "hallway track" rooms anytime. Or head to an empty Public Hangout room 
                    and see who else shows up.  You can also set your status to let people know what you're up to. </li>
            </ul>
            </div>
            <div><p><strong>Code of Conduct</strong>: Remember to adhere to
            the <a href="https://www.acm.org/special-interest-groups/volunteer-resources/officers-manual/policy-against-discrimination-and-harassment" rel="noopener noreferrer" target="_blank">
                ACM Policy Against Harassment</a> at all times. If you observe or are subject to innapropriate conduct, call it out:</p>
                <ul>
                    <li>Use the red "report" icon in video chats</li>
                    <li>Send a direct message to the organizers</li>
                </ul>
            </div>
            <p><b><a href="https://www.clowdr.org/" target="_blank">CLOWDR</a></b> is a community-driven effort to create a new platform to
                support <b>C</b>onferences <b>L</b>ocated <b>O</b>nline <b>W</b>ith <b>D</b>igital <b>R</b>esources. (Also, a clowder
                is <a href="https://www.merriam-webster.com/dictionary/clowder" rel="noopener noreferrer" target="_blank">a group of cats</a> &#128049;).
                CLOWDR is created by <a href="https://jonbell.net" rel="noopener noreferrer" target="_blank">Jonathan Bell</a>, <a href="https://www.ics.uci.edu/~lopes/" rel="noopener noreferrer" target="_blank">Crista Lopes</a> and <a href="https://www.cis.upenn.edu/~bcpierce/" rel="noopener noreferrer" target="_blank">Benjamin Pierce</a>.
                If you are interested in helping <a href="https://github.com/clowdr-app/clowdr-web-app"  rel="noopener noreferrer" target="_blank">develop CLOWDR</a> or using it for your live event, please <a href="mailto:hello@clowdr.org">email us</a>.
                We have built this tool extremely quickly (starting on May 19, 2020), so please
                be gentle - there are a lot more features that we plan to add, and rough corners to polish.
            </p>
            <h3>THANK YOU TO OUR SPONSORS!</h3>
            <img width="200" src="https://www.nsf.gov/news/mmg/media/images/nsf_logo_f_efcc8036-20dc-422d-ba0b-d4b64d352b4d.jpg"/>
</div>`;


class GuardedLanding extends Component {

    constructor(props) {
      super(props);

      this.state = {
        isLoggedIn: false,
        text: defaultText,
        isEditing: false
      };
    }

    async componentDidMount() { 
        //For social features, we need to wait for the login to complete before doing anything
        let user = this.props.auth.user;
        if (user) {
            this.setState({
                loggedIn: true
            }); 
        }
    }

    componentWillUnmount() { 
    }

    componentDidUpdate(prevProps) {
      console.log('Something changed ' + prevProps.auth.user + " " + this.props.auth.user);
      if (!prevProps.auth.user && this.props.auth.user) {
        this.setState({isLoggedIn: true})
      }

    }

    onEdit() {
      this.setState({isEditing: true})
    }

    handleEditorChange = (content, editor) => {
      console.log('Content was updated:', content);
    }

    render () {
      console.log('isAdmin? ' + this.props.auth.isAdmin);

      let editButton = "";
      if (this.props.auth.isAdmin) {
        if (!this.state.isEditing)
          editButton = <Tooltip title="Edit this page"><Button type="primary" shape="round" icon={<EditOutlined />} onClick={this.onEdit.bind(this)}/></Tooltip>
        else
          return <Editor 
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
      }

      return <div><div style={{textAlign: "right"}}>{editButton}</div>
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
