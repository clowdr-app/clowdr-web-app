var admin = require("firebase-admin");
const fs = require("fs");

var serviceAccount = require("../server/virtualconf-35e45-firebase-adminsdk-omcmk-679e332055.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://virtualconf-35e45.firebaseio.com"
});

let data = JSON.parse(fs.readFileSync("../data/confero.json"));
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
roomNames.push("Snack Room")
roomNames.push("ICSE 2022 Discussion")
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
let usersRef = admin.database().ref("users");
let roomsRef = admin.database().ref("breakoutRooms");

function randomMembership(users) {
    let keys = Object.keys(users);
    let numberMembers = 4 + Math.random() * 15;
    let ret = {};
    for (let i = 0; i < numberMembers; i++) {
        let k = Math.floor(Math.random() * keys.length);
        while (!users[keys[k]] || !keys[k])
            k = Math.floor(Math.random() * keys.length);
        ret[keys[k]] = true;
        users[keys[k]] = undefined;
    }
    return ret;
}

async function fn() {
    let i = 0;
    let val = await usersRef.once("value");
    let users = val.val();
    // console.log(randomMembership(users));
    let breakoutRooms = {};
    roomNames.forEach((name) => {
        let room =
            {
                twilioID: 'demo' + i,
                title: name,
                description: '',
                members: randomMembership(users)
            }
        if (i < 80) {
            console.log(room);
            breakoutRooms[room.twilioID] = room;
            // roomsRef.child(room.twilioID).set(room).then(() => {
            //     roomsRef.child(room.twilioID).child("members").set(randomMembership(users)).catch((err)=>{
            //         console.log(err);
            //     });
            //     console.log("OK")
            // }).catch((err) => {
            //     console.log(err);
            // })
        }
        // console.log(room);
        i++;
    });
    console.log("OK, doing big set");
    await roomsRef.set(breakoutRooms);
    console.log("DOne")
}

fn();
