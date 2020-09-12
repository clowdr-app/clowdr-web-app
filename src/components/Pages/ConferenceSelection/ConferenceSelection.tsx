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
        <h1 className="banner">Welcome to Clowdr</h1>
        <p>Please select your conference to begin</p>
        <select disabled={conferences.length === 0}>
            {conferences.map(conf =>
                <option value={conf.id}>{conf.conferenceName}</option>
            )}
        </select>
        <button className="join-button">Join</button>
        <ul className="bottom-links">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/legal">Legal</Link></li>
            <li><Link to="/help">Help</Link></li>
        </ul>
    </div>;
}
