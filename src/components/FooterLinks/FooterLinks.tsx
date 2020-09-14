import React from "react";
import { Link } from "react-router-dom";
import "./FooterLinks.scss";

export default function FooterLinks() {
    return <div className="footer-links">
        <Link className="footer-link" to="/about" title="About Clowdr">About</Link>
        <span className="dot">&middot;</span>
        <Link className="footer-link" to="/legal" title="Clowdr legal information">Legal</Link>
        <span className="dot">&middot;</span>
        <Link className="footer-link" to="/help" title="Get help with Clowdr">Help</Link>
    </div>;
}
