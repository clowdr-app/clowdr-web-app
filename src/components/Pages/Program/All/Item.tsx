import { ProgramItem, ProgramPerson, ProgramSessionEvent } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { useHistory } from "react-router-dom";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import AuthorsList from "../AuthorsList";
import { WholeProgramData } from "../WholeProgramData";

interface Props {
    item: ProgramItem;
    data?: WholeProgramData;
    clickable?: boolean;
}

export default function Item(props: Props) {
    const item = props.item;
    const conference = useConference();
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(props.data?.authors?.filter(x => item.authors.includes(x.id)) ?? null);
    const [singleEvent, setSingleEvent] = useState<ProgramSessionEvent | "none" | "multiple" | null>(null);
    const history = useHistory();

    useSafeAsync(
        async () => authors ?? await item.authorPerons,
        setAuthors,
        [item, props.data?.authors]);

    useSafeAsync(
        async () => {
            const events = await props.item.events;
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

    const onAuthorUpdated = useCallback(function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        setAuthors(oldAuthors => {
            const newAuthors = Array.from(oldAuthors ?? []);
            const idx = newAuthors.findIndex(x => x.id === ev.object.id);
            if (idx > -1) {
                newAuthors.splice(idx, 1, ev.object as ProgramPerson)
            }
            return newAuthors;
        });
    }, []);

    const onAuthorDeleted = useCallback(function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        setAuthors(oldAuthors => oldAuthors?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);

    useDataSubscription("ProgramPerson",
        !!props.data ? null : onAuthorUpdated,
        !!props.data ? null : onAuthorDeleted,
        !authors, conference);

    return <div
        className={`program-item${props.clickable ? " clickable" : ""}`}
        onClick={(ev) => {
            if (props.clickable) {
                ev.preventDefault();
                ev.stopPropagation();
                if (singleEvent && singleEvent !== "none" && singleEvent !== "multiple") {
                    history.push(`/event/${singleEvent.id}`);
                }
                else {
                    history.push(`/item/${item.id}`);
                }
            }
        }}
    >
        <div className="abstract">{item.title}</div>
        <AuthorsList authors={authors} />
    </div>;
}
