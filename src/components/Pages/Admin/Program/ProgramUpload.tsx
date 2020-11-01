import Parse from "parse";
import React, { useEffect, useState } from "react";
import { Redirect } from "react-router-dom";
import useHeading from "../../../../hooks/useHeading";
import useUserRoles from "../../../../hooks/useUserRoles";
import "./ProgramUpload.scss";
import useConference from "../../../../hooks/useConference";
import "react-mde/lib/styles/css/react-mde-all.css";
import { addError, addNotification } from "../../../../classes/Notifications/Notifications";
import AsyncButton from "../../../AsyncButton/AsyncButton";
import assert from "assert";
import { parse as parseDate } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';
import MultiSelect from "react-multi-select-component";
import { removeUndefined } from "@clowdr-app/clowdr-db-schema/build/Util";

function timeFromConfTime(date: string, time: string, timezone: string): Date {
    const localDateTime = parseDate(`${date} ${time}`, "yyyy/MM/dd HH:mm", new Date());
    const utcDateTime = zonedTimeToUtc(localDateTime, timezone);
    return utcDateTime;
}

function removeHTMLEntities(str: string): string {
    return str.replace(/&amp;/g, "&").replace(/&amp;/g, "&");
}


type TrackSpec = {
    shortName?: string,
    name: string,
    colour: string,
    textChat?: boolean,
};

type FeedSpec = {
    id: string,
    name: string
} & ({
    videoRoom: boolean,
    textChat?: boolean
} | {
    textChat: boolean
} | {
    zoomRoom: string
} | {
    youtube: string
});

type SessionSpec = {
    id: string,
    title: string,
    chair?: string,
    feed: string,
    track: string,
};

type ItemSpec = {
    id: string,
    abstract: string,
    exhibit: boolean,
    title: string,
    authors: string[],
    track: string,
    feed?: string,
};

type PersonSpec = {
    name: string,
    affiliation?: string
};

type EventSpec = {
    id: string,
    directLink?: string,
    chair?: string;
    endTime: Date,
    startTime: Date,
    item: string,
    session: string,
    feed?: string,
};

type AttachmentSpec = {
    url: string,
    attachmentType: string,
    programItem: string,
};

type AttachmentTypeSpec = {
    name: string;
    displayAsLink: boolean;
    isCoverImage: boolean;
    ordinal: number;
    supportsFile: boolean;
    extra?: string;
    fileTypes?: string[];
};

type CompleteSpecs = {
    tracks: { [k: string]: TrackSpec | undefined };
    feeds: { [k: string]: FeedSpec | undefined };
    items: { [k: string]: ItemSpec | undefined };
    events: { [k: string]: EventSpec | undefined };
    persons: { [k: string]: PersonSpec | undefined };
    sessions: { [k: string]: SessionSpec | undefined };
    attachmentTypes: { [k: string]: AttachmentTypeSpec | undefined };
};

function processResearchrXMLsForDefaults(inputs: string[]) {
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
    return {
        trackNames: Array.from(trackNames.values())
    };
}

// TODO: Input track-event default configs for text chats/video rooms
function processResearchrXMLs(
    inputs: string[],
    trackVideomRoomDefaults: string[],
    trackTextChatDefaults: string[],
    trackExhibitDefaults: string[],
    sessionFeeds: Map<string, { youtubeURL?: string; zoomURL?: string }>
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
            const sessionTrack = dataSessionTrackEls[0].textContent;
            assert(sessionTrack);

            const dataSessionTitleEls = dataSubevent.getElementsByTagName("title");
            assert(dataSessionTitleEls.length);
            const sessionTitle = dataSessionTitleEls[0].textContent;
            assert(sessionTitle);

            const dataSessionSubeventIdEls = dataSubevent.getElementsByTagName("subevent_id");
            assert(dataSessionSubeventIdEls.length);
            const sessionId = dataSessionSubeventIdEls[0].textContent;
            assert(sessionId);

            outputTracks[sessionTrack] = {
                name: sessionTrack,
                colour: "rgba(0,0,0,0)",
                shortName: sessionTrack
            };

            const session: SessionSpec = {
                id: sessionId,
                title: sessionTitle,
                feed: sessionId,
                track: sessionTrack,
            };

            assert(!outputSessions[sessionId]);
            outputSessions[sessionId] = session;

            const dataTimeslots = dataSubevent.getElementsByTagName("timeslot");
            if (dataTimeslots.length > 0) {
                for (const dataTimeslot of dataTimeslots) {
                    const eventIdEls = dataTimeslot.getElementsByTagName("event_id");
                    if (eventIdEls.length > 0) {
                        const itemId = eventIdEls[0].textContent;
                        assert(itemId);

                        const dataEventTrackEls = dataTimeslot
                            .getElementsByTagName("tracks")[0]
                            .getElementsByTagName("track");
                        const itemTrack = dataEventTrackEls[0].textContent;
                        assert(itemTrack);
                        outputTracks[itemTrack] = {
                            name: itemTrack,
                            colour: "rgba(0,0,0,0)",
                            shortName: itemTrack
                        };

                        const dataDescriptionEls = dataTimeslot.getElementsByTagName("description");
                        const itemAbstract = dataDescriptionEls[0].textContent;
                        assert(itemAbstract);

                        const dataTitleEls = dataTimeslot.getElementsByTagName("title");
                        const itemTitle = dataTitleEls[0].textContent;
                        assert(itemTitle);

                        const dataSlotEls = dataTimeslot.getElementsByTagName("slot_id");
                        const eventId = dataSlotEls[0].textContent;
                        assert(eventId);

                        const authors = [];
                        let chair: string | undefined;
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
                                    chair = concatName;
                                }
                                else if (role === "Author") {
                                    outputPersons[concatName] = {
                                        name: concatName,
                                        affiliation: personEl.getElementsByTagName("affiliation")[0].textContent ?? undefined
                                    };
                                    authors.push(concatName);
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
                                track: itemTrack,
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
                            chair
                        };
                    }
                }
            }
            else {
                throw new Error("Encountered a subevent with no timeslot(s)!");
            }
        }
    }

    for (const sessionFeedId of sessionFeeds.keys()) {
        const feed = sessionFeeds[sessionFeedId];
        const session = outputSessions[sessionFeedId];
        assert(feed);
        assert(session);
        outputFeeds[sessionFeedId] = {
            id: sessionFeedId,
            name: session.title,
            videoRoom: false,
            textChat: false,
            youtube: feed.youtubeURL,
            zoomRoom: feed.zoomURL
        };
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

export default function AdminProgramUpload() {
    const conference = useConference();
    const { isAdmin } = useUserRoles();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const [inputProgramDatas, setInputProgramDatas] = useState<Array<string> | null>(null);
    const [inputFeedDatas, setInputFeedDatas] = useState<Array<any>>([]);

    const [trackNames, setTrackNames] = useState<string[]>([]);
    const [trackVideomRoomDefaults, setTrackVideoRoomDefaults] = useState<Array<string>>([]);
    const [trackTextChatDefaults, setTrackTextChatDefaults] = useState<Array<string>>([]);
    const [trackExhibitDefaults, setTrackExhibitDefaults] = useState<Array<string>>([]);

    const [selectedTrackName, setSelectedTrackName] = useState<string | "none">("none");
    const [selectedSessionId, setSelectedSessionId] = useState<string | "none">("none");
    const [selectedEventId, setSelectedEventId] = useState<string | "none">("none");
    const [selectedItemName, setSelectedItemName] = useState<string | "none">("none");

    const [programData, setProgramData] = useState<CompleteSpecs | null>(null);

    useHeading("Admin: Program Upload");

    useEffect(() => {
        try {
            let _trackNames: string[] = [];
            if (inputProgramDatas) {
                _trackNames = processResearchrXMLsForDefaults(inputProgramDatas).trackNames;
            }
            const addedTrackNames = _trackNames.filter(x => !trackNames.includes(x));
            const deletedTrackNames = trackNames.filter(x => !_trackNames.includes(x));

            if (addedTrackNames.length > 0 || deletedTrackNames.length > 0) {
                setTrackNames(_trackNames);
                if (!selectedTrackName || !_trackNames.includes(selectedTrackName)) {
                    setSelectedTrackName("none");
                    setSelectedSessionId("none");
                    setSelectedEventId("none");
                    setSelectedItemName("none");
                }
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
    }, [inputProgramDatas, selectedTrackName, trackNames]);

    useEffect(() => {
        setTrackTextChatDefaults(oldDefaults => Array.from(new Set(oldDefaults.concat(trackVideomRoomDefaults)).values()));
    }, [trackVideomRoomDefaults]);

    useEffect(() => {
        try {
            if (inputProgramDatas && inputFeedDatas) {
                const sessionFeeds = new Map<string, { youtubeURL?: string; zoomURL?: string }>();
                for (const feedGroup of inputFeedDatas) {
                    assert(feedGroup instanceof Array);
                    for (const feed of feedGroup) {
                        assert(feed.name);
                        assert(feed.youtubeURL || feed.zoomURL);
                        sessionFeeds.set(feed.name, feed);
                    }
                }
                const data = processResearchrXMLs(
                    inputProgramDatas,
                    trackVideomRoomDefaults,
                    trackTextChatDefaults,
                    trackExhibitDefaults,
                    sessionFeeds);
                setProgramData(data);
            }
            else {
                setProgramData(null);
            }
        }
        catch (e) {
            addError(`Error processing data: ${e}`);
        }
    }, [inputFeedDatas, inputProgramDatas, trackExhibitDefaults, trackTextChatDefaults, trackVideomRoomDefaults]);

    function fmtDate(date: Date) {
        return `${date.getUTCDate()}/${date.getUTCMonth()}`;
    }

    function fmtTime(date: Date) {
        return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`;
    }

    const selectedEvent = selectedEventId && selectedEventId !== "none" ? programData?.events[selectedEventId] : undefined;
    const selectedEventItem = selectedEvent ? programData?.items[selectedEvent.item] : undefined;

    return !isAdmin
        ? <Redirect to="/notfound" />
        : <div className="admin-program-upload">
            <div>
                <label htmlFor="newUploadDataFile">Select Researchr Program XML file</label><br />
                <input id="newUploadDataFile" type="file" accept="application/xml"
                    disabled={isProcessing || isUploading}
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
                    disabled={isProcessing || isUploading}
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
            <label id="track_video_defaults_label">Track defaults: Select tracks whose events should have video rooms by default:</label>
            <MultiSelect
                className="track-video-room-defaults-control__multiselect"
                labelledBy="track_video_defaults_label"
                options={trackNames.map(x => ({
                    value: x,
                    label: x
                }))}
                value={trackVideomRoomDefaults.map(x => ({ value: x, label: x }))}
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
                value={trackTextChatDefaults.map(x => ({ value: x, label: x }))}
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
                value={trackExhibitDefaults.map(x => ({ value: x, label: x }))}
                onChange={(vals: { label: string; value: string }[]) => {
                    setTrackExhibitDefaults(
                        Array.from(new Set(vals.map(x => x.value)))
                    )
                }}
            />
            {!!programData
                ? <>
                    <br />
                    <h5>Please review the program setup before uploading:</h5>
                    <p>Select a track to review the sessions and events within it.</p>
                    <div>
                        <label id={`tracks-select`}>Select a track:</label><br />
                        <select
                            aria-labelledby={`tracks-select`}
                            onChange={(ev) => {
                                setSelectedTrackName(ev.target.selectedOptions[0].value);
                                setSelectedSessionId("none");
                                setSelectedEventId("none");
                                setSelectedItemName("none");
                            }}
                            value={selectedTrackName}
                        >
                            <option disabled value="none" key="delete"> -- select an option -- </option>
                            {Object.keys(programData.tracks).map(t =>
                                <option
                                    key={t}
                                    value={t}
                                >
                                    {t}
                                </option>
                            )}
                        </select>
                    </div>
                    <hr />
                    {selectedTrackName &&
                        Object.values(programData.sessions).filter(x => x?.track === selectedTrackName).length > 0
                        ? <>
                            <div>
                                <label id={`sessions-select`}>Select a session from the selected track:</label><br />
                                <select
                                    aria-labelledby={`sessions-select`}
                                    onChange={(ev) => {
                                        setSelectedSessionId(ev.target.selectedOptions[0].value);
                                        setSelectedEventId("none");
                                    }}
                                    value={selectedSessionId}
                                >
                                    <option disabled value="none" key="delete"> -- select an option -- </option>
                                    {Object.values(programData.sessions).filter(x => x?.track === selectedTrackName).map(session => {
                                        if (session) {
                                            const events = removeUndefined(Object.values(programData.events).filter(x => x?.session === session.id));

                                            const earliestStart = events?.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000));
                                            const latestEnd = events?.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0));

                                            return <option
                                                key={session.id}
                                                value={session.id}
                                            >
                                                {session.title} ({fmtDate(earliestStart)} {fmtTime(earliestStart)} - {fmtDate(latestEnd)} {fmtTime(latestEnd)})
                                            </option>;
                                        }
                                        return undefined;
                                    })}
                                </select>
                            </div>
                            <br />
                            <div>
                                <label id={`events-select`}>Select an event from the selected session:</label><br />
                                <select
                                    aria-labelledby={`events-select`}
                                    onChange={(ev) => setSelectedEventId(ev.target.selectedOptions[0].value)}
                                    value={selectedEventId}
                                >
                                    <option disabled value="none" key="delete"> -- select an option -- </option>
                                    {Object.values(programData.events).filter(x => x?.session === selectedSessionId).map(event => {
                                        if (event) {
                                            const item = programData.items[event.item];
                                            assert(item);
                                            return <option
                                                key={event.id}
                                                value={event.id}
                                            >
                                                {item.title} ({fmtDate(event.startTime)} {fmtTime(event.startTime)} - {fmtDate(event.endTime)} {fmtTime(event.endTime)})
                                            </option>;
                                        }
                                        return undefined;
                                    })}
                                </select>
                            </div>
                            {selectedEvent
                                ? <>
                                    <br />
                                    <p>Chair: {!!selectedEvent.chair ? selectedEvent.chair : "<None>"}</p>
                                    {selectedEventItem
                                        ? <>
                                            <p>Abstract:<br />{selectedEventItem.abstract}</p>
                                            <p>Exhibited? {selectedEventItem.exhibit ? "Yes" : "No"}</p>
                                            <p>Item feed? {!!selectedEventItem.feed ? "Yes" : "No"}</p>
                                        </>
                                        : <>Error: Item not found!</>
                                    }
                                </>
                                : selectedEventId !== "none"
                                    ? <>Error: Event not found!</>
                                    : <></>
                            }
                            <hr />
                        </>
                        : <></>}
                    {selectedTrackName && selectedTrackName !== "none" &&
                        Object.values(programData.sessions).filter(x => x?.track === selectedTrackName).length === 0
                        ? <>
                            <div>
                                <label id={`items-select`}>Select an item from the selected track:</label><br />
                                <select
                                    aria-labelledby={`items-select`}
                                    onChange={(ev) => setSelectedItemName(ev.target.selectedOptions[0].value)}
                                    value={selectedItemName}
                                >
                                    <option disabled value="none" key="delete"> -- select an option -- </option>
                                    {Object.values(programData.items).filter(x => x?.track === selectedTrackName).map(item => {
                                        if (item) {
                                            return <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.title}
                                            </option>;
                                        }
                                        return undefined;
                                    })}
                                </select>
                            </div>
                            <hr />
                        </>
                        : <></>}
                </>
                : <></>
            }
            <br />
            <AsyncButton
                content="Upload"
                action={async () => {
                    setIsUploading(true);
                    try {
                        assert(await Parse.Cloud.run("import-program", {
                            conference: conference.id,
                            data: programData
                        }));
                        addNotification("Upload succeeded.");
                    }
                    catch (e) {
                        addError(`Failed upload: ${e}`);
                    }
                    setIsUploading(false);
                }}
                disabled={isProcessing || isUploading || !programData}
            />
        </div>;
}
