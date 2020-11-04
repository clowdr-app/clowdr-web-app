import { Sponsor } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import Parse from "parse";
import { Redirect } from "react-router-dom";
import useConference from "../../../../hooks/useConference";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import useUserRoles from "../../../../hooks/useUserRoles";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import EditSponsor, { SponsorData } from "./EditSponsor";
import "./Sponsors.scss";

interface Props {}

export default function Sponsors(props: Props) {
    const { isAdmin } = useUserRoles();
    const conference = useConference();
    const [sponsors, setSponsors] = useState<Sponsor[] | undefined>();

    useSafeAsync(
        async () => conference && (await Sponsor.getAll(conference.id)),
        setSponsors,
        [conference],
        "Sponsors:Sponsor.getAll"
    );

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
            {sponsors?.map(sponsor => (
                <div key={sponsor.id}>
                    <h3>{sponsor.name}</h3>
                    <EditSponsor
                        updateSponsor={async data => await editSponsor(sponsor.id, data)}
                        existingSponsor={sponsor}
                    />
                </div>
            ))}
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

    return isAdmin === null ? <LoadingSpinner /> : isAdmin ? contents : <Redirect to="/notfound" />;
}
