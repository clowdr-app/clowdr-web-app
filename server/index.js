const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const {videoToken} = require('./tokens');
var cors = require('cors')
var admin = require("firebase-admin");

const client = require('twilio')(config.accountSid, config.token);

var serviceAccount = require("./virtualconf-35e45-firebase-adminsdk-omcmk-679e332055.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://virtualconf-35e45.firebaseio.com"
});
const app = express();
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(pino);

let roomsRef = admin.database().ref("breakoutRooms");

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
    let room = req.body.RoomName;
    if(req.body.StatusCallbackEvent =='participant-connected'){
        let uid = req.body.ParticipantIdentity.substring(0,req.body.ParticipantIdentity.indexOf(":"));
        let newUser = await roomsRef.child(req.body.RoomName).child("members").child(uid).set(true);
        console.log("Added " + req.body.ParticipantIdentity + " to " + room + " count is now " + membersCache[room]);

        membersCache[req.body.RoomName]++;
    }else if(req.body.StatusCallbackEvent == 'participant-disconnected'){
        let uid = req.body.ParticipantIdentity.substring(0,req.body.ParticipantIdentity.indexOf(":"));
        let membersRef = roomsRef.child(room).child("members");
        let newUser = await membersRef.child(uid).remove();
        membersCache[room]--;
        console.log("Removed " + req.body.ParticipantIdentity + " from " + room + " count is now " + membersCache[room]);
        if(membersCache[room] <= 0)
        {
            setTimeout(async (twilioID, firebaseID)=>{
                console.log("timeout was hit" + membersCache[firebaseID]);
                //Delete the room
                if(membersCache[firebaseID] == -100)
                    return;
                if(membersCache[firebaseID] <= 0) {
                    try {
                        await client.video.rooms(twilioID).update({status: 'completed'});
                        await admin.database().ref("breakoutRooms").child(firebaseID).remove();
                    }catch(err){
                        console.log(err);
                    }
                    console.log("Done");
                    membersCache[firebaseID] = -100;
                }
            }, 5*1000, req.body.RoomSid, room);
        }
    }
    res.send();
})

app.post('/video/token', async (req, res, next) => {
    const identity = req.body.identity;
    const room = req.body.room;
    let roomRef = roomsRef.child(room);
    let decodedToken = await admin.auth().verifyIdToken(identity);
    let uid = decodedToken.uid;
    //now get username to give to twilio
    let uname = await admin.database().ref("users/").child(uid).child("username").once('value');
    let name = uid + ":" + uname.val();

    let val = await roomRef.once('value');
    let roomData = val.val();
    let newNode = {};
    if(!roomData){
        res.error();
    }
    if (!roomData.twilioID) {
        membersCache[room] = 0;
        try {
            let twilioRoom = await client.video.rooms.create({
                uniqueName: room,
                // type: "peer-to-peer", //TESTING
                statusCallback: "https://a9ffd588.ngrok.io/roomCallback"
            });
            await roomRef.update({'twilioID': twilioRoom.sid});
        } catch (err) {
            // console.log(err);
            //maybe was already created
            val = await roomRef.once('value');
            roomData = val.val();
            if (!roomData.twilioID) {
                await client.video.rooms(room).update({status: 'completed'}); //Make sure twilio doesn't still think this room is going
                return next(err);
            }
        }
    }
    const token = videoToken(name, roomData.twilioID, config);
    console.log("Sent response");
    sendTokenResponse(token, roomData.title, res);

    // newNode[uid] = true;
    // let membersRef = roomRef.child("members").child(uid).set(true).then(() => {
    // });
});

/*
TODO: we should populate the current counts of each room here
 */
roomsRef.once("value").then(async (val)=>{
    let rooms = val.val();
    if(rooms) {
        let keys = Object.keys(rooms);
        for(let i = 0; i < keys.length; i++){
            let roomID = keys[i];
            let room = rooms[roomID];
            if(!room.twilioID){
                await roomsRef.child(roomID).remove();
            }
            else{
                if(room.twilioID.startsWith("demo")){
                    continue;
                }
                //Check twilio to see if still live
                let twRoom = await client.video.rooms(room.twilioID).fetch();
                if(twRoom.status == 'completed'){
                    await roomsRef.child(roomID).remove();
                }
                else{
                    //Need to update the members count?
                    let participants = await client.video.rooms(room.twilioID).participants.list();
                    let activeParticipants = 0;
                    participants.forEach((p)=>{
                        if(p.status == 'connected')
                            activeParticipants++;
                    })
                    console.log(room.twilioID + " found to have " + activeParticipants);
                    membersCache[roomID] = activeParticipants;
                    if(activeParticipants == 0){
                        await roomsRef.child(roomID).remove();
                        await client.video.rooms(room.twilioID).update({status: 'completed'}); //Make sure twilio doesn't still think this room is going
                    }
                }
            }
        }
    }
});


app.listen(3001, () =>
    console.log('Express server is running on localhost:3001')
);
