const config = require('./config');
var admin = require("firebase-admin");


var serviceAccount = require("./server/virtualconf-35e45-firebase-adminsdk-omcmk-679e332055.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://virtualconf-35e45.firebaseio.com"
});

let roomsRef = admin.database().ref("breakoutRooms");

let names = []
