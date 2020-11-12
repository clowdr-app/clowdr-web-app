import { ProgramPerson } from "@clowdr-app/clowdr-db-schema";
import React from "react";
import { Link } from "react-router-dom";
import "./AuthorsList.scss";

interface Props {
    authors: Array<ProgramPerson> | null;
    idOrdering: Array<string>;
    hideAffiliations?: boolean;
}

export default function AuthorsList(props: Props) {
    let authorsEls: Array<JSX.Element> = [];
    if (props.authors) {
        authorsEls = props.authors
            .sort((x, y) => {
                const xIdx = props.idOrdering.indexOf(x.id);
                const yIdx = props.idOrdering.indexOf(y.id);
                return xIdx < yIdx ? -1 : xIdx > yIdx ? 1 : 0;
            })
            .map(author => {
                return (
                    <Link key={author.id} to={`/author/${author.id}`} onClick={ev => ev.stopPropagation()}>
                        {author.name} {!props.hideAffiliations && author.affiliation ? `(${author.affiliation})` : ""}
                    </Link>
                );
            });
        authorsEls = authorsEls.flatMap((el, i) => [el, <span key={i}>&middot;</span>]);
        authorsEls = authorsEls.slice(0, authorsEls.length - 1);
    }
    return <p className="authors">{authorsEls}</p>;
}
