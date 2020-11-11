import { Sponsor } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import _ from "lodash";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useConference from "../../../hooks/useConference";
import {
    DataDeletedEventDetails,
    DataUpdatedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../hooks/useDataSubscription";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";
import "./AllSponsors.scss";

export default function AllSponsors() {
    useHeading("Sponsors");
    const conference = useConference();
    const [sponsors, setSponsors] = useState<Sponsor[] | null>();

    useSafeAsync(
        async () => (await Sponsor.getAll(conference.id)) ?? null,
        setSponsors,
        [conference.id],
        "AllSponsors:Sponsor.getAll"
    );

    // Subscribe to sponsor updates
    const onSponsorsUpdated = useCallback(function _onSponsorsUpdated(ev: DataUpdatedEventDetails<"Sponsor">) {
        setSponsors(oldSponsors => {
            if (oldSponsors) {
                const newSponsors = Array.from(oldSponsors);
                for (const object of ev.objects) {
                    const content = object as Sponsor;
                    const idx = newSponsors?.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newSponsors.push(content);
                    } else {
                        newSponsors.splice(idx, 1, content);
                    }
                }
                return newSponsors;
            }
            return null;
        });
    }, []);

    const onSponsorsDeleted = useCallback(function _onSponsorsDeleted(ev: DataDeletedEventDetails<"Sponsor">) {
        setSponsors(oldSponsors => oldSponsors?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);

    useDataSubscription("Sponsor", onSponsorsUpdated, onSponsorsDeleted, !sponsors, conference);

    const sponsorGroups = _.groupBy(sponsors, x => x.level);

    return (
        <section className="all-sponsors">
            {0 in sponsorGroups && sponsorGroups[0].length > 0 ? (
                <>
                    <h2>Gold</h2>
                    <div className="sponsor-items sponsor-items--gold">
                        {sponsorGroups[0]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(sponsor =>
                                sponsor.logo ? (
                                    <a href={`/sponsor/${sponsor.id}`} className="sponsor-item">
                                        <img
                                            className="sponsor-item__logo"
                                            src={handleParseFileURLWeirdness(sponsor.logo) ?? ""}
                                            alt={sponsor.name}
                                        />
                                    </a>
                                ) : (
                                    <a href={`/sponsor/${sponsor.id}`} className="sponsor-item">
                                        {sponsor.name}
                                    </a>
                                )
                            )}
                    </div>
                </>
            ) : (
                <></>
            )}
            {1 in sponsorGroups && sponsorGroups[1].length > 0 ? (
                <>
                    <h2>Silver</h2>
                    <div className="sponsor-items sponsor-items--silver">
                        {sponsorGroups[1]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(sponsor =>
                                sponsor.logo ? (
                                    <a href={`/sponsor/${sponsor.id}`} className="sponsor-item">
                                        <img
                                            className="sponsor-item__logo"
                                            src={handleParseFileURLWeirdness(sponsor.logo) ?? ""}
                                            alt={sponsor.name}
                                        />
                                    </a>
                                ) : (
                                    <a href={`/sponsor/${sponsor.id}`} className="sponsor-item">
                                        {sponsor.name}
                                    </a>
                                )
                            )}
                    </div>
                </>
            ) : (
                <></>
            )}
            {1 in sponsorGroups && sponsorGroups[1].length > 0 ? (
                <>
                    <h2>Bronze</h2>
                    <div className="sponsor-items sponsor-items--bronze">
                        {2 in sponsorGroups &&
                            sponsorGroups[2]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(sponsor =>
                                    sponsor.logo ? (
                                        <a href={`/sponsor/${sponsor.id}`} className="sponsor-item">
                                            <img
                                                className="sponsor-item__logo"
                                                src={handleParseFileURLWeirdness(sponsor.logo) ?? ""}
                                                alt={sponsor.name}
                                            />
                                        </a>
                                    ) : (
                                        <a href={`/sponsor/${sponsor.id}`} className="sponsor-item">
                                            {sponsor.name}
                                        </a>
                                    )
                                )}
                    </div>
                </>
            ) : (
                <></>
            )}
        </section>
    );
}
