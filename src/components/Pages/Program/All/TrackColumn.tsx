import React from "react";
import { Link } from "react-router-dom";
import { SortedTrackData } from "../WholeProgramData";
import Item from "./Item";
import SessionGroup from "./SessionGroup";
import TrackMarker from "./TrackMarker";

interface Props {
    track: SortedTrackData;
}

export default function TrackColumn(props: Props) {
    const rows: Array<JSX.Element> = [];
    for (const session of props.track.sessionsOfTrack) {
        rows.push(<SessionGroup key={session.session.id} session={session} />);
    }

    if (props.track.itemsOfTrack.length > 0) {
        rows.push(<hr key="unscheduled-divider" />);
        const _rows: Array<JSX.Element> = [];
        for (const item of props.track.itemsOfTrack.sort((x, y) => x.item.title.localeCompare(y.item.title))) {
            _rows.push(<Item key={item.item.id} item={item} clickable={true} />);
        }
        rows.push(<div key="unscheduled-items" className="session">
            <h2 className="title">Unscheduled items</h2>
            <div className="content">
                {_rows}
            </div>
        </div>);
    }
    else {
        for (const item of props.track.itemsOfTrack.sort((x, y) => x.item.title.localeCompare(y.item.title))) {
            rows.push(<Item key={item.item.id} item={item} clickable={true} />);
        }
    }

    if (rows.length === 0) {
        rows.push(<div key="empty" className="session"><h2 className="title">This track contains no sessions.</h2></div>);
    }

    return <div className="track">
        <h2 className="title">
            <TrackMarker track={props.track.track} small={true} />
            <Link to={`/track/${props.track.track.id}`}>{props.track.track.name}</Link>
        </h2>
        <div className="content">
            {rows}
        </div>
    </div>;
}
