import React from "react";
import { Link } from "react-router-dom";

export default function FooterLinks() {
    return <div className="bottom-links">
        <Link className="bottom-link" to="/about">About</Link>
        <span className="dot">&middot;</span>
        <Link className="bottom-link" to="/legal">Legal</Link>
        <span className="dot">&middot;</span>
        <Link className="bottom-link" to="/help">Help</Link>
    </div>;
}
