"use strict";
const Parse = require("parse/node");
const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const {videoToken, ChatGrant, AccessToken} = require('./tokens');

var cors = require('cors')

const client = require('twilio')(config.accountSid, config.token);


Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;


const app = express();
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(pino);


const sendTokenResponse = (token, roomName, res) => {
    res.set('Content-Type', 'application/json');
    res.send(
        JSON.stringify({
            token: token.toJwt(),
            roomName: roomName
        })
    );
};
let membersCache = {};
app.post("/roomCallback", async (req, res) => {
    console.log(req.body.StatusCallbackEvent);
    let roomDBID = req.body.RoomName;
    let Room = Parse.Object.extend("BreakoutRoom");
    let User = Parse.Object.extend("User");
    let query = new Parse.Query(Room);
    let room = await query.get(roomDBID);
    if (req.body.StatusCallbackEvent == 'participant-connected') {
        try {
            let uid = req.body.ParticipantIdentity.substring(0, req.body.ParticipantIdentity.indexOf(":"));
            console.log(uid)
            let userFindQ = new Parse.Query(User);
            let user = await userFindQ.get(uid);
            if (!room.get("members")) {
                room.set("members", [user]);
            } else {
                room.get("members").push(user);
            }
            await room.save();
        } catch (err) {
            console.log(err);
        }

        // let newUser = await roomsRef.child(req.body.RoomName).child("members").child(uid).set(true);
        console.log("Added " + req.body.ParticipantIdentity + " to " + roomDBID + " count is now " + membersCache[roomDBID]);
        ;
        membersCache[req.body.RoomName]++;
    } else if (req.body.StatusCallbackEvent == 'participant-disconnected') {
        let uid = req.body.ParticipantIdentity.substring(0, req.body.ParticipantIdentity.indexOf(":"));
        // let membersRef = roomsRef.child(room).child("members");
        // let newUser = await membersRef.child(uid).remove();
        room.set("members",room.get("members").filter((m)=>m.id!=uid));
        await room.save();
        membersCache[roomDBID]--;
        console.log("Removed " + req.body.ParticipantIdentity + " from " + roomDBID + " count is now " + membersCache[roomDBID]);
        if (membersCache[roomDBID] <= 0) {
            setTimeout(async (twilioID, firebaseID) => {
                console.log("timeout was hit" + membersCache[firebaseID]);
                //Delete the room
                if (membersCache[firebaseID] == -100)
                    return;
                if (membersCache[firebaseID] <= 0) {
                    try {
                        await client.video.rooms(twilioID).update({status: 'completed'});
                        await room.destroy();
                        // await admin.database().ref("breakoutRooms").child(firebaseID).remove();
                    } catch (err) {
                        console.log(err);
                    }
                    console.log("Done");
                    membersCache[firebaseID] = -100;
                }
            }, 5 * 1000, req.body.RoomSid, roomDBID);
        }
    }
    res.send();
})

async function checkToken(token) {
    console.log(token);
    Parse.Cloud.useMasterKey();


    let query = new Parse.Query(Parse.Session);
    query.include("user");
    query.equalTo("sessionToken", token);
    let session = await query.first();
    if (session) {
        let name = session.get("user").get("displayname");
        let id = session.get("user").id;
        return id + ":" + name;
    }
    return undefined;
}

app.post('/chat/deleteRoom', async (req, res, next) => {
    const identity = req.body.identity;
    const room = req.body.room;

    let name = await checkToken(identity);
    await client.chat.services(config.twilio.chatServiceSid).channels(room).remove();

    res.send(JSON.stringify({
        result: "OK"
    }));
});

app.post('/chat/updateRoom', async (req, res, next) => {
    const identity = req.body.identity;
    const room = req.body.room;
    const newName = req.body.newUniqueName;

    let name = await checkToken(identity);
    await client.chat.services(config.twilio.chatServiceSid).channels(room).update({uniqueName: newName});

    res.send(JSON.stringify({
        result: "OK"
    }));
});

app.post('/chat/token', async (req, res, next) => {
    const identity = req.body.identity;

    let name = await checkToken(identity);
    const accessToken = new AccessToken(config.twilio.accountSid, config.twilio.apiKey, config.twilio.apiSecret);
    const chatGrant = new ChatGrant({
        serviceSid: config.twilio.chatServiceSid,
        endpointId: `${name}:browser`
    });
    console.log("Service SID" + config.twilio.chatServiceSid);
    accessToken.addGrant(chatGrant);
    accessToken.identity = name;
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify({
        token: accessToken.toJwt(),
        identity: name
    }));

    console.log("Sent response");

    // newNode[uid] = true;
    // let membersRef = roomRef.child("members").child(uid).set(true).then(() => {
    // });
});


app.post('/video/token', async (req, res, next) => {
    const identity = req.body.identity;
    const room = req.body.room;
    let name = await checkToken(identity);
    console.log("Get token for video for " + identity + " " + name)
    if (!name) {
        res.error();
    }
    let query = new Parse.Query("BreakoutRoom");
    let roomData = await query.get(room);
    let newNode = {};
    if (!roomData) {
        res.error();
    }
    if (!roomData.get('twilioID')) {
        membersCache[room] = 0;
        try {
            let twilioRoom = await client.video.rooms.create({
                uniqueName: room,
                // type: "peer-to-peer", //TESTING
                statusCallback: `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/roomCallback`
            });
            roomData.set("twilioID", twilioRoom.sid);
            await roomData.save();
        } catch (err) {
            // console.log(err);
            //maybe was already created
            roomData = await query.get(room);
            if (!roomData.get('twilioID')) {
                await client.video.rooms(room).update({status: 'completed'}); //Make sure twilio doesn't still think this room is going
                return next(err);
            }
        }
    }
    const token = videoToken(name, roomData.get('twilioID'), config);
    console.log("Sent response" + token);
    sendTokenResponse(token, roomData.get('title'), res);

    // newNode[uid] = true;
    // let membersRef = roomRef.child("members").child(uid).set(true).then(() => {
    // });
});

//Make sure that every channel in Twilio exists in Parse
client.chat.services(config.twilio.chatServiceSid).channels.list().then(function(channels) {
    if(channels){
        channels.forEach(async (channel)=>{
            let Channel = Parse.Object.extend("ChatRoom");
            let query = new Parse.Query(Channel);
            query.equalTo("chatSID", channel.sid);
            const res = await query.first();
            if(!res){
                console.log("Creating new: ")
                console.log(channel);
                let newChan = new Channel();
                newChan.set("chatSID", channel.sid);
                newChan.set("title", channel.uniqueName);
                newChan.set("friendlyname", channel.friendlyName);
                await newChan.save();
            }
        })
    }
    // for (let i = 0; i < paginator.items.length; i++) {
    //     const channel = paginator.items[i];
    //     console.log('Channel: ' + channel.friendlyName);
    // }
});


//Make sure that all of the breakout rooms are cleaned up
let query = new Parse.Query("BreakoutRoom");
query.find().then(async (rooms) => {
    if (rooms) {
        let keys = Object.keys(rooms);
        for (let i = 0; i < keys.length; i++) {
            let roomID = keys[i];
            let room = rooms[roomID];
            if (!room.get('twilioID')) {
                await room.destroy();
            } else {
                if (room.get('twilioID').startsWith("demo")) {
                    continue;
                }
                //Check twilio to see if still live
                let twRoom = await client.video.rooms(room.get('twilioID')).fetch();
                if (twRoom.status == 'completed') {
                    await room.destroy();
                } else {
                    //Need to update the members count?
                    let participants = await client.video.rooms(room.get('twilioID')).participants.list();
                    let activeParticipants = 0;
                    participants.forEach((p) => {
                        if (p.status == 'connected')
                            activeParticipants++;
                    })
                    console.log(room.get('twilioID') + " found to have " + activeParticipants);
                    membersCache[roomID] = activeParticipants;
                    if (activeParticipants == 0) {
                        await room.destroy();
                        await client.video.rooms(room.get('twilioID')).update({status: 'completed'}); //Make sure twilio doesn't still think this room is going
                    }
                    let newMmebersArray = room.get("members");

                    //TODO should also make sure to sync up the list of participants
                }
            }
        }
    }
});

app.listen(3001, () =>
    console.log('Express server is running on localhost:3001')
);
