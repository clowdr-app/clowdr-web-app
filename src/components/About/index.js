import React, {Component} from "react";
import {Typography} from "antd";
class About extends Component {
    render() {
        return <div>
            <Typography.Title level={2}>About CLOWDR</Typography.Title>
            <p>
                <a href="https://www.clowdr.org/" target="_blank">CLOWDR</a> is an open source tool to make it easier to run interactive and engaging virtual conferences.
                Imagine that your conference attendees could video and text chat with each other and easily drift
                between different conversations in different rooms. Now imagine that this app also integrated your conference
                program (directly imported from <a href="https://conf.researchr.org">conf.researchr.org</a>), and let attendees
                see who else is watching the same content. Existing virtual conference management systems are either centered
                around a content management system for organizing a program, but you probably already have one (like conf.researchr.org),
                or are social platforms that target large businesses, charging rates <i>per-user per-month</i>. $6.75 per user per month
                gets expensive pretty quickly when your virtual conference has thousands of registrations.
            </p>
            <p>We built CLOWDR to help. CLOWDR is a community-driven effort to create a new platform to support
                Conferences Located Online by using Digital Resources.
                CLOWDR is designed to be easy to deploy and scale: it runs entirely in the cloud, using <a href="https://parseplatform.org/">ParsePlatform</a>
                as a backend (we are hosting it now using <a href="https://www.back4app.com/">Back4App</a>) and <a href="https://reactjs.org/">React</a> as a frontend,
                with a Slack bot for easy plug-and-play with Slack-based conferences. Scaling group video calling to
                hundreds of simultaneous calls is hard, so we let <a href="https://www.twilio.com/">Twilio</a> do that for us -
                Twilio provides on-demand video and text chat at rates that put big-box consumer products to shame.
                Unlike other platforms that charge a rate per-user per-month for video, Twilio charges per-minute per-user  -
                something that makes a lot more sense for conferences that don't know exactly how many people will use the system and for how long.
                Twilio's video service costs range between $0.0015/minute to $0.01/minute (depending on the video room topology). And
                Twilio's chat service starts at $0.03 per-active user per-month.</p>
            <p><b>Privacy:</b> We have no plans to monetize CLOWDR, and hence, have no incentive to collect your data. So, we don't. Here's what we store:
                We store your slack profile (including name and email address), allowing your name to be visible to other members of the same slack workspace,
                but hiding your email from everyone. We need your email to provide single-signon support from Slack (which requires a paid workspace to
                use OAuth). Moderators can access any room (including private rooms). We do not store any chat messages and do not record any video calls.
                Twilio, however, keeps a record of the video rooms that you have been in and chat messages that you have sent (Twilio can only map
                this information to your unique ID on Clowdr, and never gets your name or email).
                Twilio treats this data as protected personal information, and guarantees destruction within 120 days.
                Only the conference organizers have access to call logs.
            </p>
            <p>CLOWDR is created by <a href="https://jonbell.net">Jonathan Bell</a>, <a href="https://www.ics.uci.edu/~lopes/">Crista Lopes</a> and <a href="https://www.cis.upenn.edu/~bcpierce/">Benjamin Pierce</a>.
                If you are interested in helping develop CLOWDR or using it for your live event, please <a href="https://github.com/clowdr-app">check out our GitHub</a> or <a href="mailto:hello@clowdr.org">send us an email</a>.
            Please take note that we have built this tool extremely quickly (starting on May 19, just some 3 weeks before its first trial at PLDI), so please
            be gentle - there are a lot more features that we plan to add, and rough corners to polish.</p>
            <p> CLOWDR is made possible
                thanks to support by the National Science Foundation
                under awards CCF-2035003, CCF-2035101 and CCF-203500
                and support from <a href="https://www.twilio.org">Twilio.org</a>.</p>
        </div>
    }
}

export default About;