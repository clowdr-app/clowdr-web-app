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
let programRef = admin.database().ref("program");
let i = 0;

//Event, Sessions, Items
console.log(Object.keys(data));
/*    {
      "Title": "Real-time Multi-user Spatial Collaboration using ARCore",
      "Type": "Talk",
      "Key": "mobilesoft-2020-student-research-competition/3",
      "URL": "https://2020.icse-conferences.org/details/mobilesoft-2020-student-research-competition/3/Real-time-Multi-user-Spatial-Collaboration-using-ARCore",
      "PersonsString": "DongxingCao ",
      "Authors": [
        "dongxingcao"
      ],
      "Affiliations": [
        "Kyungpook National University"
      ],
      "AffiliationsString": "Kyungpook National University",
      "Abstract": "This paper proposes a collaboration application that allows multi-user to add extra content to live video streaming, based on augmented reality annotation in real-time. Compared to the previous work, we think the integration of remote collaboration and a co-located collaborative way is one of the novelty points of the proposed application. The AR-based collaborative system can render annotations directly on an environment which helps local users easily recognize the original intention that the remote helper wants to deliver. We introduce how the application work."
    },*/

// data.Items.forEach(async (item) => {
//    let dat = {
//        'title': item.Title,
//        'type': item.Type,
//        'url': item.URL,
//        'abstract': item.Abstract
//    };
//    await programRef.child("items").child(item.Key.replace("/","-")).update(dat);
// });

console.log("Done with items");

data.Sessions.forEach(async (item)=>{
    let startTime = item.Time.substring(0,item.Time.indexOf('-'));
    let dateTime =  item.Day + " " + startTime;
    let dat ={
        'title': item.Title,
        'abstract': item.Abstract,
        'type': item.Type,
        'day': item.Day,
        'time': item.Time,
        'location': item.Location,
        'startTime': new Date(dateTime).valueOf()
    };
    item.Key = item.Key.replace("/","-");
    // await programRef.child("sessions").child(item.Key).update(dat);
    let items = {};
    let categories = {};
    if(item.Items) {
        item.Items.forEach((k) => {
            categories[k.substring(0,k.indexOf("/"))] = true;
            k = k.replace("/", "-");
            items[k] = true;
        });
        // await programRef.child("sessions").child(item.Key).child("items").set(items);
    }
    Object.keys(categories).forEach(async (v)=>{
        await programRef.child("categories").child("members").child(v).child(item.Key).set(true);
    })

});
console.log("Done");
// data.People.forEach((person)=>{
//     if(person.URLphoto) {
//         // usersRef.child("demo" + i).set({
//         //     email: "demo@no-reply.com",
//         //     username: person.Name,
//         //     photoURL: person.URLphoto
//         // });
//
//         statusRef.child("demo"+i).child("last_changed").set(100+i);
//         i++;
//     }
//
// })
