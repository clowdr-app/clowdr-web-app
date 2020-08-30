var admin = require("firebase-admin");
const fs = require("fs");
var { google } = require('googleapis');

var serviceAccount = require("../server/virtualconf-35e45-firebase-adminsdk-omcmk-679e332055.json");
var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://virtualconf-35e45.firebaseio.com"
});

let videosRef = admin.database().ref("videos");
let i = 0;
console.log(API_KEY);
var youtube = google.youtube({
    version: 'v3',
    auth: API_KEY
});

youtube.playlists.list({
    channelId: 'UC-OYsfhNAmwQH3Y0IGDdOnQ',
    part: "snippet,contentDetails,id"
}).then((v) => {
    v.data.items.forEach(async (item) => {
        let id = item.id;
        let title = item.snippet.title;
        await videosRef.child(id).set({ 'title': title });
        youtube.playlistItems.list({ playlistId: id, part: "snippet" }).then((p) => {
            p.data.items.forEach(async (item) => {
                console.log(id);
                await videosRef.child(id).child('videos').child(item.snippet.resourceId.videoId).set(
                    {
                        title: item.snippet.title,
                        published_at: new Date(item.snippet.publishedAt).valueOf()
                    },
                    (err) => {
                        console.error(err);
                    });
                // console.log(JSON.stringify(item.snippet,null,'\t')) ;
            })
        });
    });
}).catch(e => {
    console.log(e);
});


