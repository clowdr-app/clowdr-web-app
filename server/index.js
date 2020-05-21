const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')();
const {videoToken} = require('./tokens');
var cors = require('cors')
var admin = require("firebase-admin");

const ngrok = require('ngrok');
(async function() {
    const url = await ngrok.connect(3001);
})();


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

const sendTokenResponse = (token, res) => {
    res.set('Content-Type', 'application/json');
    res.send(
        JSON.stringify({
            token: token.toJwt()
        })
    );
};

app.post('/video/token', (req, res) => {
    const identity = req.body.identity;
    const room = req.body.room;
    let roomRef = admin.database().ref("breakoutRooms/" + room);
    admin.auth().verifyIdToken(identity)
        .then(function (decodedToken) {
            let uid = decodedToken.uid;
            //now get username to give to twilio
            admin.database().ref("users/").child(uid).child("username").once('value').then(
                (uname)=>{
                    let name = uname.val();
                    roomRef.once('value').then((val) => {
                        let roomData = val.val();
                        let newNode = {};
                        newNode[uid] = true;
                        let membersRef = roomRef.child("members").child(uid).set(true).then(() => {
                            const token = videoToken(name, roomData.title, config);
                            sendTokenResponse(token, res);
                        });
                    });
                }
            );


        }).catch(function (error) {
        // Handle error
    });

});

app.listen(3001, () =>
    console.log('Express server is running on localhost:3001')
);
