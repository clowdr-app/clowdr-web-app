import { ProgramItem, ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { useHistory } from "react-router-dom";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import AuthorsList from "../AuthorsList";

interface Props {
    item: ProgramItem;
    clickable?: boolean;
}

export default function Item(props: Props) {
    const item = props.item;
    const conference = useConference();
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(null);
    const history = useHistory();

    useSafeAsync(async () => item ? await item.authors : null, setAuthors, [item]);

    const onAuthorUpdated = useCallback(function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        const newAuthors = Array.from(authors ?? []);
        const idx = newAuthors.findIndex(x => x.id === ev.object.id);
        if (idx > -1) {
            newAuthors.splice(idx, 1, ev.object as ProgramPerson)
            setAuthors(newAuthors);
        }
    }, [authors]);

    const onAuthorDeleted = useCallback(function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        if (authors) {
            setAuthors(authors.filter(x => x.id !== ev.objectId));
        }
    }, [authors]);

    useDataSubscription("ProgramPerson", onAuthorUpdated, onAuthorDeleted, !authors, conference);

    return <div
        className={`program-item${props.clickable ? " clickable" : ""}`}
        onClick={(ev) => {
            if (props.clickable) {
                ev.preventDefault();
                ev.stopPropagation();
                history.push(`/item/${item.id}`);
            }
        }}
    >
        <div className="abstract">{item.title}</div>
        <AuthorsList authors={authors} />
    </div>;
}
