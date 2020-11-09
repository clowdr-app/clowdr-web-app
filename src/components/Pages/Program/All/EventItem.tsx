import React from "react";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { Link, useHistory } from "react-router-dom";
import Item from "./Item";
import { SortedEventData } from "../WholeProgramData";

interface Props {
    event: SortedEventData;
    hideEventTime?: boolean;
    height?: number;
    eventsLinkToSession?: boolean;
}

export default function EventItem(props: Props) {
    const event = props.event.event;
    const item = props.event.item;
    const history = useHistory();

    function fmtTime(date: Date) {
        return date.toLocaleTimeString(undefined, {
            hour12: false,
            hour: "numeric",
            minute: "numeric"
        });
    }

    function fmtDay(date: Date) {
        return date.toLocaleDateString(undefined, {
            weekday: "short"
        });
    }

    const now = new Date();
    const isNow = event.startTime < now && event.endTime > now;

    return <div
        className={`event${isNow ? " now" : ""}`}
        style={{ height: props.height }}
        tabIndex={0}
        onKeyPress={(ev) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                ev.stopPropagation();
                if (props.eventsLinkToSession) {
                    history.push(`/session/${event.sessionId}`);
                }
                else {
                    history.push(`/event/${event.id}`);
                }
            }
        }}
        onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (props.eventsLinkToSession) {
                history.push(`/session/${event.sessionId}`);
            }
            else {
                history.push(`/event/${event.id}`);
            }
        }}
    >
        <div className="heading">
            {!props.hideEventTime
                ? <h2 className="title">
                    {fmtDay(event.startTime)} &middot; {fmtTime(event.startTime)} - {fmtTime(event.endTime)}
                </h2>
                : <></>
            }
            {props.event.session ? <Link
                className="session-info"
                to={`/session/${props.event.session.id}`}
                onClick={(ev) => {
                    ev.stopPropagation();
                }}
                onKeyPress={(ev) => {
                    if (ev.key === "Enter") {
                        ev.stopPropagation();
                    }
                }}
            >
                {props.event.session.title}
            </Link> : <></>}
            {props.event.track ? <Link
                className="track-info"
                to={`/track/${props.event.track.id}`}
                onClick={(ev) => {
                    ev.stopPropagation();
                }}
                onKeyPress={(ev) => {
                    if (ev.key === "Enter") {
                        ev.stopPropagation();
                    }
                }}
            >
                {props.event.track.name}
            </Link> : <></>}
        </div>
        {item ? <Item item={item} /> : <LoadingSpinner />}
    </div>;
}
