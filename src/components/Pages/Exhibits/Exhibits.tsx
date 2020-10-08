import { ProgramItem, ProgramItemAttachment } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useEffect, useState } from "react";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";

interface ExhibitsProps {

}

interface RenderData {
    programItems: Array<ProgramItem>;
    programItemAttachments: Map<string, Array<ProgramItemAttachment>>;
}

export default function Exhibits(props: ExhibitsProps) {
    const conference = useConference();

    const [renderData, setRenderData] = useState<RenderData>({ programItems: [], programItemAttachments: new Map() });

    useHeading("Exhibition");

    // Fetch initial render data (program items and their attachments)
    useSafeAsync(
        async () => {

            let programItems = (await ProgramItem.getAll(conference.id)).filter(programItem => programItem.exhibit);

            async function programItemToAttachmentsEntry(programItem: ProgramItem): Promise<[string, ProgramItemAttachment[]]> {
                return [programItem.id, await programItem.attachments];
            }

            let programItemAttachments = new Map(await Promise.all(programItems.map(programItemToAttachmentsEntry)));
            return {
                programItems,
                programItemAttachments,
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
                //setDirtyItems(dirty => [...dirty, updatedProgramItem.id]);
            } else {
                if (updatedProgramItem.exhibit) {
                    newProgramItems.splice(idx, 1, updatedProgramItem);
                    //setDirtyItems(dirty => [...dirty, updatedProgramItem.id]);
                } else {
                    newProgramItems.splice(idx, 1);
                    newProgramItemAttachments.delete(updatedProgramItem.id);
                }
            }
            return {
                programItems: newProgramItems,
                programItemAttachments: newProgramItemAttachments,
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
            }
        });
    }, []);

    useDataSubscription("ProgramItem", onProgramItemUpdated, onProgramItemDeleted, renderData.programItems.length === 0, conference);

    // Subscribe to ProgramItemAttachment updates
    const onProgramItemAttachmentUpdated = useCallback(function _onProgramItemAttachmentUpdated(ev: DataUpdatedEventDetails<"ProgramItemAttachment">) {
        setRenderData(renderData => {
            const newProgramItemAttachmentsMap = new Map<string, ProgramItemAttachment[]>();
            let updatedProgramItemAttachment = ev.object as ProgramItemAttachment;

            for (let [programItemId, programItemAttachments] of renderData.programItemAttachments.entries()) {
                const newProgramItemAttachments = Array.from(programItemAttachments ?? []);
                const idx = programItemAttachments.findIndex(x => x.id === updatedProgramItemAttachment.id);
                if (idx === -1) {
                    newProgramItemAttachments.push(updatedProgramItemAttachment);
                } else {
                    newProgramItemAttachments.splice(idx, 1, updatedProgramItemAttachment);
                }
                newProgramItemAttachmentsMap[programItemId] = newProgramItemAttachments;
            }

            return {
                programItems: renderData.programItems,
                programItemAttachments: newProgramItemAttachmentsMap,
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
            };
        });
    }, []);

    useDataSubscription("ProgramItemAttachment", onProgramItemAttachmentUpdated, onProgramItemAttachmentDeleted, renderData.programItems.length === 0, conference);

    return <>
        {}
    </>
}