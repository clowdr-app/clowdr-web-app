import React, { useEffect, useState } from "react";
import { Conference } from "../../../classes/DataLayer";
import "./ConferenceSelection.scss";
import FooterLinks from "../../FooterLinks/FooterLinks";
import DocumentTitle from "react-document-title";

export type failedToLoadConferencesF = (reason: any) => Promise<void>;
export type selectConferenceF = (conferenceId: string) => Promise<void>;

interface Props {
    failedToLoadConferences: failedToLoadConferencesF;
    selectConference: selectConferenceF;
}

export default function ConferenceSelection(props: Props) {
    const [conferences, setConferences] = useState<Conference[]>([]);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            const conferences = await Conference.getAll().catch(async (reason) => {
                await props.failedToLoadConferences(reason);
                return [];
            });
            conferences.sort((x, y) => x.conferenceName.localeCompare(y.conferenceName));
            if (isMounted) {
                setConferences(conferences);
                if (conferences.length > 0) {
                    setSelected(conferences[0].id);
                }
            }
        })();
        return () => { isMounted = false };
    }, [props]);

    const submitSelection = () => {
        props.selectConference(selected as string)
    };

    return <DocumentTitle title="Clowdr: Select a conference">
        <div className="conference-selection-container">
            <section className="main" aria-labelledby="page-title" tabIndex={0}>
                <h1 id="page-title" className="banner" aria-level={1}>Welcome to Clowdr</h1>
                <p>Please select your conference to begin</p>
                <form className="input-wrapper">
                    <select disabled={conferences.length === 0} onChange={e => setSelected(e.target.value)}
                        title="Conference">
                        {conferences.map((conf, i) =>
                            <option key={i} value={conf.id}>{conf.conferenceName}</option>
                        )}
                    </select>
                    <button
                        className={"join-button" + (selected === null ? " join-button-disabled" : "")}
                        disabled={selected === null}
                        onClick={submitSelection}
                        title="Join"
                    >
                        Join
                    </button>
                </form>
            </section>
            <FooterLinks />
        </div>
    </DocumentTitle>;
}
