import React from "react";
import { Link } from "react-router-dom";
import "./FooterLinks.scss";

export default function FooterLinks() {
    return <footer className="footer-links">
        <Link className="footer-link" to="/about">About</Link>
        <span className="dot">&middot;</span>
        <Link className="footer-link" to="/legal">Legal</Link>
        <span className="dot">&middot;</span>
        <Link className="footer-link" to="/help">Help</Link>
    </footer>;
}
