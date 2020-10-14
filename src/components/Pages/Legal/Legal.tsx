import React from "react";
import ReactMarkdown from "react-markdown";

export default function Legal() {
    return <ReactMarkdown
        linkTarget="_blank"
    >
        {`## Who are we

Clowdr is not currently a legal entity, it's just an [open source project](https://github.com/clowdr-app).
Your information is managed and processed by our platform on behalf of
your conference, with permission given to the Clowdr development team to
access information necessary to make the conference happen. You can find
the list of our dev team on our [About page](/about).

## Privacy

Please note that conference adminstrators (the organisers and moderators)
can access all video rooms - even private ones - at any time. They can
also access direct messages if they are reported by the recipient.

### Here's what we store

We store your user profile information, allowing your name and other
profile fields to to be visible to other participants of this
conference, but hide your email from everyone.  We do not store any chat
messages and do not record any video calls. Twilio, however, keeps a
record of the video rooms that you have been in and chat messages that
you have sent (Twilio can only map this information to your unique ID on
CLOWDR, and never gets your name or email). Twilio treats this data as
protected personal information, and guarantees destruction within 120
days. Only the conference organizers have access to call logs.
`}
    </ReactMarkdown>;
}
