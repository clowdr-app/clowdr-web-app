import React, {Component} from "react";
import LiveStreaming from "./LiveStreaming";
import {PageHeader} from "antd";

class Landing extends Component {
    render() {
        return <div>
            <h2>ICSE 2020 LIVE @CLOWDR</h2>
            <p>The spread of COVID-19 is causing disruption world-wide, forcing
                conference cancellations, and leaving organizers scrambling for
                alternative ways of disseminating the work that was to be presented at
                their conferences. This disruption will likely last for at least
                another year, possibly significantly longer. Conferences are critical
                to the fabric of scientific and engineering communities.
            </p>
            <p>
                The easiest option to compensate for the cancellation of physical
                conferences is to forego synchronous meetings and focus only on their
                asynchronous "outputs."  Unfortunately, this model eliminates what
                makes a conference a conference: the real-time social interaction
                among participants.
            </p>
            <p>Adding elements of synchrony, however, has so far been a challenge for events that have tried.
                While the pieces are all in place (text and video chat, etc.), they are
                spread among multiple vendors, forcing participants to use of
                disconnected apps that make the interaction confusing. Moreover, so
                far, none of the few virtual conferences with synchrony were able to
                successfully support the "hallway track" -- the unstructured and
                serendipitous interactions that happen in the hallways of physical
                conferences, and that oftentimes result in life-changing
                opportunities.
            </p>
            <p><b>CLOWDR</b> is a community-driven effort to create a new platform to support
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
                If you are interested in helping develop CLOWDR or using it for your live event, please email us.</p>
            <p>Right now, CLOWDR is in active development. Feel free to create an account, log in, and give it a try!</p>
        </div>
    }
}

export default Landing;