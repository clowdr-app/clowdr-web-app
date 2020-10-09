import React from "react";
import ReactMarkdown from "react-markdown";

export default function About() {
    return <ReactMarkdown>
{`[CLOWDR](https://www.clowdr.org/) is an [open source platform](https://github.com/clowdr-app) to make
it easier to run interactive and engaging virtual conferences. Imagine
that your conference attendees could interact by video and text and
easily drift between different conversations in different rooms. Now
imagine that this app also integrated your conference program (directly
imported from <a href="https://conf.researchr.org">conf.researchr.org</a>),
and let attendees see who else is watching the same content. We were
unable to find a technology platform that allowed for these interactions,
so we built CLOWDR.

CLOWDR is a community-driven effort to create a new platform to support
Conferences Located Online by using Digital Resources. CLOWDR lets your
virtual conference attendees still be "present" in the virtual conference
by engaging with each other through text and video chat <i>directly</i>
integrated with your conference program. CLOWDR is an open source PaaS
project that is designed to be easy to deploy and scale: it runs
entirely in the cloud.

As conference organizers ourselves, we recognize that no conference
organizer wants to pay an arm-and-a-leg for services like this, but also
that no conference organizer wants to take on running their own (cheaper)
streaming video platforms. Real-time text and video chat are the most
infrastructure-intensive services to run; we outsource this to Zoom (for
large presentations) and [Twilio](https://www.twilio.com/) (for all
ad-hoc calls). We have found this approach to be extremely cost
effective: conferences pay only for the number of Zoom licenses that are
needed to support concurrent live streaming sessions, and then all
breakout sessions and text chat run through Twilio, who bills only for
actual usage (by the minute) --- ICSE's entire Twilio bill was under $250.

If you are interested in using Clowdr for your event, there is no need
for you to download any code or run your own server (unless you want to!).
We can host your backend server, and you pay for streaming video (you'll
need accounts with Zoom and Twilio). CLOWDR has been battle-tested by
thousands of users already this year at

* [PLDI](https://pldi20.sigplan.org)
* [ICSE](https://2020.icse-conferences.org)
* [ISSTA](https://conf.researchr.org/home/issta-2020)
* [VL/HCC](https://conf.researchr.org/home/vlhcc2020)
* [ICFP](https://icfp20.sigplan.org)
* [VisSOFT](https://vissoft20.dcc.uchile.cl/)
* [MobileHCI](https://mobilehci.acm.org/2020/)
* [CSCW](https://cscw.acm.org/2020/)
* (upcoming) [ICST](https://icst2020.info/)
* (upcoming) [SPLASH](https://2020.splashcon.org/)

As we gain deployment experience, we hope to offer conference organizers
a one-click setup of CLOWDR. However, in the meantime, if you are
considering CLOWDR for your virtual conference, please email us at
[hello@clowdr.org](mailto:hello@clowdr.org) and we can provide a demo
and deployment for your conference.

Let's make the best of this situation, and put our heads together to
make the best virtual conference experience that we can.

CLOWDR is created by
[Jonathan Bell](https://jonbell.net),
[Crista Lopes](https://www.ics.uci.edu/~lopes/), 
[Benjamin Pierce](https://www.cis.upenn.edu/~bcpierce/),
[Ed Nutting](https://github.com/ednutting) and
[Ross Gardiner](https://github.com/rossng)

CLOWDR was made possible thanks to support by the
[National Science Foundation](https://www.nsf.gov/) under awards
CCF-2035003, CCF-2035101 and CCF-203500 and support from [Twilio.org](https://www.twilio.org)
`}
    </ReactMarkdown>;
}
