import {AuthUserContext} from "../Session";
import React from "react";
import {Alert, Spin} from "antd";
import Parse from "parse";

class SlackToVideo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    async componentDidMount() {

        let team = this.props.match.params.team;
        let roomName = this.props.match.params.roomName;
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
        try {
            let u = await Parse.User.become(res.token);
            let session = await Parse.Session.current();
            session.set("activeTeam", team);
            await session.save();
            await this.props.authContext.refreshUser();
            let conf = await this.props.authContext.setActiveConferenceBySlack(team);
            let roomQ = new Parse.Query("BreakoutRoom");
            roomQ.equalTo("conference",conf);
            roomQ.equalTo("title", roomName);
            let room = await roomQ.first();
            if(room){
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
        return <div><Spin/>Logging you in...</div>
    }
}

const
    AuthConsumer = (props) => (
        <AuthUserContext.Consumer>
            {value => (
                <SlackToVideo {...props} user={value.user} authContext={value}/>
            )}
        </AuthUserContext.Consumer>
    );

export default AuthConsumer;