import { ProgramItem, ProgramItemAttachment } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import ExhibitAttachment from "./ExhibitAttachment/ExhibitAttachment";
import ExhibitAuthorsList from "./ExhibitAuthorsList/ExhibitAuthorsList";
import "./Exhibit.scss";

interface ExhibitProps {
    programItem: ProgramItem;
}

export default function Exhibit(props: ExhibitProps) {
    const conference = useConference();
    const [attachments, setAttachments] = useState<ProgramItemAttachment[] | undefined>();

    // Fetch initial ProgramItemAttachments
    useSafeAsync(
        async () => (await ProgramItemAttachment.getAll(conference.id)).filter(attachment => attachment.programItemId === props.programItem.id),
        setAttachments, [conference.id]);

    // Subscribe to ProgramItemAttachment updates
    const onProgramItemAttachmentUpdated = useCallback(function _onProgramItemAttachmentUpdated(ev: DataUpdatedEventDetails<"ProgramItemAttachment">) {
        setAttachments(attachments => {
            let updatedAttachment = ev.object as ProgramItemAttachment;
            let newAttachments = (attachments ?? []).filter(attachment => attachment.id !== updatedAttachment.id);

            if (updatedAttachment.programItemId === props.programItem.id) {
                newAttachments.push(updatedAttachment);
            }

            return newAttachments
        });
    }, [props.programItem]);

    const onProgramItemAttachmentDeleted = useCallback(function _onProgramItemAttachmentDeleted(ev: DataDeletedEventDetails<"ProgramItemAttachment">) {
        setAttachments(attachments => (attachments ?? []).filter(attachment => attachment.id !== ev.objectId));
    }, []);

    useDataSubscription("ProgramItemAttachment", onProgramItemAttachmentUpdated, onProgramItemAttachmentDeleted, !attachments, conference);

    return <article className="exhibit" aria-labelledby={`exhibit-${props.programItem.id}__title`}>
        <Link to={`/item/${props.programItem.id}`} className="exhibit__title">
            <h2 id={`exhibit-${props.programItem.id}__title`}>{props.programItem.title}</h2>
        </Link>
        <ExhibitAuthorsList item={props.programItem} />
        {attachments?.length === 0
            ? <p className="exhibit__abstract">{props.programItem.abstract}</p>
            : <ExhibitAttachment attachments={attachments} />}

        <div className="view-item">
            <Link to={`/item/${props.programItem.id}`} className="button">View {props.programItem.title}</Link>
        </div>
    </article>;
}