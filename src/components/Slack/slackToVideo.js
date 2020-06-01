import {AuthUserContext} from "../Session";
import React from "react";
import {Spin} from "antd";
import Parse from "parse";
import { Alert } from 'antd';

class SlackToVideo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    async componentDidMount() {
        let user = await this.props.authContext.refreshUser();

        let team = this.props.match.params.team;
        let roomName = this.props.match.params.roomName;
        if (!user) {
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
                let conf = await this.props.authContext.setActiveConferenceBySlack(team);
                this.props.history.push("/video/" + conf.get("conferenceName") + "/" + roomName);
            } catch (err) {
                console.log(err);
                this.setState({error: "Please try typing /video again to get a fresh magic link."});
            }
        }
        else if (user) {
            let session = await Parse.Session.current();
            session.set("activeTeam", team);
            await session.save();
            let conf = await this.props.authContext.setActiveConferenceBySlack(team);
            this.props.history.push("/video/" + conf.get("conferenceName") + "/" + roomName);
        }

    }

    render() {
        if (this.state.error) {
            return <Alert message="Invalid magic link." description={this.state.error} type="error" />
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