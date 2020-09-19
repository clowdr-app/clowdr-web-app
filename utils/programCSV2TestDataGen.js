const yargs = require('yargs');
const fs = require("fs");
const path = require("path");
const csvParse = require('csv-parse/lib/sync');
const moment = require('moment-timezone');

const argv = yargs
    .option("in", {
        alias: "i",
        description: "The CSV data file to convert",
        type: "string",
        demandOption: true
    })
    .option("out", {
        alias: "o",
        description: "The output file containing JS functions (this is not a standalone file)",
        type: "string",
        demandOption: true
    })
    .option("timezone", {
        alias: "tz",
        description: "Timezone to process dates/times in the data.",
        default: "Europe/London",
        type: "string",
        demandOption: false
    })
    .option("original-start-time", {
        alias: "ost",
        description: "The original time the program was scheduled, so it can be shifted relative to today's time",
        default: "2020-09-02 12:00",
        type: "string",
        demandOption: false
    })
    .option("conference", {
        alias: "c",
        description: "The ID of the conference the program will belong to.",
        default: "mockConference1",
        type: "string",
        demandOption: false
    })
    .help()
    .alias("help", "h")
    .argv;

main();

function main() {
    const inputFile = argv.in;
    const outputFile = argv.out;
    const timezone = argv.timezone;
    const origStartTime = moment.tz(argv["original-start-time"], timezone);
    const conference = argv.conference;

    console.log(`Input file          : ${inputFile}`);
    console.log(`Output file         : ${outputFile}`);
    console.log(`Timezone            : ${timezone}`);
    console.log(`Original start time : ${origStartTime}`);
    console.log(`Conference          : ${conference}`);
    console.log("=====================");

    const data = fs.readFileSync(inputFile).toString();

    const { sessions, rooms, items, persons, events, tracks } = processInputData(data, timezone);

    const sessionKeys = Object.keys(sessions);
    const roomKeys = Object.keys(rooms);
    const itemKeys = Object.keys(items);
    const personKeys = Object.keys(persons);
    const trackKeys = Object.keys(tracks);

    const tracksCode = generateProgramTracksCode(tracks, conference, origStartTime);
    const sessionsCode = generateProgramSessionsCode(sessions, conference, origStartTime, roomKeys, trackKeys);
    const roomsCode = generateProgramRoomsCode(rooms, conference, origStartTime);
    const itemsCode = generateProgramItemsCode(items, conference, origStartTime, personKeys, trackKeys);
    const personsCode = generateProgramPersonsCode(persons, conference, origStartTime);
    const eventsCode = generateProgramEventsCode(events, conference, origStartTime, itemKeys, sessionKeys);

    let code = "";

    code = code.concat(`
function generateProgramTrack() {
    let result = [];

${tracksCode.reduce((acc, x) => acc + x + "\n\n", "")}
    return result;
}
`);

    code = code.concat(`
function generateProgramSession() {
    let result = [];

${sessionsCode.reduce((acc, x) => acc + x + "\n\n", "")}
    return result;
}
`);

    code = code.concat(`
function generateProgramRoom() {
    let result = [];

${roomsCode.reduce((acc, x) => acc + x + "\n\n", "")}
    return result;
}
`);

    code = code.concat(`
function generateProgramItem() {
    let result = [];

${itemsCode.reduce((acc, x) => acc + x + "\n\n", "")}
    return result;
}
`);

    code = code.concat(`
function generateProgramPerson() {
    let result = [];

${personsCode.reduce((acc, x) => acc + x + "\n\n", "")}
    return result;
}
`);

    code = code.concat(`
function generateProgramSessionEvent() {
    let result = [];

${eventsCode.reduce((acc, x) => acc + x + "\n\n", "")}
    return result;
}
`);

    fs.writeFileSync(outputFile, code);

    console.log("Done");
}

// TODO: Something isn't handling dates properly...

function processInputData(data, timezone) {
    const records = csvParse(data, {
        columns: true, trim: true, skip_empty_lines: true
    });
    let tracks = {};
    let sessions = {};
    let rooms = {};
    let items = {};
    let persons = {};
    let events = [];
    for (let record of records) {
        let tName = record['Track Name'];
        if (!tracks[tName]) {
            tracks[tName] = { name: tName, obj: undefined };
        }
        let track = tracks[tName];
        let rName = record["Room Name"];
        if (rName && !rooms[rName]) {
            rooms[rName] = { name: rName, obj: undefined };
        }
        let room = rName ? rooms[rName] : undefined;
        let sName = record["Session Name"];
        if (sName && !sessions[sName]) {
            sessions[sName] = {
                name: sName, room: room, obj: undefined,
                track: track
            };
        }
        let session = sName ? sessions[sName] : undefined;
        if (session && session.room !== room) {
            throw new Error("Session " + sName + " found in multiple rooms: " + rName + " and " + session.room.name + ". Please make sure that each session is assigned to exactly one room");
        }
        let iName = record['Event Title'];
        if (!items[iName]) {
            let authors = record['Event Authors'].split(",").map(name => {
                name = name.trim();
                if (!persons[name]) {
                    persons[name] = { name: name, obj: undefined };
                }
                return persons[name];
            });
            items[iName] = {
                name: iName,
                abstract: record['Event Abstract'],
                authors: authors,
                track: track
            };
        }
        if (record['Event Start Time'] || record['Event End Time']) {
            if (!session)
                throw new Error("All scheduled events must be in a session, but found one that wasn't. Either put it in a session or remove the start/end times. Item: " + iName);
            // console.log("--> " + record['Event Start Time'] + " " + timezone);
            let sTime = moment.tz(record['Event Start Time'], "YYYY-MM-DD hh:mm", timezone);
            if (!sTime) {
                throw new Error("Invalid start time specified '" + sTime + "' in record" + JSON.stringify(record) + ". Please use the format YYYY-MM-DD HH:mm");
            }
            let eTime = moment.tz(record['Event End Time'], "YYYY-MM-DD hh:mm", timezone);
            if (!eTime) {
                throw new Error("Invalid end time specified '" + eTime + "' in record" + JSON.stringify(record) + ". Please use the format YYYY-MM-DD HH:mm");
            }
            if (eTime < sTime)
                throw new Error("Invalid start/end time specified: start must be before end (found " + sTime + ", " + eTime + ")");
            if (!session.eTime) {
                session.eTime = eTime;
            }
            if (!session.sTime) {
                session.sTime = sTime;
            }
            if (sTime < session.sTime)
                session.sTime = sTime;
            if (eTime > session.eTime)
                session.eTime = eTime;
            events.push({
                sTime: sTime,
                eTime: eTime,
                item: items[iName],
                session: session,
                track: track
            });
        }
        // else {
        //     if (!session) {
        //         console.log("No session for " + iName);
        //     }
        //     events.push({
        //         item: items[iName],
        //         track: track,
        //         session: session
        //     });
        // }
    }
    return { sessions, rooms, items, persons, events, tracks };
}

function transformTime(time, origStartTime) {
    return moment(time).subtract(origStartTime).add(moment().startOf('day'));
}

function generateProgramTracksCode(datas, conference, origStartTime) {
    const code = [];
    const keys = Object.keys(datas);
    for (let idx = 0; idx < keys.length; idx++) {
        const data = datas[keys[idx]];
        const name = data.name;
        const nameParts = name.split(/ |&/gi);
        const firstLettersName = nameParts
            .filter(x => x.length > 0)
            .map(x => x[0].toUpperCase())
            .reduce((acc, x) => acc + x, "");
        const shortName = name.length > 8
            ? firstLettersName
            : nameParts.length > 3
                ? firstLettersName
                : name;

        code.push(
            `result.push({
    conference: "${conference}",
    id: "${conference}-track-${idx}",
    createdAt: new Date(),
    updatedAt: new Date(),

    colour: "#000000",
    generateTextChatPerItem: true,
    generateVideoRoomPerItem: true,
    name: "${name}",
    shortName: "${shortName}",
    
    _acl: {
        "role:${conference}-RoleAdmin": { w: true },
        "role:${conference}-RoleManager": { w: true },
        "role:${conference}-RoleAttendee": { r: true }
    },
    _wperm: [
        "role:${conference}-RoleAdmin",
        "role:${conference}-RoleManager",
    ],
    _rperm: ["role:${conference}-RoleAttendee"],
});`);
    }
    return code;
}

function generateProgramSessionsCode(datas, conference, origStartTime, roomKeys, trackKeys) {
    const code = [];
    const keys = Object.keys(datas);
    for (let idx = 0; idx < keys.length; idx++) {
        const data = datas[keys[idx]];
        const title = data.name;
        const roomName = data.room.name;
        const trackName = data.track.name;
        const roomIdx = roomKeys.indexOf(roomName);
        const trackIdx = trackKeys.indexOf(trackName);
        
        const endTime = transformTime(data.eTime, origStartTime).valueOf();
        const startTime = transformTime(data.sTime, origStartTime).valueOf();

        code.push(
            `result.push({
    conference: "${conference}",
    id: "${conference}-session-${idx}",
    createdAt: new Date(),
    updatedAt: new Date(),
    title: "${title}",
    endTime: new Date(${endTime}),
    startTime: new Date(${startTime}),
    room: "${conference}-room-${roomIdx}",
    track: "${conference}-track-${trackIdx}",
    
    _acl: {
        "role:${conference}-RoleAdmin": { w: true },
        "role:${conference}-RoleManager": { w: true },
        "role:${conference}-RoleAttendee": { r: true }
    },
    _wperm: [
        "role:${conference}-RoleAdmin",
        "role:${conference}-RoleManager",
    ],
    _rperm: ["role:${conference}-RoleAttendee"],
});`);
    }
    return code;
}

function generateProgramRoomsCode(datas, conference, origStartTime) {
    const code = [];
    const keys = Object.keys(datas);
    for (let idx = 0; idx < keys.length; idx++) {
        const data = datas[keys[idx]];
        const name = data.name;

        code.push(
            `result.push({
    conference: "${conference}",
    id: "${conference}-room-${idx}",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "${name}",
    textChat: undefined,
    videoRoom: undefined,
    zoomRoom: undefined,
    
    _acl: {
        "role:${conference}-RoleAdmin": { w: true },
        "role:${conference}-RoleManager": { w: true },
        "role:${conference}-RoleAttendee": { r: true }
    },
    _wperm: [
        "role:${conference}-RoleAdmin",
        "role:${conference}-RoleManager",
    ],
    _rperm: ["role:${conference}-RoleAttendee"],
});`);
    }
    return code;
}

function generateProgramItemsCode(datas, conference, origStartTime, personKeys, trackKeys) {
    const code = [];
    const keys = Object.keys(datas);
    for (let idx = 0; idx < keys.length; idx++) {
        const data = datas[keys[idx]];
        const title = data.name;
        const abstract = data.abstract;
        
        const authorNames = data.authors.map(x => x.name);
        const authorIdxs = authorNames.map(x => personKeys.indexOf(x));

        const trackName = data.track.name;
        const trackIdx = trackKeys.indexOf(trackName);


        code.push(
            `result.push({
    conference: "${conference}",
    id: "${conference}-item-${idx}",
    createdAt: new Date(),
    updatedAt: new Date(),
    abstract: "${abstract}",
    isPrivate: false,
    posterImage: undefined,
    title: "${title}",
    authors: ${JSON.stringify(authorIdxs.map(x => `${conference}-person-${x}`))},
    track: "${conference}-person-${trackIdx}",
    
    _acl: {
        "role:${conference}-RoleAdmin": { w: true },
        "role:${conference}-RoleManager": { w: true },
        "role:${conference}-RoleAttendee": { r: true }
    },
    _wperm: [
        "role:${conference}-RoleAdmin",
        "role:${conference}-RoleManager",
    ],
    _rperm: ["role:${conference}-RoleAttendee"],
});`);
    }
    return code;
}

function generateProgramPersonsCode(datas, conference, origStartTime) {
    const code = [];
    const keys = Object.keys(datas);
    for (let idx = 0; idx < keys.length; idx++) {
        const data = datas[keys[idx]];
        const name = data.name;

        code.push(
            `result.push({
    conference: "${conference}",
    id: "${conference}-person-${idx}",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "${name}",
    profile: undefined,
    
    _acl: {
        "role:${conference}-RoleAdmin": { w: true },
        "role:${conference}-RoleManager": { w: true },
        "role:${conference}-RoleAttendee": { r: true }
    },
    _wperm: [
        "role:${conference}-RoleAdmin",
        "role:${conference}-RoleManager",
    ],
    _rperm: ["role:${conference}-RoleAttendee"],
});`);
    }
    return code;
}

function generateProgramEventsCode(datas, conference, origStartTime, itemKeys, sessionKeys) {
    const code = [];
    const keys = Object.keys(datas);
    for (let idx = 0; idx < keys.length; idx++) {
        const data = datas[keys[idx]];
        const itemName = data.item.name;
        const sessionName = data.session.name;
        const itemIdx = itemKeys.indexOf(itemName);
        const sessionIdx = sessionKeys.indexOf(sessionName);

        const endTime = transformTime(data.eTime, origStartTime).valueOf();
        const startTime = transformTime(data.sTime, origStartTime).valueOf();

        code.push(
            `result.push({
    conference: "${conference}",
    id: "${conference}-event-${idx}",
    createdAt: new Date(),
    updatedAt: new Date(),
    directLink: undefined,
    endTime: new Date(${endTime}),
    startTime: new Date(${startTime}),
    item: "${conference}-item-${itemIdx}",
    session: "${conference}-session-${sessionIdx}",
    
    _acl: {
        "role:${conference}-RoleAdmin": { w: true },
        "role:${conference}-RoleManager": { w: true },
        "role:${conference}-RoleAttendee": { r: true }
    },
    _wperm: [
        "role:${conference}-RoleAdmin",
        "role:${conference}-RoleManager",
    ],
    _rperm: ["role:${conference}-RoleAttendee"],
});`);
    }
    return code;
}
