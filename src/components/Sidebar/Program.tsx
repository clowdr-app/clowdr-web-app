import React from "react";
import { ProgramSession, ProgramSessionEvent } from "../../classes/DataLayer";

interface Props {
    sessions: Array<ProgramSession>;
    events: Array<ProgramSessionEvent>;
    /**
     * Time boundaries to group items into, in minutes.
     */
    timeBoundaries: Array<number>;
}

export default function Program(props: Props) {
    let groupedItems: {
        [timeBoundary: number]: {
            sessions: Array<ProgramSession>,
            events: Array<ProgramSessionEvent>
        }
    } = {};

    let now = Date.now();
    for (let item of props.sessions) {
        
    }
    for (let item of props.events) {

    }

    return <></>;
}
