import { ProgramItem, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import assert from "assert";
import React, { useCallback, useMemo, useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import Exhibit from "./Exhibit/Exhibit";
import "./Exhibits.scss";
import 'react-tabs/style/react-tabs.css';
import invert from "invert-color";

type TrackInfo = {
    track: ProgramTrack;
    items: ProgramItem[];
};

export default function Exhibits() {
    const conference = useConference();
    const [programItems, setProgramItems] = useState<Map<string, TrackInfo> | undefined>();

    useHeading("Exhibition");

    // Fetch initial ProgramItems
    useSafeAsync(
        async () => {
            const tracksMap = (await ProgramItem.getAll(conference.id))
                .filter(programItem => programItem.exhibit)
                .sort((x, y) => x.title.localeCompare(y.title))
                .reduce((acc, x) => {
                    let arr = acc.get(x.trackId);
                    if (!arr) {
                        acc.set(x.trackId, arr = []);
                    }
                    arr.push(x);
                    return acc;
                }, new Map<string, ProgramItem[]>());
            const trackInfosMap = new Map<string, TrackInfo>();
            for (const key of tracksMap.keys()) {
                const items = tracksMap.get(key);
                assert(items);
                const track = await ProgramTrack.get(key, conference.id);
                if (track) {
                    trackInfosMap.set(key, {
                        track,
                        items
                    });
                }
            }
            return trackInfosMap;
        },
        setProgramItems, [conference.id], "Exhibits:setProgramItems");

    // Subscribe to ProgramItem updates
    const onProgramItemUpdated = useCallback(function _onProgramItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        setProgramItems(oldProgramItems => {
            const newProgramItems = new Map(oldProgramItems ?? []);
            for (const object of (ev.objects as ProgramItem[])) {
                const existingArr = newProgramItems.get(object.trackId)?.items;
                const idx = existingArr?.findIndex(x => x.id === object.id);
                if (existingArr && idx) {
                    if (idx === -1 && object.exhibit) {
                        existingArr.push(object);
                    } else {
                        if (object.exhibit) {
                            existingArr.splice(idx, 1, object);
                        } else {
                            existingArr.splice(idx, 1);
                        }
                    }
                }
                else if (object.exhibit) {
                    // newProgramItems.set(object.trackId, {
                    //     track: // TODO: Find a way to fetch this
                    //     items: [object]
                    // });
                }
            }
            return newProgramItems;
        });
    }, []);

    const onProgramItemDeleted = useCallback(function _onProgramItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setProgramItems(oldProgramItems => {
            const newProgramItems = new Map(oldProgramItems ?? []);
            for (const key of newProgramItems.keys()) {
                const arr = newProgramItems.get(key);
                assert(arr);
                newProgramItems.set(key, {
                    track: arr.track,
                    items: arr.items.filter(item => item.id !== ev.objectId)
                });
            }
            return newProgramItems;
        });
    }, []);

    useDataSubscription("ProgramItem", onProgramItemUpdated, onProgramItemDeleted, !programItems, conference);

    const tabsEl = useMemo(() => {
        const _trackInfos = programItems?.values();
        if (_trackInfos) {
            const trackInfos = Array.from(_trackInfos).filter(x => x.items.length > 0);

            const tabs = trackInfos.map(info => {
                return (
                    <Tab
                        key={`tab-${info.track.name}`}
                    >
                        {info.track.name}
                    </Tab>
                );
            });

            const panels = trackInfos.map(info => {
                return (
                    <TabPanel key={`panel-${info.track.name}`}>
                        <div className="exhibits">
                            {info.items.map(programItem =>
                                <div className="exhibits__exhibit" key={programItem.id}>
                                    <Exhibit track={info.track} programItem={programItem} />
                                </div>
                            )}
                        </div>
                    </TabPanel>
                );
            });

            return (
                <Tabs>
                    <TabList>
                        {tabs}
                    </TabList>
                    {panels}
                </Tabs>
            );
        }
        return undefined;
    }, [programItems]);

    return <section aria-labelledby="page-title" className="exhibits-page">
        {tabsEl ? tabsEl : <LoadingSpinner message="Loading exhibits" />}
    </section>
}
