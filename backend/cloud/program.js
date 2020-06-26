var moment = require('moment');
const Twilio = require("twilio");

let allPeople = {};
let allItems = {};
let allSessions = {};
let daysTillStart = moment("2020-10-06", "YYYY-MM-DD").subtract(moment(moment().format("YYYY-MM-DD")));

function getAuthors(authorKeys) {
    let authors = [];
    authorKeys.map(key => {
        author = allPeople[key];
        if (author)
            authors.push(author);
        else
            console.log(`Warning: author ${key} not found`)
    })
    return authors;
}

let i = 0;

Parse.Cloud.define("program-upload", async (request) => {
    console.log('Request to upload program data');
    let data = request.params.content;
    const conferenceID = request.params.conference;
    data = JSON.parse(data);

    let conferoPeople = {};
    data.People.forEach((p) => {
        conferoPeople[p.Key.trim()] = p;
    })

    let tracks = {};
    data.Items.forEach(item => {
        let parts = item.Key.split("/");
        let trackName = parts[0].trim();
        if (trackName.includes('catering') || trackName == 'icse-2020-test')
            return;
        if (trackName in tracks)
            tracks[trackName] = tracks[trackName] + 1;
        else
            tracks[trackName] = 1;
    });

    let rooms = {}
    data.Sessions.forEach(session => {
        const loc = session.Location.trim();
        if (loc in rooms)
            rooms[loc] = rooms[loc] + 1;
        else
            rooms[loc] = 1;
    });

    let confQ = new Parse.Query("ClowdrInstance")
    confQ.equalTo("objectId", conferenceID)
    let conf = await confQ.first();

    let acl = new Parse.ACL();
    acl.setPublicWriteAccess(false);
    acl.setPublicReadAccess(true);
    acl.setRoleWriteAccess(conf.id+"-manager", true);
    acl.setRoleWriteAccess(conf.id+"-admin", true);

    // Create the tracks first
    let newTracks = [];
    let ProgramTrack = Parse.Object.extend('ProgramTrack');
    var qt = new Parse.Query(ProgramTrack);
    qt.equalTo("conference", conf);
    qt.limit(100);
    var existingTracks = await qt.find({useMasterKey: true});
    for (let [name, count] of Object.entries(tracks)) {
        if (existingTracks.find(t => t.get('name') == name)) {
            console.log('Track already exists: ' + name);
            continue;
        }
        let newTrack = new ProgramTrack();
        newTrack.set('name', name.trim());
        newTrack.set('conference', conf);
        newTrack.setACL(acl);
        newTracks.push(newTrack);
        existingTracks.push(newTrack);
    }
    try {
        await Parse.Object.saveAll(newTracks, {useMasterKey: true});
    } catch(err){
        console.log(err);
    }
    console.log('Tracks saved: ' + newTracks.length);

    // Create the rooms next
    let newRooms = [];
    let ProgramRoom = Parse.Object.extend('ProgramRoom');
    var qr = new Parse.Query(ProgramRoom);
    qr.equalTo("conference", conf);
    qr.limit(100);
    var existingRooms = await qr.find({useMasterKey: true});
    for (let [name, count] of Object.entries(rooms)) {
        if (existingRooms.find(r => r.get('name') == name)) {
            console.log('Room already exists: ' + name);
            continue;
        }
        let newRoom = new ProgramRoom();
        newRoom.set('name', name.trim());
        newRoom.set('location', 'TBD');
        newRoom.set('conference', conf);
        newRoom.setACL(acl);
        newRooms.push(newRoom);
        existingRooms.push(newRoom);
    }
    try {
        await Parse.Object.saveAll(newRooms, {useMasterKey: true});
    } catch(err){
        console.log(err);
    }
    console.log('Rooms saved: ' + newRooms.length);

    // Create People next
    let ProgramPerson = Parse.Object.extend("ProgramPerson");
    let qp = new Parse.Query(ProgramPerson);
    qp.limit(10000);
    let people = await qp.find({useMasterKey: true});
    people.forEach((person) => {
        allPeople[person.get("confKey")] = person;
    })
    let newPeople = [];
    for (const person of data.People) {
        if (allPeople[person.Key.trim()]) {
            continue
        }

        let newPerson = new ProgramPerson();
        person.Name ? newPerson.set("name", person.Name.trim()) : newPerson.set("name", person.Name);
        person.Bio ? newPerson.set("bio", person.Bio.trim()) : newPerson.set("bio", person.Bio);
        person.Affiliation ? newPerson.set("affiliation", person.Affiliation.trim()) : newPerson.set("affiliation", person.Affiliation);
        person.Key ? newPerson.set("confKey", person.Key.trim()) : newPerson.set("confKey", person.Key);
        person.URL ? newPerson.set("URL", person.URL.trim()) : newPerson.set("URL", person.URL);
        person.URLPhoto ? newPerson.set("URLPhoto", person.URLPhoto.trim()) : newPerson.set("URLPhoto", person.URLPhoto);
        newPerson.setACL(acl);
        newPeople.push(newPerson);
        allPeople[newPerson.get("confKey")] = newPerson;
    }
    try {
        await Parse.Object.saveAll(newPeople, {useMasterKey: true});
    } catch(err){
        console.log(err);
    }
    console.log("People saved: " + newPeople.length);

    // Create Items
    let ProgramItem = Parse.Object.extend("ProgramItem");
    let q = new Parse.Query(ProgramItem);
    q.equalTo("conference", conf);
    q.limit(1000);
    let items = await q.find({useMasterKey: true});
    items.forEach((item) => {
        allItems[item.get("confKey")] = item;
    })

    let newItems = [];
    for (const item of data.Items) {
        if (allItems[item.Key.trim()]) {
            continue
        }
        let parts = item.Key.split("/");
        let trackName = parts[0].trim();
        let track = existingTracks.find(t => t.get('name') == trackName);
        if (!track)
            console.log('Warning: Adding item without track: ' + item.Key);

        let newItem = new ProgramItem();
        item.Title ? newItem.set("title", item.Title.trim()) : newItem.set("title", item.Title);
        // item.Type ? newItem.set("type", item.Type.trim()) : newItem.set("type", '');
        newItem.set("type", item.Type)
        item.URL ? newItem.set("url", item.URL.trim()) : newItem.set("url", item.URL);
        item.Abstract ? newItem.set("abstract", item.Abstract.trim()) : newItem.set("abstract", item.Abstract);
        newItem.set("affiliations", item.Affiliations);
        newItem.set("conference", conf);
        item.Key ? newItem.set("confKey", item.Key.trim()) : newItem.set("confKey", item.Key);
        newItem.set('track', track);
        newItem.setACL(acl);
        // get authors pointers
        let authors = getAuthors(item.Authors);
        newItem.set("authors", authors);
        newItems.push(newItem);
        allItems[newItem.get("confKey")] = newItem;
    }
    try {
        await Parse.Object.saveAll(newItems, {useMasterKey: true});
    } catch(err){
        console.log(err);
    }
    console.log("Items saved: " + newItems.length);

    // Create Sessions
    let ProgramSession = Parse.Object.extend("ProgramSession");
    let qs = new Parse.Query(ProgramSession);
    qs.limit(10000);
    let sessions = await qs.find({useMasterKey: true});
    sessions.forEach((session) => {
        allSessions[session.get("confKey")] = session;
    })

    let newSessions = [];
    for (const ses of data.Sessions) {
        if (allSessions[ses.Key])
            continue;

        var start = Date.now(), end = Date.now();
        let times = ses.Time.split('-');
        if (times.length >= 2) {
            let startTime = ses.Day + ' ' + times[0];
            let endTime = ses.Day + ' ' + times[1];
            start = moment.utc(startTime, "YYYY-MM-DD HH:mm");
            end = moment.utc(endTime, "YYYY-MM-DD HH:mm");
//            console.log('Time> ' + start.toDate() + ' ' + end.toDate());
        }

        let session = new ProgramSession();
        ses.Title ? session.set("title", ses.Title.trim()) : session.set("title", ses.Title);
        ses.Abstract ? session.set("abstract", ses.Abstract.trim()) : session.set("abstract", ses.Abstract);
        // ses.Type ? session.set("type", ses.Type.trim()) : session.set("type", '');
        session.set("type", ses.Type)
        session.set("startTime", start.toDate());
        session.set("endTime", end.toDate());
        ses.Location ? session.set("location", ses.Location.trim()) : session.set("location", ses.Location);
        ses.Key ? session.set("confKey", ses.Key.trim()) : session.set("confKey", ses.Key);
        session.set("conference", conf);
        session.setACL(acl);

        // Find the pointer to the room
        let room = existingRooms.find(r => r.get('name') == ses.Location);
        if (room)
            session.set("room", room);
        else
            console.log(`Warning: room ${ses.Location} not found for session ${ses.Title}`);

        // Find the pointers to the items
        let items = [];
        if (ses.Items) {
            ses.Items.forEach((k) => {
                if(allItems[k])
                    items.push(allItems[k]);
                else
                    console.log("Could not find item: " + k);
            });
        }
        session.set("items", items);
        newSessions.push(session);
        allSessions[session.get("confKey")] = session;
        i++;
    }
    try{
        await Parse.Object.saveAll(newSessions, {useMasterKey: true});
    } catch(err){
        console.log(err);
    }
    return {
        'key': 1,
        'sessions': Object.keys(allSessions).length,
        'items': Object.keys(allItems).length,
        'tracks': existingTracks.length,
        'rooms': existingRooms.length,
        'people': Object.keys(allPeople.length)
    };
});

//=======
let InstanceConfig = Parse.Object.extend("InstanceConfiguration");

let BreakoutRoom = Parse.Object.extend("BreakoutRoom");
async function getConfig(conference){
    let configQ = new Parse.Query(InstanceConfig);
    configQ.equalTo("instance", conference);
    let res = await configQ.find({useMasterKey: true});
    let config = {};
    for (let obj of res) {
        config[obj.get("key")] = obj.get("value");
    }
    config.twilio = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    return config;
}


async function createBreakoutRoomForProgramItem(programItem){
    let config = await getConfig(programItem.get("conference"));

    let mode = "peer-to-peer";
    let maxParticipants = 5;

    let parseRoom = new BreakoutRoom();
    parseRoom.set("title", programItem.get("title"));
    parseRoom.set("conference", programItem.get("conference"));
    parseRoom.set("isPrivate", false);
    parseRoom.set("persistence", "persistent");
    parseRoom.set("mode", mode);
    parseRoom.set("capacity", maxParticipants);
    let acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(programItem.get("conference").id+"-conference", true);
    parseRoom.setACL(acl);

    parseRoom.set("socialSpace", programItem.get("programSession").get("room").get("socialSpace"))
    parseRoom = await parseRoom.save({}, {useMasterKey: true});
    programItem.set("breakoutRoom", parseRoom);
    await programItem.save({},{useMasterKey: true})
}

Parse.Cloud.beforeSave("ProgramItem", async (request) => {
    //Check to make sure that we don't need to make a video room for this
    let programItem = request.object;
    // if (programItem.isNew() && !programItem.get("breakoutRoom")) {
    //     let track = programItem.get("track");
    //     track = await track.fetch({useMasterKey: true});
    //     if (track && track.get("perProgramItemVideo")) {
    //         //Create a breakoutroom for this program item
    //         await createBreakoutRoomForProgramItem(programItem, track);
    //     }
    // }
});

Parse.Cloud.beforeSave("ProgramTrack", async (request) => {
    let track = request.object;
    if (track.dirty("perProgramItemVideo")) {
        if (track.get("perProgramItemVideo")) {
            let itemQ = new Parse.Query("ProgramItem");
            itemQ.equalTo("track", track);
            itemQ.include("programSession.room");
            itemQ.limit(1000);
            let items = await itemQ.find({useMasterKey: true});
            let promises = [];
            for(let item of items){
                if(!item.get("programSession")){
                    console.log("No session for item in track: " + item.id)
                    continue;
                }
                console.log(item.get("programSession").get("room"))
                if(!item.get("breakoutRoom")){
                    promises.push(createBreakoutRoomForProgramItem(item, track));
                }
            }
            await Promise.all(promises);
        } else {
            // TODO Make sure no tracks have breakout rooms still...
        }
    }

});