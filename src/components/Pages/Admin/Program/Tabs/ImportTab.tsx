import assert from "assert";
import React, { useEffect, useState } from "react";
import MultiSelect from "react-multi-select-component";
import { addError } from "../../../../../classes/Notifications/Notifications";
import { CompleteSpecs, EventSpec, FeedSpec, ItemSpec, PersonSpec, SessionSpec, TrackSpec } from "../UploadFormatTypes";
import { parse as parseDate } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import { generatePersonId } from "./AuthorsTab";
import { parseYouTubeURL } from "../../../../../classes/Utils";

function timeFromConfTime(date: string, time: string, timezone: string): Date {
    const localDateTime = parseDate(`${date} ${time}`, "yyyy/MM/dd HH:mm", new Date());
    const utcDateTime = zonedTimeToUtc(localDateTime, timezone);
    return utcDateTime;
}

function removeHTMLEntities(str: string): string {
    return str.replace(/&amp;/g, "&").replace(/&amp;/g, "&");
}

function processResearchrXMLsForRooms(inputs: string[]) {
    const datas = [];
    const parser = new DOMParser();
    for (const input of inputs) {
        const dom = parser.parseFromString(input, "application/xml");
        datas.push(dom);
    }

    const roomNames: Set<string> = new Set();

    for (const data of datas) {
        const dataEvent = data.getElementsByTagName("event")[0];
        for (const dataSubevent of dataEvent.getElementsByTagName("subevent")) {
            const dataSessionRoomEls = dataSubevent.getElementsByTagName("room");
            if (dataSessionRoomEls.length) {
                const sessionRoom = dataSessionRoomEls[0].textContent;
                if (sessionRoom) {
                    roomNames.add(sessionRoom);
                }
            }
        }
    }

    return {
        roomNames
    };
}

function processResearchrXMLsForDefaults(
    inputs: string[],
    roomNamesToInclude: Set<string>
) {
    const datas = [];
    const parser = new DOMParser();
    for (const input of inputs) {
        const dom = parser.parseFromString(input, "application/xml");
        datas.push(dom);
    }

    const trackNames: Set<string> = new Set();

    for (const data of datas) {
        const dataEvent = data.getElementsByTagName("event")[0];
        for (const dataSubevent of dataEvent.getElementsByTagName("subevent")) {
            const dataSessionRoomEls = dataSubevent.getElementsByTagName("room");
            let skipSession = false;
            if (dataSessionRoomEls.length) {
                const sessionRoom = dataSessionRoomEls[0].textContent;
                if (sessionRoom) {
                    if (!roomNamesToInclude.has(sessionRoom)) {
                        skipSession = true;
                    }
                }
            }

            if (!skipSession) {
                const dataSessionTrackEls = dataSubevent.getElementsByTagName("tracks")[0].getElementsByTagName("track");
                for (const trackEl of dataSessionTrackEls) {
                    trackNames.add(trackEl.textContent ?? "<Unknown>");
                }

                const dataTimeslots = dataSubevent.getElementsByTagName("timeslot");
                for (const dataTimeslot of dataTimeslots) {
                    if (dataTimeslot.getElementsByTagName("event_id").length > 0) {
                        const dataTimeslotTrackEls = dataTimeslot.getElementsByTagName("tracks")[0].getElementsByTagName("track");
                        for (const trackEl of dataTimeslotTrackEls) {
                            trackNames.add(trackEl.textContent ?? "<Unknown>");
                        }
                    }
                }
            }
        }
    }

    return {
        trackNames: Array.from(trackNames.values())
    };
}

function processResearchrXMLs(
    inputs: string[],
    trackVideomRoomDefaults: string[],
    trackTextChatDefaults: string[],
    trackExhibitDefaults: string[],
    inputFeedsMap: Map<string, { youtubeID?: string; zoomURL?: string }>,
    roomsToInclude: Set<string>
): CompleteSpecs {
    const datas = [];
    const parser = new DOMParser();
    for (const input of inputs) {
        const dom = parser.parseFromString(input, "application/xml");
        datas.push(dom);
    }

    const outputTracks: { [k: string]: TrackSpec | undefined } = {};
    const outputFeeds: { [k: string]: FeedSpec | undefined } = {};
    const outputItems: { [k: string]: ItemSpec | undefined } = {};
    const outputEvents: { [k: string]: EventSpec | undefined } = {};
    const outputPersons: { [k: string]: PersonSpec | undefined } = {};
    const outputSessions: { [k: string]: SessionSpec | undefined } = {};

    for (const data of datas) {
        const dataEvent = data.getElementsByTagName("event")[0];

        const timezone = dataEvent.getElementsByTagName("timezone_id")[0].textContent;
        assert(timezone);

        for (const dataSubevent of dataEvent.getElementsByTagName("subevent")) {
            const dataSessionTrackEls = dataSubevent
                .getElementsByTagName("tracks")[0]
                .getElementsByTagName("track");
            const sessionTrack = dataSessionTrackEls[0].textContent?.trim();
            assert(sessionTrack);

            const dataSessionTitleEls = dataSubevent.getElementsByTagName("title");
            assert(dataSessionTitleEls.length);
            const sessionTitle = dataSessionTitleEls[0].textContent?.trim();
            assert(sessionTitle);

            const dataSessionSubeventIdEls = dataSubevent.getElementsByTagName("subevent_id");
            assert(dataSessionSubeventIdEls.length);
            const sessionId = dataSessionSubeventIdEls[0].textContent?.trim();
            assert(sessionId);

            let skipSession = false;
            if (!inputFeedsMap[sessionId]) {
                const dataSessionRoomEls = dataSubevent.getElementsByTagName("room");
                if (dataSessionRoomEls.length) {
                    const sessionRoom = dataSessionRoomEls[0].textContent;
                    if (sessionRoom) {
                        if (!roomsToInclude.has(sessionRoom)) {
                            skipSession = true;
                        }
                    }
                }
            }

            if (!skipSession) {
                outputTracks[sessionTrack.toLowerCase()] = {
                    name: sessionTrack,
                    colour: "#ffffff",
                    shortName: sessionTrack
                };

                const session: SessionSpec = {
                    id: sessionId,
                    title: sessionTitle,
                    feed: sessionId,
                    track: sessionTrack.toLowerCase(),
                };

                assert(!outputSessions[sessionId]);
                outputSessions[sessionId] = session;

                const dataTimeslots = dataSubevent.getElementsByTagName("timeslot");
                if (dataTimeslots.length > 0) {
                    for (const dataTimeslot of dataTimeslots) {
                        const eventIdEls = dataTimeslot.getElementsByTagName("event_id");
                        if (eventIdEls.length > 0) {
                            const itemId = eventIdEls[0].textContent?.trim();
                            assert(itemId);

                            const dataEventTrackEls = dataTimeslot
                                .getElementsByTagName("tracks")[0]
                                .getElementsByTagName("track");
                            const itemTrack = dataEventTrackEls[0].textContent?.trim();
                            assert(itemTrack);
                            outputTracks[itemTrack.toLowerCase()] = {
                                name: itemTrack,
                                colour: "#ffffff",
                                shortName: itemTrack
                            };

                            const dataDescriptionEls = dataTimeslot.getElementsByTagName("description");
                            const itemAbstract = dataDescriptionEls[0].textContent?.trim();
                            assert(itemAbstract);

                            const dataTitleEls = dataTimeslot.getElementsByTagName("title");
                            const itemTitle = dataTitleEls[0].textContent?.trim();
                            assert(itemTitle);

                            const dataSlotEls = dataTimeslot.getElementsByTagName("slot_id");
                            const eventId = dataSlotEls[0].textContent?.trim();
                            assert(eventId);

                            const authors = [];
                            let eventChair: string | undefined;
                            const dataPersonsEls = dataTimeslot.getElementsByTagName("persons");
                            if (dataPersonsEls.length > 0) {
                                const dataPersonEls = dataPersonsEls[0].getElementsByTagName("person");
                                for (const personEl of dataPersonEls) {
                                    const role = personEl.getElementsByTagName("role")[0].textContent;
                                    assert(role);
                                    let concatName
                                        = personEl.getElementsByTagName("first_name")[0].textContent
                                        + " "
                                        + personEl.getElementsByTagName("last_name")[0].textContent;
                                    concatName = concatName.trim();
                                    if (role === "Session Chair") {
                                        eventChair = concatName;
                                    }
                                    else if (role === "Author") {
                                        let affiliation = personEl.getElementsByTagName("affiliation")[0].textContent ?? undefined;
                                        if (affiliation === "undefined") {
                                            affiliation = undefined;
                                        }
                                        affiliation = affiliation?.trim();
                                        const personSpec = {
                                            name: concatName,
                                            affiliation
                                        };
                                        const personId = generatePersonId(personSpec);
                                        outputPersons[personId] = personSpec;
                                        authors.push(personId);
                                    }
                                }
                            }

                            const trackDefaultsToVideoRoom = trackVideomRoomDefaults.includes(itemTrack);
                            const trackDefaultsToTextChat = trackTextChatDefaults.includes(itemTrack);
                            if (!outputFeeds[itemId]) {
                                outputFeeds[itemId] = {
                                    id: itemId,
                                    name: `${itemTrack} - ${itemTitle}`,
                                    videoRoom: trackDefaultsToVideoRoom,
                                    textChat: trackDefaultsToTextChat
                                };
                            }

                            if (!outputItems[itemId]) {
                                outputItems[itemId] = {
                                    id: itemId,
                                    abstract: removeHTMLEntities(itemAbstract),
                                    authors,
                                    exhibit: trackExhibitDefaults.includes(itemTrack),
                                    title: itemTitle,
                                    track: itemTrack.toLowerCase(),
                                    feed: itemId
                                };
                            }

                            const startDateStr = dataTimeslot.getElementsByTagName("date")[0].textContent;
                            const endDateStr = dataTimeslot.getElementsByTagName("end_date")[0].textContent;
                            const startTimeStr = dataTimeslot.getElementsByTagName("start_time")[0].textContent;
                            const endTimeStr = dataTimeslot.getElementsByTagName("end_time")[0].textContent;
                            assert(startDateStr);
                            assert(endDateStr);
                            assert(startTimeStr);
                            assert(endTimeStr);

                            assert(!outputEvents[eventId]);
                            outputEvents[eventId] = {
                                id: eventId,
                                item: itemId,
                                session: sessionId,
                                startTime: timeFromConfTime(startDateStr, startTimeStr, timezone),
                                endTime: timeFromConfTime(endDateStr, endTimeStr, timezone),
                                chair: eventChair
                            };
                        }
                        else {
                            let sessionChair: string | undefined;
                            const dataPersonsEls = dataTimeslot.getElementsByTagName("persons");
                            if (dataPersonsEls.length > 0) {
                                const dataPersonEls = dataPersonsEls[0].getElementsByTagName("person");
                                for (const personEl of dataPersonEls) {
                                    const role = personEl.getElementsByTagName("role")[0].textContent;
                                    assert(role);
                                    let concatName
                                        = personEl.getElementsByTagName("first_name")[0].textContent
                                        + " "
                                        + personEl.getElementsByTagName("last_name")[0].textContent;
                                    concatName = concatName.trim();
                                    if (role === "Session Chair") {
                                        sessionChair = concatName;
                                    }
                                }
                            }
                            if (sessionChair) {
                                session.chair = sessionChair;
                            }
                        }
                    }
                }
                else {
                    throw new Error("Encountered a subevent with no timeslot(s)!");
                }
            }
        }
    }

    for (const itemId of inputFeedsMap.keys()) {
        const feed = inputFeedsMap.get(itemId);
        const item = outputItems[itemId];
        const events = Object.values(outputEvents).filter(x => x?.item === itemId);
        assert(feed, `Feed for ${itemId} not found?!`);
        assert(item, `Item for ${itemId} not found?!`);
        assert(events.length, `No events found for streamed item ${itemId}?!`);
        const sessionIds = events.map(x => {
            assert(x);
            return x.session;
        });

        for (const sessionId of sessionIds) {
            const session = outputSessions[sessionId];
            assert(session, `Session for ${sessionId} not found?!`);

            if (outputFeeds[session.id]) {
                const existingOutputFeed = outputFeeds[session.id];
                assert(existingOutputFeed);
                if ("youtube" in existingOutputFeed) {
                    assert(existingOutputFeed.youtube === feed.youtubeID);
                }
                if ("zoomRoom" in existingOutputFeed) {
                    assert(existingOutputFeed.zoomRoom === feed.zoomURL);
                }
            }
            else {
                outputFeeds[session.id] = {
                    id: itemId,
                    name: session.title,
                    videoRoom: false,
                    textChat: false,
                    youtube: feed.youtubeID,
                    zoomRoom: feed.zoomURL
                };
            }
        }
    }

    return {
        tracks: outputTracks,
        feeds: outputFeeds,
        items: outputItems,
        events: outputEvents,
        persons: outputPersons,
        sessions: outputSessions,
        attachmentTypes: {
            "Paper": {
                name: "Paper",
                displayAsLink: true,
                isCoverImage: false,
                ordinal: 1,
                supportsFile: true
            },
            "Poll for Q&A": {
                name: "Poll for Q&A",
                displayAsLink: true,
                isCoverImage: false,
                ordinal: 5,
                supportsFile: false
            },
            "Poster": {
                name: "Poster",
                displayAsLink: false,
                isCoverImage: true,
                ordinal: 4,
                supportsFile: true,
                extra: "Only png and jpg are supported",
                fileTypes: [
                    "image/jpeg",
                    "image/png"
                ]
            },
            "Slides": {
                name: "Slides",
                displayAsLink: true,
                isCoverImage: false,
                ordinal: 2,
                supportsFile: true
            },
            "Video": {
                name: "Video",
                displayAsLink: false,
                isCoverImage: false,
                ordinal: 3,
                supportsFile: false,
                extra: "Links to YouTube or other streaming video services",
                fileTypes: [
                    "video"
                ]
            }
        }
    };
}

interface Props {
    mergeProgramData: (data: CompleteSpecs | null) => void;
}

export default function ImportTab(props: Props) {
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [inputProgramDatas, setInputProgramDatas] = useState<Array<string> | null>(null);
    const [inputFeedDatas, setInputFeedDatas] = useState<Array<any>>([]);

    const [trackNames, setTrackNames] = useState<string[]>([]);
    const [roomNames, setRoomNames] = useState<Set<string>>(new Set());
    const [trackVideomRoomDefaults, setTrackVideoRoomDefaults] = useState<Array<string>>([]);
    const [trackTextChatDefaults, setTrackTextChatDefaults] = useState<Array<string>>([]);
    const [trackExhibitDefaults, setTrackExhibitDefaults] = useState<Array<string>>([]);
    const [roomNamesToInclude, setRoomNamesToInclude] = useState<Set<string>>(new Set());

    const propsMergeProgramData = props.mergeProgramData;

    useEffect(() => {
        try {
            let _roomNames: Set<string> = new Set();
            if (inputProgramDatas) {
                _roomNames = processResearchrXMLsForRooms(inputProgramDatas).roomNames;
            }

            const addedRoomNames = Array.from(_roomNames.values()).filter(x => !roomNames.has(x));
            const deletedRoomNames = Array.from(roomNames.values()).filter(x => !_roomNames.has(x));
            if (addedRoomNames.length > 0 || deletedRoomNames.length > 0) {
                setRoomNames(_roomNames);

                setTrackVideoRoomDefaults([]);
                setTrackTextChatDefaults([]);
                setTrackExhibitDefaults([]);

                const newSelectedRoomNames = new Set(roomNamesToInclude);
                addedRoomNames.forEach(x => newSelectedRoomNames.add(x));
                deletedRoomNames.forEach(x => newSelectedRoomNames.delete(x));
                setRoomNamesToInclude(newSelectedRoomNames);
            }
        }
        catch (e) {
            addError(`Error processing data for room names: ${e}`);
        }
    }, [inputProgramDatas, roomNames, roomNamesToInclude]);

    useEffect(() => {
        try {
            let _trackNames: string[] = [];
            if (inputProgramDatas) {
                _trackNames = processResearchrXMLsForDefaults(inputProgramDatas, roomNamesToInclude)
                    .trackNames
                    .sort((x, y) => x.localeCompare(y));
            }

            const addedTrackNames = _trackNames.filter(x => !trackNames.includes(x));
            const deletedTrackNames = trackNames.filter(x => !_trackNames.includes(x));

            if (addedTrackNames.length > 0 || deletedTrackNames.length > 0) {
                setTrackNames(_trackNames);
            }

            if (addedTrackNames.length > 0) {
                setTrackVideoRoomDefaults(oldDefaults =>
                    oldDefaults
                        .filter(x => _trackNames.includes(x))
                        .concat(addedTrackNames));
                setTrackTextChatDefaults(oldDefaults =>
                    oldDefaults
                        .filter(x => _trackNames.includes(x))
                        .concat(addedTrackNames));
                setTrackExhibitDefaults(oldDefaults =>
                    oldDefaults
                        .filter(x => _trackNames.includes(x)));
            }
        }
        catch (e) {
            addError(`Error processing data for defaults: ${e}`);
        }
    }, [inputProgramDatas, roomNamesToInclude, trackNames]);

    useEffect(() => {
        setTrackTextChatDefaults(oldDefaults => Array.from(new Set(oldDefaults.concat(trackVideomRoomDefaults)).values()));
    }, [trackVideomRoomDefaults]);

    return (
        <>
            <p>TODO</p>
            <p>Importing a complete program is optional</p>
            <p>Each step also has an importer for CSV files that you can use to import each part of your program separately.</p>
            <ol>
                <li>Select which kind of import (e.g. Researchr)</li>
                <li>Show the importer for that kind</li>
            </ol>
            <hr />
            <h2>Import from Researchr</h2>
            <div>
                <div>
                    <label htmlFor="newUploadDataFile">Select Researchr Program XML file</label><br />
                    <input id="newUploadDataFile" type="file" accept="application/xml"
                        disabled={isProcessing}
                        onChange={async (ev) => {
                            setIsProcessing(true);
                            const results: Array<string> = [];
                            if (ev.target.files) {
                                for (const file of ev.target.files) {
                                    try {
                                        const fileContents = await file.text();
                                        results.push(fileContents);
                                    }
                                    catch (e) {
                                        addError(`File "${file.name}" contains invalid data. ${e}`);
                                    }
                                }
                            }
                            try {
                                setInputProgramDatas(results);
                            }
                            catch (e) {
                                addError(`Error processing data ${e}.`);
                            }
                            setIsProcessing(false);
                        }} />
                </div>
                <br />
                <div>
                    <label htmlFor="newUploadFeedsFile">Select feeds JSON file</label><br />
                    <input id="newUploadFeedsFile" type="file" accept="application/json"
                        disabled={isProcessing}
                        onChange={async (ev) => {
                            setIsProcessing(true);
                            const results: Array<any> = [];
                            if (ev.target.files) {
                                for (const file of ev.target.files) {
                                    try {
                                        const fileContents = await file.text();
                                        results.push(JSON.parse(fileContents));
                                    }
                                    catch (e) {
                                        addError(`File "${file.name}" contains invalid data. ${e}`);
                                    }
                                }
                            }
                            try {
                                setInputFeedDatas(results);
                            }
                            catch (e) {
                                addError(`Error processing data ${e}.`);
                            }
                            setIsProcessing(false);
                        }} />
                </div>
                <br />
                <label id="rooms_to_include_label">Researchr rooms to include: Select "rooms" whose events should be included in the upload:</label>
                <MultiSelect
                    className="rooms_to_include-control__multiselect"
                    labelledBy="rooms_to_include_label"
                    options={Array.from(roomNames.values())
                        .sort((x, y) => x.localeCompare(y))
                        .map(x => ({
                            value: x,
                            label: x
                        }))}
                    value={Array.from(roomNamesToInclude.values())
                        .sort((x, y) => x.localeCompare(y))
                        .map(x => ({ value: x, label: x }))}
                    onChange={(vals: { label: string; value: string }[]) => {
                        setRoomNamesToInclude(
                            new Set(vals.map(x => x.value))
                        );
                    }}
                />
                <br />
                <label id="track_video_defaults_label">Track defaults: Select tracks whose events should have video rooms by default:</label>
                <MultiSelect
                    className="track-video-room-defaults-control__multiselect"
                    labelledBy="track_video_defaults_label"
                    options={trackNames
                        .map(x => ({
                            value: x,
                            label: x
                        }))}
                    value={trackVideomRoomDefaults
                        .sort((x, y) => x.localeCompare(y))
                        .map(x => ({ value: x, label: x }))}
                    onChange={(vals: { label: string; value: string }[]) => {
                        setTrackVideoRoomDefaults(vals.map(x => x.value))
                    }}
                />
                <br />
                <label id="track_text_defaults_label">Track defaults: Select tracks whose events should have text chats by default:</label>
                <MultiSelect
                    className="track-text-chat-defaults-control__multiselect"
                    labelledBy="track_text_defaults_label"
                    options={trackNames.map(x => ({
                        value: x,
                        label: x
                    }))}
                    value={trackTextChatDefaults
                        .sort((x, y) => x.localeCompare(y))
                        .map(x => ({ value: x, label: x }))}
                    onChange={(vals: { label: string; value: string }[]) => {
                        setTrackTextChatDefaults(
                            Array.from(new Set(vals.map(x => x.value).concat(trackVideomRoomDefaults)))
                        )
                    }}
                />
                <br />
                <label id="track_exhibit_defaults_label">Track defaults: Select tracks whose events should be exhibited by default:</label>
                <MultiSelect
                    className="track-exhibit-defaults-control__multiselect"
                    labelledBy="track_exhibit_defaults_label"
                    options={trackNames.map(x => ({
                        value: x,
                        label: x
                    }))}
                    value={trackExhibitDefaults
                        .sort((x, y) => x.localeCompare(y))
                        .map(x => ({ value: x, label: x }))}
                    onChange={(vals: { label: string; value: string }[]) => {
                        setTrackExhibitDefaults(
                            Array.from(new Set(vals.map(x => x.value)))
                        )
                    }}
                />
            </div>
            <br />
            <button
                onClick={(ev) => {
                    try {
                        if (inputProgramDatas && inputFeedDatas) {
                            const sessionFeeds = new Map<string, { youtubeURL?: string; zoomURL?: string }>();
                            for (const feedGroup of inputFeedDatas) {
                                assert(feedGroup instanceof Array);
                                for (const feed of feedGroup) {
                                    assert(feed.id);
                                    assert(feed.youtubeURL || feed.zoomURL);

                                    feed.youtubeID = parseYouTubeURL(feed.youtubeURL);
                                    assert(feed.youtubeID, "Unable to parse YouTube URL.");
                                    delete feed.youtubeURL;

                                    sessionFeeds.set(feed.id, feed);
                                }
                            }
                            const data = processResearchrXMLs(
                                inputProgramDatas,
                                trackVideomRoomDefaults,
                                trackTextChatDefaults,
                                trackExhibitDefaults,
                                sessionFeeds,
                                roomNamesToInclude);
                            propsMergeProgramData(data);
                        }
                    }
                    catch (e) {
                        addError(`Error processing data: ${e}`);
                    }
                }}
            >
                Import
            </button>
        </>
    );
}
