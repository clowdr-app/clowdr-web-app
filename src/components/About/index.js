import React, {Component} from "react";
import {Typography} from "antd";

class About extends Component {
    render() {
        return <div>
            <Typography.Title level={2}>About CLOWDR</Typography.Title>
            <p>
                <a href="https://www.clowdr.org/" target="_blank">CLOWDR</a> is
                    an open source tool suite to make it easier to run interactive and engaging virtual
                    conferences.
                    Imagine that your conference attendees could video and text chat with each other and easily drift
                    between different conversations in different rooms. Now imagine that this app also integrated your
                    conference
                    program (directly imported from <a href="https://conf.researchr.org">conf.researchr.org</a>), and
                    let attendees
                    see who else is watching the same content. We were unable to find a technology platform that allowed
                    for these interactions, so
                    we built CLOWDR.
                </p>
                <p>
                    CLOWDR is a community-driven effort to create a new platform to support
                    Conferences Located Online by using Digital Resources.
                    CLOWDR lets your virtual conference attendees still be "present" in the virtual conference by
                    engaging
                    with each other through text and video chat <i>directly</i> integrated with your conference program.
                    However: we don't sell CLOWDR as a service - it is an open source project that is
                    designed to be easy to deploy and scale: it runs entirely in the cloud.
                </p>
                <p>
                    As conference organizers ourselves, we recognize that no conference organizer wants to pay an
                    arm-and-a-leg for services
                    like this, but also that no conference organizer wants to take on running their own (cheaper)
                    streaming video platforms.
                    Real-time text and video chat are the most infrastructure-intensive services to run; we outsource
                    this to Zoom
                    (for large presentations) and <a href="https://www.twilio.com/">Twilio</a> (for all ad-hoc calls).
                    We have found this approach to be extremely cost effective: conferences pay only for the number of
                    Zoom licenses
                    that are needed to support concurrent live streaming sessions, and then all breakout sessions and
                    text chat
                    run through Twilio, who bills only for actual usage (by the minute) --- ICSE's entire Twilio bill
                    was under $250.
                </p>

            <p><b>Privacy:</b> Here's what we store:
                We store your user profile information, allowing your name and
                other profile fields to to be visible to other participants of this conference,
                but hide your email from everyone.  We do not store any chat messages and do not record any video calls.
                Twilio, however, keeps a record of the video rooms that you have been in and chat messages that you have sent (Twilio can only map
                this information to your unique ID on CLOWDR, and never gets your name or email).
                Twilio treats this data as protected personal information, and guarantees destruction within 120 days.
                Only the conference organizers have access to call logs.
            </p>
                <p>
                    If you are interested in using Clowdr for your event, there is no need for you to download any code
                    or run your own server (unless you want to!). We can host your backend server for free, the only
                    costs to your conference are for streaming video (you'll need accounts with Zoom and Twilio).
                    CLOWDR has been battle-tested by thousands of users already this year
                    at <a href="https://pldi20.sigplan.org">PLDI</a>, &nbsp;
                    <a href="https://2020.icse-conferences.org">ICSE</a> and &nbsp;
                    <a href="https://conf.researchr.org/home/issta-2020">ISSTA</a>. In August, &nbsp;
                    <a href="https://conf.researchr.org/home/vlhcc2020">VL/HCC</a>&nbsp;
                    and <a href="https://icfp20.sigplan.org">ICFP</a> plan to use CLOWDR. As we gain deployment
                    experience,
                    we hope to offer conference organizers a one-click installation of CLOWDR. However, in the meantime,
                    if you are considering
                    CLOWDR for your virtual conference, please email us at <a
                    href="mailto:hello@clowdr.org">hello@clowdr.org</a> and
                    we can provide a demo and deployment for your conference.
                </p>
                <p>Let's make the best of this situation, and put our heads together to make the best virtual conference
                    experience that we can: together.</p>
                <p>CLOWDR is created by <a href="https://jonbell.net">Jonathan Bell</a>, <a
                    href="https://www.ics.uci.edu/~lopes/">Crista Lopes</a> and <a
                    href="https://www.cis.upenn.edu/~bcpierce/">Benjamin Pierce</a>.
                </p>
                    <p>CLOWDR is made possible
                        thanks to support by the <a href="https://www.nsf.gov/">National Science Foundation</a> under awards CCF-2035003, CCF-2035101 and CCF-203500
                        and support from <a href="https://www.twilio.org">Twilio.org</a>.</p>

        </div>
    }
}

export default About;
