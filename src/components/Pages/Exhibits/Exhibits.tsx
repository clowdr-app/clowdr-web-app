import { ProgramItem, ProgramItemAttachment, ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import AttachmentLink from "../Program/Event/AttachmentLink";
import Exhibit from "./Exhibit/Exhibit";
import "./Exhibits.scss";

interface ExhibitsProps {

}

export default function Exhibits(props: ExhibitsProps) {
    const conference = useConference();
    const [programItems, setProgramItems] = useState<ProgramItem[] | undefined>();

    useHeading("Exhibition");

    // Fetch initial ProgramItems
    useSafeAsync(
        async () => (await ProgramItem.getAll(conference.id)).filter(programItem => programItem.exhibit),
        setProgramItems, [conference.id]);

    // Subscribe to ProgramItem updates
    const onProgramItemUpdated = useCallback(function _onProgramItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        setProgramItems(programItems => {
            const newProgramItems = Array.from(programItems ?? []);
            const idx = newProgramItems?.findIndex(x => x.id === ev.object.id);
            let updatedProgramItem = ev.object as ProgramItem;
            if (idx === -1 && updatedProgramItem.exhibit) {
                newProgramItems.push(updatedProgramItem);
            } else {
                if (updatedProgramItem.exhibit) {
                    newProgramItems.splice(idx, 1, updatedProgramItem);
                } else {
                    newProgramItems.splice(idx, 1);
                }
            }
            return newProgramItems;
        });
    }, []);

    const onProgramItemDeleted = useCallback(function _onProgramItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setProgramItems(programItems => (programItems ?? []).filter(item => item.id !== ev.objectId));
    }, []);

    useDataSubscription("ProgramItem", onProgramItemUpdated, onProgramItemDeleted, !programItems, conference);


    return <section aria-labelledby="page-title" tabIndex={0} className="exhibits-page">
        <div className="exhibits">
            {programItems 
                ? programItems.map(programItem => <div className="exhibits__exhibit"><Exhibit programItem={programItem} key={programItem.id} /></div>)
                : <LoadingSpinner message="Loading exhibits" /> }
        </div>
    </section>
}