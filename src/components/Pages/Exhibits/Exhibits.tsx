import { ProgramItem, ProgramItemAttachment, ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import AttachmentLink from "../Program/Event/AttachmentLink";
import "./Exhibits.scss";

interface ExhibitsProps {

}

interface RenderData {
    programItems: Array<ProgramItem>;
    programItemAttachments: Map<string, Array<ProgramItemAttachment>>;
    programPeople: Map<string, ProgramPerson | undefined>;
}

export default function Exhibits(props: ExhibitsProps) {
    const conference = useConference();

    const [renderData, setRenderData] = useState<RenderData>({ programItems: [], programItemAttachments: new Map(), programPeople: new Map() });

    useHeading("Exhibition");

    // Note: we don't bother keeping ProgramPersons' details up to date

    // TODO: fetch new authors details as they arrive

    // Fetch initial render data (program items and their attachments)
    useSafeAsync(
        async () => {
            let programItems = (await ProgramItem.getAll(conference.id)).filter(programItem => programItem.exhibit);
            let authors = (await Promise.all(programItems.map(async programItem => await programItem.authorPerons))).flat();
            let programPeople = new Map(authors.map(author => [author.id, author]))

            async function programItemToAttachmentsEntry(programItem: ProgramItem): Promise<[string, ProgramItemAttachment[]]> {
                return [programItem.id, await programItem.attachments];
            }

            let programItemAttachments = new Map(await Promise.all(programItems.map(programItemToAttachmentsEntry)));
            return {
                programItems,
                programItemAttachments,
                programPeople,
            };
        },
        setRenderData, [conference.id]);

    // Subscribe to ProgramItem updates
    const onProgramItemUpdated = useCallback(function _onProgramItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        setRenderData(renderData => {
            const newProgramItems = Array.from(renderData.programItems ?? []);
            const newProgramItemAttachments = new Map(renderData.programItemAttachments);
            const idx = newProgramItems?.findIndex(x => x.id === ev.object.id);
            let updatedProgramItem = ev.object as ProgramItem;
            if (idx === -1 && updatedProgramItem.exhibit) {
                newProgramItems.push(updatedProgramItem);
            } else {
                if (updatedProgramItem.exhibit) {
                    newProgramItems.splice(idx, 1, updatedProgramItem);
                } else {
                    newProgramItems.splice(idx, 1);
                    newProgramItemAttachments.delete(updatedProgramItem.id);
                }
            }
            return {
                programItems: newProgramItems,
                programItemAttachments: newProgramItemAttachments,
                programPeople: renderData.programPeople,
            }
        });
    }, []);

    const onProgramItemDeleted = useCallback(function _onProgramItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setRenderData(renderData => {
            const newProgramItemAttachments = new Map(renderData.programItemAttachments);
            newProgramItemAttachments.delete(ev.objectId);
            return {
                programItems: renderData.programItems.filter(item => item.id !== ev.objectId),
                programItemAttachments: newProgramItemAttachments,
                programPeople: renderData.programPeople,
            }
        });
    }, []);

    useDataSubscription("ProgramItem", onProgramItemUpdated, onProgramItemDeleted, renderData.programItems.length === 0, conference);

    // Subscribe to ProgramItemAttachment updates
    const onProgramItemAttachmentUpdated = useCallback(function _onProgramItemAttachmentUpdated(ev: DataUpdatedEventDetails<"ProgramItemAttachment">) {
        setRenderData(renderData => {
            const newProgramItemAttachmentsMap = new Map<string, ProgramItemAttachment[]>();
            let updatedProgramItemAttachment = ev.object as ProgramItemAttachment;

            // First, remove the attachment from any existing items
            for (let [programItemId, programItemAttachments] of renderData.programItemAttachments.entries()) {
                const newProgramItemAttachments = programItemAttachments.filter(attachment => updatedProgramItemAttachment.id !== attachment.id);
                newProgramItemAttachmentsMap[programItemId] = newProgramItemAttachments;
            }

            // Then add the attachment back to its current item
            newProgramItemAttachmentsMap[updatedProgramItemAttachment.programItemId] = updatedProgramItemAttachment;

            return {
                programItems: renderData.programItems,
                programItemAttachments: newProgramItemAttachmentsMap,
                programPeople: renderData.programPeople,
            };
        });
    }, []);

    const onProgramItemAttachmentDeleted = useCallback(function _onProgramItemAttachmentDeleted(ev: DataDeletedEventDetails<"ProgramItemAttachment">) {
        setRenderData(renderData => {
            const newProgramItemAttachmentsMap = new Map();

            for (let [programItemId, programItemAttachments] of renderData.programItemAttachments.entries()) {
                newProgramItemAttachmentsMap[programItemId] = programItemAttachments.filter(x => x.id !== ev.objectId);
            }

            return {
                programItems: renderData.programItems,
                programItemAttachments: newProgramItemAttachmentsMap,
                programPeople: renderData.programPeople,
            };
        });
    }, []);

    useDataSubscription("ProgramItemAttachment", onProgramItemAttachmentUpdated, onProgramItemAttachmentDeleted, renderData.programItems.length === 0, conference);

    return <section aria-labelledby="page-title" tabIndex={0} className="exhibits-page">
        <div className="exhibits">
            {renderData.programItems.map(programItem => {
                let attachments = renderData.programItemAttachments.get(programItem.id);
                return <article className="exhibit" aria-labelledby={`exhibit-${programItem.id}__title`} key={programItem.id}>
                    <h2 id={`exhibit-${programItem.id}__title`}>{programItem.title}</h2>
                    <p>{programItem.abstract}</p>
                    {attachments ? attachments.map(x => <AttachmentLink key={x.id} attachment={x} />) : <></>}
                    <Link to={`/item/${programItem.id}`} className="button">View</Link>
                </article>;
            })}
        </div>
    </section>
}