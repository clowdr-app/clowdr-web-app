import React, { useEffect, useState } from "react";
import { Conference } from "../../../classes/DataLayer";
import { Link } from "react-router-dom";
import "./ConferenceSelection.scss";

export default function ConferenceSelection() {
    const [conferences, setConferences] = useState<Conference[]>([]);

    useEffect(() => {
        Conference
            .getAll()
            .then(confs => {
                confs.sort((x, y) => x.conferenceName.localeCompare(y.conferenceName));
                setConferences(confs);
            });
    });

    return <div className="conference-selection-container">
        <div className="main">
            <h1 className="banner">Welcome to Clowdr</h1>
            <p>Please select your conference to begin</p>
            <select disabled={conferences.length === 0}>
                {conferences.map(conf =>
                    <option value={conf.id}>{conf.conferenceName}</option>
                )}
            </select>
            <div>
                <button className="join-button">Join</button>
            </div>
        </div>
        <div className="bottom-links">
            <Link className="bottom-link" to="/about">About</Link>
            <span className="dot">&middot;</span>
            <Link className="bottom-link" to="/legal">Legal</Link>
            <span className="dot">&middot;</span>
            <Link className="bottom-link" to="/help">Help</Link>
        </div>
    </div>;
}
