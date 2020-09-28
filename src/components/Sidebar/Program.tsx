import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProgramSession, ProgramSessionEvent } from "clowdr-db-schema/src/classes/DataLayer";
import { makeCancelable } from "clowdr-db-schema/src/classes/Util";
import useConference from "../../hooks/useConference";
import useLogger from "../../hooks/useLogger";
import useDataSubscription from "../../hooks/useDataSubscription";

interface Props {
    sessions: Array<ProgramSession>;
    events: Array<ProgramSessionEvent>;
    /**
     * Time boundaries to group items into, in minutes.
     *
     * Groups are automatically created for items before and after the
     * boundaries specified, to include up to a distance of 10 years.
     */
    timeBoundaries: Array<number>;
}

function arrangeBoundaries(timeBoundaries: Array<number>)
    : [Array<{ start: number, end: number, isLast: boolean }>, number] {
    const now = Date.now();
    const boundaries = timeBoundaries
        .sort((x, y) => x < y ? -1 : x === y ? 0 : 1) // Order them
        .reduce((acc, x) =>
            acc.length === 0
                ? [x]
                : acc[acc.length - 1] !== x
                    ? [...acc, x]
                    : acc
            , [] as number[]) // Remove gaps of zero
        .map(x => x * 60 * 1000); // Convert to milliseconds
    const boundaryPairs: Array<{ start: number, end: number, isLast: boolean }> = [];
    const insaneLengthOfTime = 1000 * 60 * 60 * 24 * 365 * 10; // Ten years in ms
    if (boundaries.length > 0) {
        const boundaryStart = now - insaneLengthOfTime;
        const boundaryEnd = now + boundaries[0];
        boundaryPairs.push({
            start: boundaryStart,
            end: boundaryEnd,
            isLast: boundaries.length === 1
        });
    }
    for (let i = 0; i < boundaries.length; i++) {
        const boundaryStart = now + boundaries[i];
        let boundaryEnd;
        if (i + 1 < boundaries.length) {
            boundaryEnd = now + boundaries[i + 1];
        }
        else {
            boundaryEnd = now + insaneLengthOfTime;
        }

        boundaryPairs.push({
            start: boundaryStart,
            end: boundaryEnd,
            isLast: i === boundaries.length - 1
        });
    }
    return [boundaryPairs, now];
}

interface ItemRenderData {
    title: string;
    track: {
        id: string;
        name: string;
    };
    isWatched: boolean;
    additionalClasses: string;
    url: string;
    sortValue: number;

    item: {
        type: "event";
        data: ProgramSessionEvent;
    } | {
        type: "session";
        data: ProgramSession;
    };
}

interface GroupRenderData {
    timeText: string;
    items: Array<ItemRenderData>;
}

interface RenderData {
    groups: Array<GroupRenderData>;
}

export default function Program(props: Props) {
    const conf = useConference();
    const [renderData, setRenderData] = useState<RenderData>({ groups: [] });
    const logger = useLogger("Sidebar/Program");
    const [refreshRequired, setRefreshRequired] = useState(true);
    /* For debugging */
    logger.disable();

    // Compute render data
    useEffect(() => {
        async function buildRenderData(): Promise<RenderData> {
            if (refreshRequired) {
                setRefreshRequired(false);
            }

            const groupedItems: {
                [timeBoundary: number]: {
                    startTime: Date,
                    endTime: Date,
                    sessions: Array<ProgramSession>,
                    events: Array<ProgramSessionEvent>,
                    isLast: boolean
                }
            } = {};
            const [boundaries, now] = arrangeBoundaries(props.timeBoundaries);
            // Initialise empty groups
            for (const boundary of boundaries) {
                groupedItems[boundary.start] = {
                    startTime: new Date(boundary.start),
                    endTime: new Date(boundary.end),
                    sessions: [],
                    events: [],
                    isLast: boundary.isLast
                };
            }

            // Place sessions into groups
            for (const session of props.sessions) {
                for (const boundary of boundaries) {
                    if (boundary.end <= now) {
                        if (session.endTime.getTime() <= boundary.end) {
                            groupedItems[boundary.start].sessions.push(session);
                            break;
                        }
                    }
                    else {
                        if (session.startTime.getTime() <= boundary.end) {
                            groupedItems[boundary.start].sessions.push(session);
                            break;
                        }
                    }
                }
            }

            // Place events into groups
            for (const event of props.events) {
                for (const boundary of boundaries) {
                    if (boundary.end <= now) {
                        if (event.endTime.getTime() <= boundary.end) {
                            groupedItems[boundary.start].events.push(event);
                            break;
                        }
                    }
                    else {
                        if (event.startTime.getTime() <= boundary.end) {
                            groupedItems[boundary.start].events.push(event);
                            break;
                        }
                    }
                }
            }

            // Filter out empty groups
            for (const groupKey in groupedItems) {
                if (groupKey in groupedItems) {
                    const group = groupedItems[groupKey];
                    if (group.events.length === 0 && group.sessions.length === 0) {
                        delete groupedItems[groupKey];
                        logger.info(`Deleting empty group: ${groupKey}`);
                    }
                }
            }

            // Build render data
            const newRenderData: RenderData = {
                groups: []
            };
            for (const groupKey in groupedItems) {
                if (groupKey in groupedItems) {
                    const group = groupedItems[groupKey];
                    let timeText: string;
                    if (group.endTime.getTime() <= now) {
                        timeText = "Past";
                    }
                    else if (group.startTime.getTime() <= now) {
                        timeText = "Happening now";
                    }
                    else {
                        let distance = group.startTime.getTime() - now;
                        let units = "minutes";
                        distance = Math.floor(distance / (1000 * 60)); // Convert to minutes
                        if (distance >= 60) {
                            distance = Math.floor(distance / 60);
                            units = "hour" + (distance > 1 ? "s" : "");
                        }
                        timeText = `${group.isLast ? "Beyond" : "In"} ${distance} ${units}`;
                    }

                    logger.info(timeText, group);
                    let items: Array<ItemRenderData>;
                    items = await Promise.all(group.sessions.map(async session => {
                        const track = await session.track;
                        const result: ItemRenderData = {
                            title: session.title,
                            url: `/session/${session.id}`,
                            track: { id: track.id, name: track.shortName },
                            isWatched: false,
                            item: { type: "session", data: session },
                            sortValue: session.startTime.getTime(),
                            additionalClasses: "session"
                        };
                        return result;
                    }));
                    items = items.concat(await Promise.all(group.events.map(async event => {
                        const track = await event.track;
                        const result: ItemRenderData = {
                            title: (await event.item).title,
                            url: `/event/${event.id}`,
                            track: { id: track.id, name: track.shortName },
                            isWatched: false,
                            item: { type: "event", data: event },
                            sortValue: event.startTime.getTime(),
                            additionalClasses: "event"
                        };
                        return result;
                    })));

                    const groupRenderData: GroupRenderData = {
                        timeText,
                        items: items.sort((x, y) => x.sortValue < y.sortValue ? -1 : x.sortValue > y.sortValue ? 1 : 0)
                    };
                    newRenderData.groups.push(groupRenderData);
                }
            }

            logger.info("Props.events (inner)", props.events);
            logger.info("Render data (inner)", newRenderData);

            return newRenderData;
        }

        let cancel: () => void = () => { };
        async function doBuildRenderData() {
            try {
                const p = makeCancelable(buildRenderData());
                cancel = p.cancel;
                const d = await p.promise;
                setRenderData(d);
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
            finally {
                cancel = () => { };
            }
        }

        doBuildRenderData();

        return cancel;
    }, [logger, props.events, props.sessions, props.timeBoundaries, refreshRequired]);


    // Subscribe to data events

    const onDataUpdated = useCallback(function _onDataUpdated() {
        setRefreshRequired(true);
    }, []);

    useDataSubscription(
        "ProgramTrack",
        onDataUpdated,
        () => { },
        false,
        conf);

    useDataSubscription(
        "ProgramItem",
        onDataUpdated,
        () => { },
        false,
        conf);

    logger.info("Props.events", props.events);
    logger.info("Render data", renderData);

    const groupElems: Array<JSX.Element> = [];

    for (const group of renderData.groups) {
        const itemElems: Array<JSX.Element> = [];
        for (const item of group.items) {
            // TODO: Insert the "watch star" button
            // TODO: Enable the watch/unwatch
            itemElems.push(
                <li key={item.item.data.id} className={item.additionalClasses + (item.isWatched ? " watched" : "")}>
                    <Link to={item.url}>
                        <h3>{item.title}</h3>
                    </Link>
                    <Link className="track" to={`/track/${item.track.id}`}>{item.track.name}</Link>
                </li>);
        }

        const groupElem = <div className="group">
            <div className="time">{group.timeText}</div>
            <ul className="items">
                {itemElems}
            </ul>
        </div>;

        groupElems.push(groupElem);
    }

    return <div className="program">
        {groupElems.reduce((acc, x) => <>{acc}{x}</>, <></>)}
    </div>;
}
