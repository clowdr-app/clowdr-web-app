import { Sponsor } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useState } from "react";
import Parse from "parse";
import useConference from "../../../../hooks/useConference";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import EditSponsor, { SponsorData } from "./EditSponsor";
import "./Sponsors.scss";
import {
    DataUpdatedEventDetails,
    DataDeletedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import { Link } from "react-router-dom";

export default function Sponsors() {
    const conference = useConference();
    const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);

    useSafeAsync(
        async () => (await Sponsor.getAll(conference.id)) ?? null,
        setSponsors,
        [conference.id],
        "Admin/Sponsors:Sponsor.getAll"
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

    async function createSponsor(data: SponsorData) {
        const requestData = {
            ...data,
            conference: conference.id,
        };

        await Parse.Cloud.run("create-sponsor", requestData);
    }

    async function editSponsor(id: string, data: SponsorData) {
        const sponsor = await Sponsor.get(id, conference.id);
        if (sponsor) {
            sponsor.name = data.name;
            sponsor.description = data.description;
            sponsor.logo = data.logo;
            sponsor.colour = data.colour;
            sponsor.level = data.level;
            sponsor.representativeProfileIds = data.representativeProfileIds;
            await sponsor.save();
        }
    }

    const existingSponsors = (
        <>
            {sponsors && sponsors.length > 0 ? (
                sponsors
                    ?.sort((a, b) => a.name.localeCompare(b.name))
                    ?.map(sponsor => (
                        <div key={sponsor.id}>
                            <h3>
                                <Link to={`/sponsor/${sponsor.id}`}>{sponsor.name}</Link>
                            </h3>
                            <EditSponsor
                                updateSponsor={async data => await editSponsor(sponsor.id, data)}
                                existingSponsor={sponsor}
                            />
                        </div>
                    ))
            ) : (
                <p>No sponsors found.</p>
            )}
        </>
    );

    const contents = (
        <section className="sponsors-admin">
            <h2>Add sponsor</h2>
            <EditSponsor updateSponsor={createSponsor} />
            <h2>Edit existing sponsors</h2>
            {existingSponsors}
        </section>
    );

    return contents;
}
