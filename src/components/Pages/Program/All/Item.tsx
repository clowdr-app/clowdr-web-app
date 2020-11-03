import { ProgramSessionEvent } from "@clowdr-app/clowdr-db-schema";
import React from "react";
import { useHistory } from "react-router-dom";
import AuthorsList from "../AuthorsList";
import { SortedItemData } from "../WholeProgramData";

interface Props {
    item: SortedItemData;
    clickable?: boolean;
}

export default function Item(props: Props) {
    const item = props.item;
    const history = useHistory();

    let singleEvent: ProgramSessionEvent | "none" | "multiple";
    const events = props.item.eventsForItem;
    if (events.length === 1) {
        singleEvent = events[0];
    }
    else if (events.length === 0) {
        singleEvent = "none";
    }
    else {
        singleEvent = "multiple";
    }

    return <div
        className={`program-item${props.clickable ? " clickable" : ""}`}
        onClick={(ev) => {
            if (props.clickable) {
                ev.preventDefault();
                ev.stopPropagation();
                if (singleEvent !== "none" && singleEvent !== "multiple") {
                    history.push(`/event/${singleEvent.id}`);
                }
                else {
                    history.push(`/item/${item.item.id}`);
                }
            }
        }}
    >
        <div className="title">{item.item.title}</div>
        <AuthorsList authors={item.authors} idOrdering={item.item.authors} />
    </div>;
}
