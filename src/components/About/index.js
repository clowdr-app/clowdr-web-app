import React, {Component} from "react";
import {Typography} from "antd";
class About extends Component {
    render() {
        return <div>
            <Typography.Title level={2}>About CLOWDR</Typography.Title>
            <p><b>CLOWDR</b> is a community-driven effort to create a new platform to support&nbsp;
                <b>C</b>onferences <b>L</b>ocated <b>O</b>nline by using <b>D</b>igital <b>R</b>esources.
                CLOWDR combines the group chat features of Slack or IRC with the simplicity of private chat in
                social networks like Facebook Messenger or GChat. And, every chat has the option to add video or audio.
                Aside from chat, CLOWDR contains the entire conference program, and organizes the various events' live
                activities in one place: bringing together YouTube live streams, Twitch video streams, Zoom webinars and others.
                But it's not just a mash up: since CLOWDR has the entire conference program loaded, it can add much needed context to chat, by automatically
                showing participants chat channels for the topic that the participant is viewing. For instance: browse to a
                live ICSE technical track session on testing? The chat channel for testing tools will automatically be visible,
                showing you all of the other participants in that room. See a colleague's face that you haven't seen in a while?
                Start a chat with them, and always have the option to switch into video.
            </p>
            <p>CLOWDR is created by <a href="https://jonbell.net">Jonathan Bell</a>, <a href="https://www.ics.uci.edu/~lopes/">Crista Lopes</a> and <a href="https://www.cis.upenn.edu/~bcpierce/">Benjamin Pierce</a>.
                If you are interested in helping develop CLOWDR or using it for your live event, please <a href="https://github.com/clowdr-app">check out our GitHub</a> or send us an email.</p>
            <p>CLOWDR is built on a stack of React, Ant Design, Parse Server, and Twilio.</p>
        </div>
    }
}

export default About;