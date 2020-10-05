import React from "react";
import useHeading from "../../../hooks/useHeading";
import "./ComingSoon.scss";

export default function ComingSoon() {
    useHeading("Coming Soon");

    return <div className="coming-soon-container">
        <div className="coming-soon">
            <i className="fas fa-cat fa-5x icon"></i>
            <h2>This page is coming soon</h2>
            <p>
                Attendee experience is our top priority - so we are filling in the
                remaining features as quickly as possible.
            </p>
            <p>
                We'll then be working on the moderator and admin pages to help
                you do what you do best: running an awesome conference. At a minimum,
                the pages for handling moderation requests (reported messages and
                general requests from attendees), uploading poster images, adding
                new registrants, and editing critical (live) bits of the program
                will be available during CSCW.
            </p>
        </div>
    </div>;
}
