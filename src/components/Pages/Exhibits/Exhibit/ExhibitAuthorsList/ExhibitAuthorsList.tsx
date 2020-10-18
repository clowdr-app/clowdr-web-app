import { ProgramItem, ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import useConference from "../../../../../hooks/useConference";
import useDataSubscription from "../../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../../hooks/useSafeAsync";
import AuthorsList from "../../../Program/AuthorsList";
import "./ExhibitAuthorsList.scss";

interface ExhibitAuthorsListProps {
    item: ProgramItem;
}

export default function ExhibitAuthorsList(props: ExhibitAuthorsListProps) {
    const conference = useConference();
    const item = props.item;
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(null);

    useSafeAsync(async () => item ? await item.authorPerons : null, setAuthors, [item]);

    const onAuthorUpdated = useCallback(function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        const newAuthors = Array.from(authors ?? []);
        let updated = false;
        for (const object of ev.objects) {
            const idx = newAuthors.findIndex(x => x.id === object.id);
            if (idx > -1) {
                newAuthors.splice(idx, 1, object as ProgramPerson);
                updated = true;
            }
        }
        if (updated) {
            setAuthors(newAuthors);
        }
    }, [authors]);

    const onAuthorDeleted = useCallback(function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        if (authors) {
            setAuthors(authors.filter(x => x.id !== ev.objectId));
        }
    }, [authors]);

    useDataSubscription("ProgramPerson", onAuthorUpdated, onAuthorDeleted, !authors, conference);

    return <AuthorsList authors={authors} idOrdering={item.authors} />;
}
