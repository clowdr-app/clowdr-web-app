var moment = require('moment');
const Twilio = require("twilio");
const Papa = require('./papaparse.min');
const { response } = require('express');

// Is the given user in any of the given roles?
async function userInRoles(user, allowedRoles) {
    const roles = await new Parse.Query(Parse.Role).equalTo('users', user).find();
    return roles.find(r => allowedRoles.find(allowed =>  r.get("name") == allowed)) ;
}

Parse.Cloud.define("create-obj", async (request) => {
    let data = request.params;
    let clazz = request.params.clazz;
    let confID = request.params.conference;
    delete data.clazz;
    console.log(`[create obj]: request to create ${clazz} in ${confID}`);

    if (userInRoles(request.user, [confID + "-admin", confID + "-manager"])) {
        console.log('[create obj]: user has permission to create obj');

        let Clazz = Parse.Object.extend(clazz);
        let obj = new Clazz();
        let ClowdrInstance = Parse.Object.extend("ClowdrInstance");
        let conf = await new Parse.Query(ClowdrInstance).get(confID);
        if (!conf) {
            throw "Unable to create obj: conference not found";
        }

        data.conference = conf;
        let res = await obj.save(data, {useMasterKey: true});

        if (!res) {
            throw ("Unable to create obj");
        }

        console.log('[create obj]: successfully created ' + obj.id);
        return {status: "OK", "id": obj.id};
    }
    else
        throw "Unable to create obj: user not allowed to create new objects";
});

Parse.Cloud.define("update-obj", async (request) => {
    let data = request.params;
    let clazz = request.params.clazz;
    let confID = request.params.conference;
    let id = request.params.id;

    delete data.clazz;
    delete data.conference;
    console.log(`[update obj]: request to update ${data.id} of class ${clazz} in ${confID}`);

    if (userInRoles(request.user, [confID + "-admin", confID + "-manager"])) {
        console.log('[update obj]: user has permission to update obj');
        let Clazz = Parse.Object.extend(clazz);
        let obj = await new Parse.Query(Clazz).get(id);
        if (!obj) {
            throw (`Unable to update obj: ${id} not found`);
        }
        let res = await obj.save(data, {useMasterKey: true});

        if (!res) {
            throw ("Unable to update obj");
        }

        console.log('[update obj]: successfully updated ' + obj.id);
    }
    else
        throw "Unable to update obj: user not allowed to update objects";
});

Parse.Cloud.define("delete-obj", async (request) => {
    let confID = request.params.conference;
    let id = request.params.id;
    let clazz = request.params.clazz;
    console.log(`[delete obj]: request to delete ${id} of class ${clazz} in ${confID}`);

    if (userInRoles(request.user, [confID + "-admin", confID + "-manager"])) {
        console.log('[delete obj]: user has permission to delete obj');
        let Clazz = Parse.Object.extend(clazz);
        let obj = await new Parse.Query(Clazz).get(id);
        if (obj) {
            await obj.destroy({useMasterKey: true});
        }
        else {
            throw (`Unable to delete obj: ${id} not found`);
        }

        console.log('[delete obj]: successfully deleted ' + id);
    }
    else
        throw "Unable to delete obj: user not allowed to delete objects";
});

Parse.Cloud.define("poster-upload", async (request) => {
    console.log('Request to upload a poster image for ' + request.params.posterId);
    const imgData = request.params.content;
    const conferenceId = request.params.conferenceId;
    const posterId = request.params.posterId;

    try {

        var ProgramItem = Parse.Object.extend("ProgramItem");
        var query = new Parse.Query(ProgramItem);
        // query.equalTo("conference", conference);
        let poster = await query.get(posterId, {useMasterKey: true});
        let file = new Parse.File('poster-image', {base64: imgData});
        await file.save({useMasterKey: true});
        poster.set("posterImage", file);
        await poster.save({}, {useMasterKey: true});
        return {status: "OK", "file": file.url()};
    } catch (err) {
        console.log("Unable to update poster " + posterId);
        console.log(err);
        throw err;
    }
});

Parse.Cloud.define("rooms-upload", async (request) => {
    console.log('Request to upload rooms data');
    const data = request.params.content;
    const conferenceID = request.params.conference;

    var Conference = Parse.Object.extend("ClowdrInstance");
    var q = new Parse.Query(Conference);
    let conference = await q.get(conferenceID);

    if (!conference) {
        response.error("Bad conference ID");
        return;
    }
    
    var Room = Parse.Object.extend("ProgramRoom");
    var rquery = new Parse.Query(Room);
    rquery.equalTo("conference", conference);
    rquery.limit(1000);
    rquery.find().then(existing => {
        let toSave = [];
        let acl = new Parse.ACL();
        acl.setPublicWriteAccess(false);
        acl.setPublicReadAccess(true);
        acl.setRoleWriteAccess(conferenceID+"-manager", true);
        acl.setRoleWriteAccess(conferenceID+"-admin", true);
    
        rows = Papa.parse(data, {header: true});
        rows.data.forEach(element => {
            addRow(element, conference, existing, toSave, acl);
        });
        console.log(`--> Saving ${toSave.length} rooms`)

        Parse.Object.saveAll(toSave, {useMasterKey: true})
        .then(res => console.log("[Rooms]: Done saving all rooms "))
        .catch(err => console.log('[Rooms]: error: ' + err));
    }).catch(err => console.log('[Rooms]: Problem fetching rooms ' + err));

});

function getIDAndPwd(str) {
    let url = new URL(str)
    let id = "";
    let pwd ="";
    if (url.pathname) {
        let parts = url.pathname.split('/');
        id = parts[parts.length-1];
    }
    if (url.searchParams) {
        pwd = url.searchParams.get('pwd');
    }
    return [id, pwd];
}

function addRow(row, conference, existing, toSave, acl) {
    if (row.Name) {
        let name = row.Name.trim();
        if (!existing.find(r => r.get("name").trim() == name)) {
            var Room = Parse.Object.extend("ProgramRoom");
            var room = new Room();
            room.set("conference", conference);
            room.set("name", name);
            room.setACL(acl);
            if (row.YouTube) {
                let data = getIDAndPwd(row.YouTube);
                room.set("src1", "YouTube")
                room.set("id1", data[0]);
                if (row.iQIYI) {
                    let data2 = getIDAndPwd(row.iQIYI)
                    room.set("src2", "iQIYI")
                    room.set("id2", data2[0]);

                }
                room.set("qa", (row.QA ? row.QA : ""));
            }
            else if (row.Zoom) {
                room.set("src1", "ZoomUS")
                room.set("src2", "ZoomCN")
                let data = getIDAndPwd(row.Zoom);
                room.set("id1", data[0]);
                room.set('pwd1', data[1]);
                room.set("id2", data[0]);
                room.set('pwd2', data[1]);
            }
            else
                return

            toSave.push(room);
        }
        else
            console.log('[Rooms]: Skipping existing room ' + row.Name);
    }
}

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
        let session = undefined;
        if (allSessions[ses.Key])
            session = allSessions[ses.Key];

        var start = Date.now(), end = Date.now();
        let times = ses.Time.split('-');
        if (times.length >= 2) {
            let startTime = ses.Day + ' ' + times[0];
            let endTime = ses.Day + ' ' + times[1];
            start = moment.utc(startTime, "YYYY-MM-DD HH:mm");
            end = moment.utc(endTime, "YYYY-MM-DD HH:mm");
//            console.log('Time> ' + start.toDate() + ' ' + end.toDate());
        }

        if (!session) {
            session = new ProgramSession();
            allSessions[session.get("confKey")] = session;

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
        }

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
        i++;
    }
    try{
        await Parse.Object.saveAll(newSessions, {useMasterKey: true});
        toSave = [];
        for (const ses of data.Sessions) {
            if (ses.Items) {
                ses.Items.forEach((k) => {
                    if(allItems[k]){
                        // console.log(allItems[k].get("program"))
                        if(!allItems[k].get("programSession")){
                            allItems[k].set("programSession", allSessions[ses.Key])
                            toSave.push(allItems[k]);
                        }
                    }
                    else
                        console.log("Could not find item: " + k);
                });
            }
        }
        console.log('Resaving items: ' + toSave.length);
        await Parse.Object.saveAll(toSave, {useMasterKey: true});
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

    let mode = "group";
    let maxParticipants = 50;

    let parseRoom = new BreakoutRoom();
    parseRoom.set("title", programItem.get("title"));
    parseRoom.set("conference", programItem.get("conference"));
    parseRoom.set("isPrivate", false);
    parseRoom.set("persistence", "persistent");
    parseRoom.set("mode", mode);
    parseRoom.set("capacity", maxParticipants);
    parseRoom.set("programItem", programItem);
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
Parse.Cloud.beforeSave("StarredProgram", async (request) => {
    let savedProgram = request.object;
    if(savedProgram.isNew()){
        let acl  =new Parse.ACL();
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        acl.setWriteAccess(request.user, true);
        acl.setReadAccess(request.user, true);
        savedProgram.setACL(acl);
    }
});


Parse.Cloud.beforeSave("ProgramTrack", async (request) => {
    let track = request.object;
    if (track.dirty("perProgramItemVideo")) {
        if (track.get("perProgramItemVideo")) {
            let itemQ = new Parse.Query("ProgramItem");
            itemQ.equalTo("track", track);
            itemQ.include("breakoutRoom");
            itemQ.include("programSession.room");
            itemQ.include("programSession.room.socialSpace");
            itemQ.limit(1000);
            let items = await itemQ.find({useMasterKey: true});
            let promises = [];
            for(let item of items){
                if(!item.get("programSession")){
                    // let sessionQ = new Parse.Query("ProgramSession");
                    // sessionQ.include("room");
                    // let session = await sessionQ.get("S9BI5jmi4O");
                    // if(!session.get("items"))
                    //     session.set("items",[]);
                    // session.get("items").push(item);
                    // await session.save({},{useMasterKey: true});
                    // item.set("programSession", session);
                    // await item.save({},{useMasterKey: true});
                    console.log("No session for item in track: " + item.id)
                    continue;
                }
                if(!item.get("breakoutRoom")){
                    promises.push(createBreakoutRoomForProgramItem(item, track));
                }
                // if(item.get("breakoutRoom") && (!item.get("breakoutRoom").get("socialSpace") || item.get("breakoutRoom").get("socialSpace").id !=
                // item.get("programSession").get("room").get("socialSpace").id)){
                //     let breakout = item.get("breakoutRoom");
                //     breakout.set("socialSpace", item.get("programSession").get("room").get("socialSpace"));
                //     await breakout.save({},{useMasterKey: true});
                // }
            }
            await Promise.all(promises);
        } else {
        //     TODO Make sure no tracks have breakout rooms still...
        }
    }

});