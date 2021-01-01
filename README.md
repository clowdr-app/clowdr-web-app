# [Deprecated] Clowdr

Versions 0 through 2 of Clowdr live(d) in this repository, which we're keeping here
for anyone using it. The new development of Clowdr is over in the
[clowdr repo](https://github.com/clowdr-app/clowdr).

Suggestions and relevant contributions and issues from this repository will gradually
be carried over into the new repository as we progress the redevelopment.

---

Clowdr is an open source tool suite to make it easier to run interactive and
engaging virtual conferences. Imagine that your conference attendees could video
and text chat with each other and easily drift between different conversations
in different rooms. Now imagine that this app also integrated your conference
program (directly imported from conf.researchr.org), and let attendees see who
else is watching the same content. We were unable to find a technology platform
that allowed for these interactions, so we built Clowdr.

This repository contains the source code for the Clowdr web app.

# Information for Conference Participants

See the [User
Manual](https://docs.google.com/document/d/1S-pNNqjA4RjQ8fn2i1Z2998VFn9bSwV4adOTpHw0BIo/edit#heading=h.dhd7xqg6t0qm)
for instructions on how to use Clowdr as a conference participant.

# Information for Conference Organizers

Please see the [Clowdr Conference Organizer's
Manual](https://docs.google.com/document/d/1-9Rbt3KnPYUTO2cz-rAPhczw8pkozbWMaBGzfPAT5Lo)
for instructions and answers to frequently asked questions about running Clowdr.

If you are interested in using Clowdr for your event, there is no need for you
to download any code or run your own server (unless you want to!). We can host
your backend server for free; the only costs to your conference are for
streaming video (you'll need accounts with Zoom and Twilio). Clowdr has been
battle-tested by thousands of users already this year at
[PLDI](https://pldi20.sigplan.org/), [ICSE](https://2020.icse-conferences.org/)
and [ISSTA](https://conf.researchr.org/home/issta-2020). In August,
[VL/HCC](https://conf.researchr.org/home/vlhcc2020) and
[ICFP](https://icfp20.sigplan.org/) plan to use Clowdr. As we gain deployment
experience, we hope to offer conference organizers a one-click installation of
Clowdr. However, in the meantime, if you are considering Clowdr for your virtual
conference, please email us at [hello@clowdr.org](mailto:hello@clowdr.org) and
we can provide a demo and deployment for your conference.

# Information for Developers

If you are looking for the most stable version, use the `stable` branch. If you
want the latest code, which may or may not be stable and/or properly documented,
use the `dev` branch.

Clowdr uses the [Parse Platform](https://docs.parseplatform.org/js/guide/) as
the backend. You can run this on your local machine for development.

We provide scripts which generate data sets for you to test against, as well as
an automated test suite. Please try to follow the principles of TDD - it helps
us make sure things work first time, every time. It also enables us to rapidly
see what you change and whether it's safe for us to merge.

In order to test video/chat/email features of Clowdr, you will need to set up
Twilio and SendGrid accounts. This is optional. If you just want to tweak some
part of the UI not related to video/chat/email, then you don't need to set these
up.

## Standalone front-end setup (for development/testing)

1. Make sure
   [MongoDB](https://docs.mongodb.com/manual/administration/install-community/)
   and [MongoDB Database
   Tools](https://www.mongodb.com/try/download/database-tools) (both) are
   installed on your system.
    - Mongo is the database used by Parse. We create a local datastore called
      `clowdr` by default which is populated with the test data.
    - You will need
      [MongoDB](https://docs.mongodb.com/manual/administration/install-community/)
      installed to run the database.
    - You will also need the [MongoDB Database
      Tools](https://www.mongodb.com/try/download/database-tools) which are a
      separate download that includes the `mongodbrestore` utility.
1. Run `npm install -g parse-server parse-dashboard mongodb-runner`.
    - `parse-server`: The backend framework
    - `parse-dashboard`: Service utility to view Parse Server configuration and
      data
    - `mongodb-runner`: Provides easier access to `mongodb` commands
1. Clone [clowdr-web-app](https://github.com/clowdr-app/clowdr-web-app) - our
   Parse-based backend and React frontend
1. Clone [clowdr-backend](https://github.com/clowdr-app/clowdr-backend) - our
   plain Node backend for Twilio callbacks
1. Within `clowdr-web-app`, run `npm install`
1. Within `clowdr-web-app/backend/cloud`, run `npm install`
1. Within `clowdr-backend`, run `npm install`
1. Start the parse server.

    Run this command from within `clowdr-web-app`:

    ```
    parse-server \
       --port 4000 \
       --appId XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
       --clientKey XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
       --masterKey XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
       --javascriptKey XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
       --restAPIKey XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
       --databaseURI mongodb://localhost/clowdr \
       --liveQuery "{ \"classNames\": [\"AttachmentType\",\"Conference\",\"ConferenceConfiguration\",\"ContentFeed\",\"Flair\",\"PrivilegedConferenceDetails\",\"ProgramPerson\",\"ProgramItem\",\"ProgramItemAttachment\",\"ProgramSession\",\"ProgramSessionEvent\",\"ProgramTrack\",\"Sponsor\",\"SponsorContent\",\"TextChat\",\"TextChatMessage\",\"UserProfile\",\"VideoRoom\",\"YouTubeFeed\",\"ZoomRoom\",\"WatchedItems\"] }" \
       --startLiveQueryServer \
       --allowCustomObjectId \
       --cloud ./backend/cloud/main.js
    ```

    - **Don't worry**: The "XXX..." are supposed to be like that and you **don't
      need to replace them for testing**.
    - This is our main backend. It runs the Parse REST API and our additional
      API functions, from the scripts in `clowdr-web-app/backend/cloud/`.
    - The option `allowCustomObjectId` is necessary for the test data setup. _Do
      not use it in production._
    - You can also append the option `--verbose` to debug failing requests. This
      is particularly useful for debugging `Object not found` and permission
      related issues.

1. Run parse dashboard.

    Run this command (in any folder):

    ```
    parse-dashboard \
       --port 4001 \
       --dev \
       --appId XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
       --masterKey XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
       --serverURL http://localhost:4000/parse \
       --appName clowdr
    ```

    - **Don't worry**: The "XXX..." are supposed to be like that and you **don't
      need to replace them for testing**.

1. Open `http://localhost:4001` in a browser. You should see the Parse
   Dashboard.
1. You can now close (/stop) the dashboard, but leave the Parse Server running.
1. Create an environment configuration file:
    1. Make a copy `.env.dev` within `clowdr-web-app`
    1. Rename the copy to `.env`
    1. That's it, no further customisation is required for local development.
1. Ensure `mongo`, `mongodump` and `mongorestore` are on your PATH.
1. From within `clowdr-web-app`, run `npm run init-test-data`
1. From within `clowdr-web-app`, run `npm start`. This may take a while.
1. If all went well, you will (eventually - it can take minutes!) end up
   with a browser tab showing you a test instance of Clowdr.

## Configuring External Services

For this step you will need to enter the CLOWDR interface using:

    EMAIL:    clowdr@sys.admin
    PASSWORD: admin

Navigate to Administration > Conference Configuration. You will need to add
various API keys and tokens to this interface. (Make sure to hit SAVE after each
token.)

**NOTE** DO NOT hit "Initialize Conference" now. The backend is required first.

### Twilio

Clowdr uses Twilio as the text and video chat service.

1. Go to [Twilio](https://www.twilio.com/), and create an account.
1. Create an API key/secret. (Select API Keys on the left under settings.)
1. Set these configuration values accordingly.

| Config Value              | Description                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`      | Visible on the account dashboard.                                                       |
| `TWILIO_API_KEY`          | The SID of the new API key you created.                                                 |
| `TWILIO_API_SECRET`       | The secret for the API key you created.                                                 |
| `TWILIO_AUTH_TOKEN`       | Visible on the account dashboard.                                                       |
| `TWILIO_CHAT_SERVICE_SID` | Under "..." on the left, go to "Programmable Chat". Create a chat service. Use its SID. |
| `REACT_APP_FRONTEND_URL`  | For development, this is just `http://localhost:3000`.                                  |

### Sendgrid

Clowdr uses Sendgrid to deliver emails to conference participants.

1. Go to [Sendgrid](https://sendgrid.com/), and create an account.
1. Create a Web API, and a key for it.
1. Set up a verified sender address (or domain), for example
   you+clowdr@gmail.com or any other email address _that is yours_. That will be
   used as the sender of your Clowdr installation's emails. Sendgrid will ask
   you to verify it before you can send emails via their API.
1. Fill in the appropriate configuration values.

| Config Value       | Description                   |
| ------------------ | ----------------------------- |
| `SENDGRID_API_KEY` | Your sendgrid API key.        |
| `SENDGRID_SENDER`  | Your verified sender address. |

### Zoom

To use zoom embedding, you need to create a JWT app on Zoom, and set the
instance configuration variables `ZOOM_API_KEY` and `ZOOM_API_SECRET` with the
values from Zoom.

## Configuring the CLOWDR Back-end

1. Clone the [CLOWDR backend](https://github.com/clowdr-app/clowdr-backend).
1. Run `npm install` in the backend directory.
1. Run `ln -s "../clowdr-web-app/.env" .env` to link the `.env` file.
1. Run `npm start`.

Now you can hit "Initialize Conference" in CLOWDR and begin using the app.

## Further Setup

The following steps only need to be taken when deploying your own instance of
CLOWDR.

#### Set Up Hosting and Live Query

From the app created in back4app, turn on live queries for the tables in the
image below by going to Server Settings -> Web Hosting and Live Query:

![Live Query tables](art/LiveQuery.png?raw=true "Live Query Tables")

Also check the Activate Back4App hosting box, and make sure the subdomain name
you give it, `YOUR_APP_NAME` matches the environment variable
`REACT_APP_PARSE_DOMAIN=wss://YOUR_APP_NAME.back4app.io` in your .env file.

#### Cloud Functions

Deploying the cloud functions requires the installation of the [Back2App console
client](https://www.back4app.com/docs/platform/parse-cli). Follow the
instructions there. Clowdr's cloud code can be found under the folder `backend`;
both of the subfolders in there must be deployed to Back4App. If, during the
setup of the b4a CLI, you get an error saying that it can't use the existing
`backend` folder, create a parallel `back4app` folder under the clowdr-web-app,
and copy the two subfolders of `backend`, and their entire contents, there.
Then, before deploying, change to `back4app/cloud` and do `npm init`. After
this, you can do `b4a deploy`.

# Contributing

Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change.

Join us on the Slack [CLOWDR](clowdr.slack.com) workspace!

# Licences

## Twemoji

Copyright 2020 Twitter, Inc and other contributors
Code licensed under the MIT License: http://opensource.org/licenses/MIT
Graphics licensed under CC-BY 4.0: https://creativecommons.org/licenses/by/4.0/
