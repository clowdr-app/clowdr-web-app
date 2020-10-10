import React from "react";
import { Link } from "react-router-dom";
import useHeading from "../../../hooks/useHeading";
import "./NotFound.scss";

export default function NotFound() {
    useHeading("Not Found");

    return <div className="not-found-container">
        <div className="not-found">
            <i className="fas fa-cat fa-5x icon"></i>
            <h2>Sorry, we couldn't find that page.</h2>
            <p>
                If you keep seeing this error, please <Link to="/moderation">contact your conference organizers</Link>.
            </p>
        </div>
    </div>;
}
