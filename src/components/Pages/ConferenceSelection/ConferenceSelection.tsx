import React, { FormEvent, useEffect, useState } from "react";
import { Conference } from "../../../classes/DataLayer";
import "./ConferenceSelection.scss";
import FooterLinks from "../../FooterLinks/FooterLinks";
import useDocTitle from "../../../hooks/useDocTitle";
import { makeCancelable } from "../../../classes/Util";

export type failedToLoadConferencesF = (reason: any) => Promise<void>;
export type selectConferenceF = (conferenceId: string | null) => Promise<boolean>;

interface Props {
    failedToLoadConferences: failedToLoadConferencesF;
    selectConference: selectConferenceF;
}

export default function ConferenceSelection(props: Props) {
    const [conferences, setConferences] = useState<Conference[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [conferencesPromise, setConferencesPromise] = useState<Promise<Conference[]> | null>(null);

    const docTitle = useDocTitle();
    useEffect(() => {
        docTitle.set("Clowdr");
    }, [docTitle]);

    useEffect(() => {
        let cancelConferencesPromise: () => void = () => { };

        async function getConferences() {
            if (!conferencesPromise) {
                try {
                    let { promise, cancel } = makeCancelable(Conference.getAll().catch(async (reason) => {
                        await props.failedToLoadConferences(reason);
                        return [];
                    }));
                    setConferencesPromise(promise);
                    cancelConferencesPromise = cancel;

                    const _conferences = await promise;
                    _conferences.sort((x, y) => x.name.localeCompare(y.name));

                    setConferences(_conferences);
                    if (_conferences.length > 0) {
                        setSelected(_conferences[0].id);
                    }

                    cancelConferencesPromise = () => { };
                }
                catch (e) {
                    if (!e || !e.isCanceled) {
                        throw e;
                    }
                }
            }
        }

        getConferences();

        return function cleanupGetConferences() {
            // So, despite the type-based guarantees, it turns out the effect
            // can get cleaned up before it was even initialised, resulting in
            // things being undefined which oughn't be.
            if (cancelConferencesPromise && conferencesPromise) {
                cancelConferencesPromise();
                setConferencesPromise(null);
            }
        };
    }, [props, conferencesPromise]);

    const submitSelection = async (ev: FormEvent<HTMLElement>) => {
        ev.preventDefault();

        if (!(await props.selectConference(selected as string))) {
            // TODO: Display an error to the user
            console.error(`Could not select conference: ${selected}`);
        }
    };

    return <div className="conference-selection-container">
        <section className="main" aria-labelledby="page-title" tabIndex={0}>
            <h1 id="page-title" className="banner" aria-level={1}>Welcome to Clowdr</h1>
            <div className={"after-load-content" +
                (conferences.length === 0 || selected == null ? " after-load-hidden" : "")}
            >
                <p>Please select your conference to begin</p>
                <form className="input-wrapper" onSubmit={submitSelection}>
                    <select onChange={e => setSelected(e.target.value)}
                        title="Conference">
                        {conferences.map((conf, i) =>
                            <option key={i} value={conf.id}>{conf.name}</option>
                        )}
                    </select>
                    <button className="join-button" title="Join">
                        Join
                    </button>
                </form>
            </div>
        </section>
        <FooterLinks />
    </div>;
}
