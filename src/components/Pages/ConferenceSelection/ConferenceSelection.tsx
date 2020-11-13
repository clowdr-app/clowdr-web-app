import React, { FormEvent, useEffect, useState } from "react";
import { Conference } from "@clowdr-app/clowdr-db-schema";
import "./ConferenceSelection.scss";
import FooterLinks from "../../FooterLinks/FooterLinks";
import useHeading from "../../../hooks/useHeading";
import { makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";

export type failedToLoadConferencesF = (reason: any) => Promise<void>;
export type selectConferenceF = (conferenceId: string | null) => Promise<boolean>;

interface Props {
    failedToLoadConferences: failedToLoadConferencesF;
    selectConference: selectConferenceF;
}

export default function ConferenceSelection(props: Props) {
    const [conferences, setConferences] = useState<Conference[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [loadFailed, setLoadFailed] = useState<boolean>(false);

    const { failedToLoadConferences, selectConference } = props;

    useHeading("Clowdr");

    useEffect(() => {
        let cancelConferencesPromise: () => void = () => { };

        async function getConferences() {
            try {
                let { promise, cancel } = makeCancelable(Conference.getAll().catch(async (reason) => {
                    await failedToLoadConferences(reason);
                    setLoadFailed(true);
                    return [];
                }));
                cancelConferencesPromise = cancel;

                const _conferences = await promise;
                _conferences.sort((x, y) => x.name.localeCompare(y.name));

                setConferences(_conferences);
                if (_conferences.length > 0) {
                    const hostname = window.location.hostname;
                    const clowdrDomain = ".clowdr.org";
                    const subdomain = hostname.substr(0, hostname.length - clowdrDomain.length).toLowerCase();
                    const possibleConferences = _conferences.filter(x => x.shortName.replace(/ /gi, "").toLowerCase() === subdomain);
                    if (possibleConferences.length > 0) {
                        setSelected(possibleConferences[0].id);
                    }
                    else {
                        setSelected(_conferences[0].id);
                    }
                }

                cancelConferencesPromise = () => { };
            }
            catch (e) {
                if (!e || !e.isCanceled) {
                    throw e;
                }
            }
        }

        getConferences();

        return function cleanupGetConferences() {
            cancelConferencesPromise();
        };
    }, [failedToLoadConferences]);

    const submitSelection = async (ev: FormEvent<HTMLElement>) => {
        ev.preventDefault();

        if (!(await selectConference(selected as string))) {
            // TODO: Display an error to the user
            console.error(`Could not select conference: ${selected}`);
        }
    };

    return <div className="conference-selection-container">
        <section className="main" aria-labelledby="page-title" tabIndex={0}>
            <h1 id="page-title" className="banner" aria-level={1}>Welcome to Clowdr</h1>
            {conferences.length === 0 && !loadFailed ? <LoadingSpinner /> : <></>}
            {loadFailed
                ? <>
                    <p>Unfortunately we were unable to load our list of conferences.</p>
                    <p>Please try again later or reach out to us via your conference organiser.</p>
                </>
                : <div className={"after-load-content" +
                    (conferences.length === 0 || selected == null ? " after-load-hidden" : "")}
                >
                    <p>Please select your conference to begin</p>
                    <form className="input-wrapper" onSubmit={submitSelection}>
                        <select
                            aria-label="Select Conference"
                            onChange={e => setSelected(e.target.value)}
                            value={selected ?? ""}>
                            {conferences.map((conf, i) =>
                                <option key={i} value={conf.id}>{conf.name}</option>
                            )}
                        </select>
                        <button className="join-button" aria-label="Click to go to the selected conference">
                            Join
                    </button>
                    </form>
                </div>
            }
        </section>
        <FooterLinks />
    </div>;
}
