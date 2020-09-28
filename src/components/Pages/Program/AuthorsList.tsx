import { ProgramPerson } from "clowdr-db-schema/src/classes/DataLayer";
import React from "react";
import { Link } from "react-router-dom";

interface Props {
    authors: Array<ProgramPerson> | null
}

export default function AuthorsList(props: Props) {
    let authorsEls: Array<JSX.Element> = [];
    if (props.authors) {
        authorsEls = props.authors.map(author => {
            return <Link key={author.id} to={`/author/${author.id}`}>{author.name}</Link>;
        });
        authorsEls = authorsEls.flatMap((el, i) => [el, <span key={i}>&middot;</span>]);
        authorsEls = authorsEls.slice(0, authorsEls.length - 1);
    }
    return <p className="authors">
        {authorsEls}
    </p>;
}
