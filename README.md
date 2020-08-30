# Clowdr
else is watching the same content. We were unable to find a technology platform

Clowdr is an open source tool suite to make it easier to run interactive and
engaging virtual conferences. Imagine that your conference attendees could
video and text chat with each other and easily drift between different
conversations in different rooms. Now imagine that this app also integrated
your conference program (directly imported from conf.researchr.org), and let
attendees see who else is watching the same content. We were unable to find a
technology platform that allowed for these interactions, so we built Clowdr.

This repository contains the source code for the Clowdr web app.

# Information for Conference Participants

See the
[User Manual](https://docs.google.com/document/d/1S-pNNqjA4RjQ8fn2i1Z2998VFn9bSwV4adOTpHw0BIo/edit#heading=h.dhd7xqg6t0qm)
for instructions on how to use Clowdr as a conference participant.

# Information for Conference Organizers

Please see the
[Clowdr Conference Organizer's Manual](https://docs.google.com/document/d/1-9Rbt3KnPYUTO2cz-rAPhczw8pkozbWMaBGzfPAT5Lo)
for instructions and answers to frequently asked questions about running Clowdr.

If you are interested in using Clowdr for your event, there is no need for
you to download any code or run your own server (unless you want to!). We can
host your backend server for free; the only costs to your conference are for
streaming video (you'll need accounts with Zoom and Twilio). Clowdr has been
battle-tested by thousands of users already this year at
[PLDI](https://pldi20.sigplan.org/),
[ICSE](https://2020.icse-conferences.org/) and
[ISSTA](https://conf.researchr.org/home/issta-2020). In August,
[VL/HCC](https://conf.researchr.org/home/vlhcc2020) and
[ICFP](https://icfp20.sigplan.org/) plan to use Clowdr. As we gain deployment
experience, we hope to offer conference organizers a one-click installation
of Clowdr. However, in the meantime, if you are considering Clowdr for your
virtual conference, please email us at
[hello@clowdr.org](mailto:hello@clowdr.org) and we can provide a demo and
deployment for your conference.

# Information for Developers

If you are only interested in making UI changes for a currently running
conference, you can simply ask one of the developers for a copy of their
`.env` file and get started quickly. Once the `.env` file is at the root of
the repository, run

```
npm install
npm start
```

If you want a local version of CLOWDR for real development, read on.

This repository contains the source code for the "web app" component of the
Clowdr platform -- i.e., the user-interface code that runs in each client
browser. These instructions assume you have this repository cloned on your
system.

top-level `clowdr-web-app` directory.
These instructions will walk you through the process of getting CLOWDR up and
running locally. The process is broken into three main steps:

1. Setting up the parse server.
2. Configuring the CLOWDR frontend.
3. Configuring external services.
4. Setting up the CLOWDR backend.

We highly recommend you run Clowdr in a Mac or Linux environment. The
instructions below assume so. If you are on Windows, install
[WSL](https://docs.microsoft.com/en-us/windows/wsl/install-win10), and run
everything from there.

## Setting up the Parse Server

Clowdr uses the [Parse Platform](https://docs.parseplatform.org/js/guide/)
as the backend. The fastest way of getting this set up is to sign up for
free app hosting in [Back4App](https://www.back4app.com/) and
create an app space for Clowdr with any name you like.

1. Sign up for Back4App. This is the service that hosts the parse database.
1. Create a new app.
1. Once in the app, go to Server Settings > Core Settings. You will need
   various keys on this page.
1. Copy `.env-example` as `.env` and update the fields accordingly.
1. Run `npm install -g parse-server mongodb-runner parse-dashboard`.
1. Make sure MongoDB is installed on your system.
   Although you do not have to run MongoDB when using Back4App, you will need to
   install mongodb in your local computer in order to initialize Clowdr.
   Installing MongoDB locally is used only for calling the `mongodbrestore`
   command that sets up the database schema with the right permissions. Install
   [MongoDB](https://docs.mongodb.com/manual/administration/install-community/).
1. Start the parse server:
   ```
   parse-server \
      --port 4000 \
      --appId APP_ID \
      --clientKey CLIENT_KEY \
      --masterKey MASTER_KEY \
      --javascriptKey JS_KEY \
      --restAPIKey REST_API_KEY \
      --databaseURI mongodb://localhost/clowdr \
      --liveQueryServerOptions "{ \"classNames\": [\"BondedChannel\",\"BreakoutRoom\",\"ClowdrInstance\",\"Flair\",\"LiveActivity\",\"ProgramItem\",\"ProgramRoom\",\"ProgramSession\",\"ProgramTrack\",\"TwilioChannelMirror\",\"UserPresence\",\"UserProfile\"] }" \
      --cloud ./backend/cloud/main.js
   ```
1. Run parse dashboard:
   ```
   parse-dashboard \
      --port 4001 \
      --dev \
      --appId APP_ID \
      --masterKey MASTER_KEY \
      --serverURL http://localhost:4000/parse \
      --appName clowdr
   ```
1. Open `http://localhost:4001` in a browser. Select the
   `InstanceConfiguration` table, and click on the security icon on the
   top-right. Click "Class Level Permissions". Double check that Public read and
   write are unchecked, then add the role name `ClowdrSysAdmin` (press the enter
   key after typing this word), and check both Read and Write permissions for
   this role. Click save.
1. You can now close the dashboard, but leave the parse server running.

## Configuring the CLOWDR Front-end

1. At the top level of the repository, run `npm install`.
1. Run `cd backend/cloud && npm install`.
1. Run `npm run init-app` while the server is running to initialize the database.
   - At the time of writing, the script hangs after "User ACL saved
     successfully" but succeeds. (Hit CTRL-C to exit.)
   - After this command runs, you should be able to see all tables with some
     essential data stored in the database in Back4App. For verification, please
     check the ClowdrInstance table -- there should be one row there for a
     conference instance named XYZ. Check also the UserProfile table, and verify
     that there is one row there for user Clowdr Admin. You can check the few
     other tables that have data on them.
1. You should now be able to start the front-end with `npm start`. This may take a while.

## Configuring External Services

For this step you will need to enter the CLOWDR interface using
USERNAME: clowdr@localhost
PASSWORD: admin

Navigate to Administration > Conference Configuration. You will need to add
various API keys and tokens to this interface. (Make sure to hit SAVE after
each token.)

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
| `FRONTEND_URL`            | For development, this is just `http://localhost:3000`.                                  |

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

### Zoon

To use zoom embedding, you need to create a JWT app on Zoom, and set the instance
configuration variables `ZOOM_API_KEY` and `ZOOM_API_SECRET` with the values from
Zoom.

## Configuring the CLOWDR Back-end

1. Clone the (CLOWDR backend)[https://github.com/clowdr-app/clowdr-backend].
1. Run `npm install` in the backend directory.
1. Run `ln -s "../clowdr-web-app/.env" .env` to link the `.env` file.
1. Run `npm start`.

Now you can hit "Initialize Conference" in CLOWDR and begin using the app.

## Further Setup

The following steps only need to be taken when deploying your own instance of CLOWDR.

#### Set Up Hosting and Live Query

From the app created in back4app, turn on live queries for the tables in the
image below by going to Server Settings -> Web Hosting and Live Query:

![Live Query tables](art/LiveQuery.png?raw=true "Live Query Tables")

Also check the Activate Back4App hosting box, and make sure the subdomain
name you give it, `YOUR_APP_NAME` matches the environment variable
`REACT_APP_PARSE_DOMAIN=wss://YOUR_APP_NAME.back4app.io` in your .env file.

#### Cloud Functions

Deploying the cloud functions requires the installation of the [Back2App
console client](https://www.back4app.com/docs/platform/parse-cli). Follow the
instructions there. Clowdr's cloud code can be found under the folder
`backend`; both of the subfolders in there must be deployed to Back4App. If,
during the setup of the b4a CLI, you get an error saying that it can't use
the existing `backend` folder, create a parallel `back4app` folder under the
clowdr-web-app, and copy the two subfolders of `backend`, and their entire
contents, there. Then, before deploying, change to `back4app/cloud` and do
`npm init`. After this, you can do `b4a deploy`.

# Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Join us on the Slack [CLOWDR](clowdr.slack.com) workspace!
