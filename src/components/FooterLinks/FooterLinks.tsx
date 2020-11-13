import React from "react";
import { Link } from "react-router-dom";
import "./FooterLinks.scss";

interface Props {
    doLogout?: () => void;
    onItemClicked?: () => void;
}

export default function FooterLinks(props: Props) {
    let logoutButton = <></>;
    if (props.doLogout) {
        logoutButton = (
            // The blank "dot" is to achieve even spacing
            <>
                <button className="footer-link signout" onClick={props.doLogout} aria-label="Sign out">
                    Sign out
                </button>
                <span className="dot"></span>
            </>
        );
    }

    return (
        <footer className="footer-links" aria-label="Footer links">
            {logoutButton}
            <Link className="footer-link" to="/about" onClick={props.onItemClicked}>
                About
            </Link>
            <span className="dot">&middot;</span>
            <Link className="footer-link" to="/legal" onClick={props.onItemClicked}>
                Legal
            </Link>
            <span className="dot">&middot;</span>
            <Link className="footer-link" to="/help" onClick={props.onItemClicked}>
                Help
            </Link>
        </footer>
    );
}
