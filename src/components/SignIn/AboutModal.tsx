import {AuthUserContext} from "../Session";
import {withRouter, RouteComponentProps} from "react-router-dom";
import * as React from "react";
import {Alert, Button, Modal, Result, Typography} from "antd";
import { SmileOutlined } from '@ant-design/icons';

/*
interface WelcomePortalProps {
    auth?: any;
}
*/

/* A (not quite working) suggestion from VSCode
   PropsWithChildren<RouteComponentProps<any, StaticContext, PoorMansUnknown>> */
/* TS: BCP: What should all the 'any's be? */
type WelcomePortalProps = React.PropsWithChildren<any>

interface WelcomePortalState {
    visible: any;  
    welcomeText?: any;
}

class WelcomePortal extends React.Component<WelcomePortalProps,WelcomePortalState>{
    constructor(props: WelcomePortalProps) {
        super(props);
        this.state={visible: false};
    }
    componentDidMount() {
       if(!this.props.auth.userProfile.get("welcomeModalShown")){
           let welcomeText = this.props.auth.currentConference.get("welcomeText");
           if(!welcomeText){
               welcomeText=<Typography.Paragraph>CLOWDR is an open-source tool to support virtual conferences,
                   and is currently in beta testing.
                   CLOWDR allows conference participants to easily create and join video calls with each other
                   using only a browser and your existing slack account.
                   CLOWDR lets you create public rooms (visible to any conference attendee) or private rooms
                   (visible only to attendees that you allow).
                   CLOWDR lets you see which rooms your colleagues are in
                   (assuming that they are in public rooms, or private rooms to which you have access). <br /><br />
                   This came together in just a couple of weeks, so if you find bugs, please be gentle and remember
                   that <a href="https://github.com/clowdr-app" target="_blank">this is an open source platform built by volunteers</a>.
               </Typography.Paragraph>
           }
           this.props.auth.userProfile.set("welcomeModalShown", true);
           this.props.auth.userProfile.save();
           this.setState({visible: true, welcomeText: welcomeText});
       }
    }

    render() {

        let codeOfConductWarning = <span>This is a social platform to engage with your colleagues, and while we have a very light hand for moderating
            content, violators of the <a href="https://www.acm.org/special-interest-groups/volunteer-resources/officers-manual/policy-against-discrimination-and-harassment" target="_blank">
                ACM Policy Against Discrimination and Harassment</a> risk being permanently banned from this platform.</span>
        return <Modal zIndex={300}
                      // title="Welcome to CLOWDR"
                      onCancel={()=>{this.setState({visible: false})}}
                      visible={this.state.visible}
                      footer={[
                          <Button key="button-create" type="primary" htmlType="submit" onClick={() => {
                              this.setState({visible: false})
                          }}>
                              Get started!
                          </Button>
                      ]}
        >
            <Typography.Title>Welcome to CLOWDR!</Typography.Title>
            {this.state.welcomeText}
            <div>
                <Alert
                    message="Code of Conduct"
                    description={codeOfConductWarning}
                    type="warning"
                />
            </div>
            <div>

            </div>
        </Modal>
    }
}

// TS: @Benjamin Why do we NOT need to check that value is null here???
const AuthConsumer = (props: WelcomePortalProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <WelcomePortal {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>

);

export default withRouter(AuthConsumer);