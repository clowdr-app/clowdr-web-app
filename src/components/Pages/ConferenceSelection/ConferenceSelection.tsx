import React, { useEffect, useState } from "react";
import { Conference } from "../../../classes/DataLayer";
import "./ConferenceSelection.scss";
import FooterLinks from "../../FooterLinks/FooterLinks";

export type selectConferenceF = (conferenceId: string) => Promise<void>;

interface Props {
    selectConference: selectConferenceF;
}

export default function ConferenceSelection(props: Props) {
    const [conferences, setConferences] = useState<Conference[]>([]);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            const conferences = await Conference.getAll();
            conferences.sort((x, y) => x.conferenceName.localeCompare(y.conferenceName));
            if (isMounted) {
                setConferences(conferences);
                if (conferences.length > 0) {
                    setSelected(conferences[0].id);
                }
            }
        })();
        return () => { isMounted = false };
    }, []);

    const submitSelection = () => {
        props.selectConference(selected as string)
    };

    return <div className="conference-selection-container">
        <div className="main">
            <h1 className="banner">Welcome to Clowdr</h1>
            <p>Please select your conference to begin</p>
            <div className="input-wrapper">
                <select disabled={conferences.length === 0} onChange={e => setSelected(e.target.value)}>
                    {conferences.map((conf, i) =>
                        <option key={i} value={conf.id}>{conf.conferenceName}</option>
                    )}
                </select>
                <div>
                    <button
                        className={"join-button" + (selected == null ? " join-button-disabled" : "")}
                        disabled={selected == null}
                        onClick={submitSelection}
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
        <FooterLinks />
    </div>;
}
