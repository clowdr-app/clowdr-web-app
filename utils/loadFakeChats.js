const fs = require("fs");
const Parse = require("parse/node");
require('dotenv').config()

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = 'https://parseapi.back4app.com/'

let data = JSON.parse(fs.readFileSync("data/confero.json"));
console.log(Object.keys(data));
let topics = [];
data.Sessions.forEach((item) => {
    let title = item.Title;
    if (title.startsWith("Paper Presentations:")) {
        topics.push(title.replace("Paper Presentations: ", "").replace(" 1", "").replace(" 2", ""));
    }
});
let roomNames = [];
// roomNames.push("PLDI 2020 Planning");
roomNames.push("Registration Desk")
roomNames.push("Coffee Machine")
roomNames.push("Cats of ICSE");
roomNames.push("New Student Hangout");
roomNames.push("New Faculty Chats");
roomNames.push("Snack Room")
// roomNames.push("ICSE 2022 Discussion")
topics.forEach((topic) => {
    let rand = Math.random();
    if (rand < 0.2)
        roomNames.push("Future of " + topic);
    else if (rand < 0.4)
        roomNames.push("Open topics in " + topic);
    else if (rand < 0.7)
        roomNames.push(topic + " ML");
    else if (rand < 0.8)
        roomNames.push("Science of " + topic);
    else
        roomNames.push("ML + " + topic);
});

function randomMembership(users, keysToPop) {
    let numberMembers = 4 + Math.random() * 15;
    let ret = [];
    console.log(keysToPop);
    for (let i = 0; i < numberMembers && i < keysToPop.length; i++) {
        let key = keysToPop.pop();
        while (!users[key])
            key = keysToPop.pop();
        ret.push(users[key]);
    }
    console.log("OK")
    return ret;
}

async function fn() {
    let confQ = new Parse.Query("ClowdrInstance");
    confQ.equalTo("conferenceName", "ClowdrTest");
    let conf = await confQ.first();

    let query = new Parse.Query("UserProfile");
    query.equalTo("conference", conf);
    query.limit(1000);

    let i = 0;
    let users = await query.find({ useMasterKey: true });
    let keysToPop = [];
    for (let i = 0; i < users.length; i++) {
        keysToPop.push(i);
    }
    keysToPop.sort(function (a, b) {
        return 0.5 - Math.random()
    })
    // console.log(randomMembership(users));
    let breakoutRooms = {};
    roomNames.forEach((name) => {
        if (i < 80 && keysToPop.length > 0) {
            var Room = Parse.Object.extend("BreakoutRoom");
            var room = new Room();
            room.set("twilioID", "demo" + i);
            room.set("title", name);
            room.set("description", "");
            room.set("members", randomMembership(users, keysToPop));
            room.set("conference", conf);
            room.set("persistence", "persistent");
            room.set("visibility", "listed")
            room.save().then((val) => {
            }).catch(err => {
                console.error(err);

            })
        }
        // console.log(room);
        i++;
    });
    console.log("OK, doing big set");
    // await roomsRef.set(breakoutRooms);
    console.log("DOne")
}


fn();
