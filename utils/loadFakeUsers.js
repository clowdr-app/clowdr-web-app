var admin = require("firebase-admin");
const fs = require("fs");

var serviceAccount = require("../server/virtualconf-35e45-firebase-adminsdk-omcmk-679e332055.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://virtualconf-35e45.firebaseio.com"
});

let data = JSON.parse(fs.readFileSync("../data/confero.json"));
console.log(Object.keys(data));

let usersRef = admin.database().ref("users");
let statusRef = admin.database().ref("status");
let i = 0;
data.People.forEach((person)=>{
    if(person.URLphoto) {
        // usersRef.child("demo" + i).set({
        //     email: "demo@no-reply.com",
        //     username: person.Name,
        //     photoURL: person.URLphoto
        // });

        statusRef.child("demo"+i).child("last_changed").set(100+i);
        i++;
    }

})
