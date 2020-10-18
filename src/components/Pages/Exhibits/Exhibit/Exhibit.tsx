import { ProgramItem, ProgramItemAttachment, ProgramSessionEvent, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
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
    const [track, setTrack] = useState<ProgramTrack | undefined>();
    const [singleEvent, setSingleEvent] = useState<ProgramSessionEvent | "none" | "multiple" | null>(null);

    // Fetch initial ProgramItemAttachments
    useSafeAsync(
        async () => (await ProgramItemAttachment.getAll(conference.id)).filter(attachment => attachment.programItemId === props.programItem.id),
        setAttachments, [props.programItem.id, conference.id]);

    useSafeAsync(
        async () => {
            const events = await props.programItem.events;
            if (events.length === 1) {
                return events[0];
            }
            else if (events.length === 0) {
                return "none";
            }
            else {
                return "multiple";
            }
        }, setSingleEvent, []);

    useSafeAsync(
        async () => await props.programItem.track,
        setTrack,
        [props.programItem.id]);

    // Subscribe to ProgramItemAttachment updates
    const onProgramItemAttachmentUpdated = useCallback(function _onProgramItemAttachmentUpdated(ev: DataUpdatedEventDetails<"ProgramItemAttachment">) {
        setAttachments(oldAttachments => {
            let newAttachments = oldAttachments ?? [];
            for (const object of ev.objects) {
                const updatedAttachment = object as ProgramItemAttachment;
                newAttachments = (oldAttachments ?? []).filter(attachment => attachment.id !== updatedAttachment.id);
                if (updatedAttachment.programItemId === props.programItem.id) {
                    newAttachments.push(updatedAttachment);
                }
            }
            return newAttachments
        });
    }, [props.programItem]);

    const onProgramItemAttachmentDeleted = useCallback(function _onProgramItemAttachmentDeleted(ev: DataDeletedEventDetails<"ProgramItemAttachment">) {
        setAttachments(oldAttachments => (oldAttachments ?? []).filter(attachment => attachment.id !== ev.objectId));
    }, []);

    useDataSubscription("ProgramItemAttachment", onProgramItemAttachmentUpdated, onProgramItemAttachmentDeleted, !attachments, conference);

    return <article className="exhibit" aria-labelledby={`exhibit-${props.programItem.id}__title`}>
        <Link to={`/item/${props.programItem.id}`} className="exhibit__title">
            <i className="fas fa-circle" style={{ color: track?.colour }}></i>
            <h2 id={`exhibit-${props.programItem.id}__title`}>
                {props.programItem.title}
            </h2>
        </Link>
        <ExhibitAuthorsList item={props.programItem} />
        {attachments?.length === 0
            ? <p className="exhibit__abstract">{props.programItem.abstract}</p>
            : <ExhibitAttachment attachments={attachments} />}

        <div className="view-item">
            {singleEvent && singleEvent !== "none" && singleEvent !== "multiple"
                ? <Link to={`/event/${singleEvent.id}`} className="button">View this item</Link>
                : <Link to={`/item/${props.programItem.id}`} className="button">View this item</Link>
            }
        </div>
    </article>;
}
