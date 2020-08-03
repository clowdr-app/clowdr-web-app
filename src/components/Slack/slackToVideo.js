import {AuthUserContext} from "../Session";
import React from "react";
import {Alert, Spin, Typography} from "antd";
import Parse from "parse";
import {LoadingOutlined} from '@ant-design/icons';
import LandingContainer from "../LandingContainer";

// @Jon/@Crista    are we ready to jettison slack yet?

class SlackToVideo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    async componentDidMount() {


        console.log("HI!")
        let team = this.props.match.params.team;
        let token = this.props.match.params.token;
        const data = await fetch(
            `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/slack/login`

            // 'http://localhost:3001/video/token'
            , {
                method: 'POST',
                body: JSON.stringify({
                    token: token
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let res = await data.json();
        console.log(res);
        let roomName = res.roomName;
        try {
            let u = await Parse.User.become(res.token);
            let conf = await this.props.clowdrAppState.getConferenceBySlackName(team);
            await this.props.clowdrAppState.refreshUser(conf, true);
            if(!roomName){
                this.props.history.push("/lobby");
                return;
            }
            let roomQ = new Parse.Query("BreakoutRoom");
            roomQ.equalTo("conference",conf);
            roomQ.equalTo("title", roomName);
            let room = await roomQ.first();
            if(room){
                console.log("You are logged in and ready to go to ")
                console.log(room)
                console.log(room.get("conferenceName"))
                this.props.history.push("/video/" + conf.get("conferenceName") + "/" + roomName);
            }else{
                this.props.history.push("/lobby/new/"+roomName);
            }
        } catch (err) {
            console.log(err);
            this.setState({error: "Please try typing /video again to get a fresh magic link."});
        }
    }


    render() {
        if (this.state.error) {
            return <Alert message="Invalid magic link." description={this.state.error} type="error"/>
        }
        const antIcon = <LoadingOutlined color="white" style={{ fontSize: 96 }} spin />;

        if(this.props.clowdrAppState.user){
            return <div></div>
        }
        return <div id="landing-page">
            <LandingContainer>
                <div className="header-content" style={{top: "33%"}}>
                    <div className="header-content-inner"
                         style={{backgroundColor: "rgba(1,1,1,.5)", maxWidth: "800px"}}>

                        <Typography.Title>Just a minute...</Typography.Title>
                        <div style={{marginLeft: 'auto', marginRight: 'auto'}}>
                            <Spin indicator={antIcon}/>
                        </div>
                    </div>
                </div>
            </LandingContainer>
        </div>
    }
}

const
    AuthConsumer = (props) => (
        <AuthUserContext.Consumer>
            {value => (
                <SlackToVideo {...props} user={value.user} clowdrAppState={value}/>
            )}
        </AuthUserContext.Consumer>
    );

export default AuthConsumer;