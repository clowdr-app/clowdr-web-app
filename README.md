# Clowdr
Clowdr is an open source tool suite to make it easier to run interactive and engaging virtual conferences. Imagine that your conference attendees could video and text chat with each other and easily drift between different conversations in different rooms. Now imagine that this app also integrated your conference program (directly imported from conf.researchr.org), and let attendees see who else is watching the same content. We were unable to find a technology platform that allowed for these interactions, so we built Clowdr.

This repository contains the source code for the Clowdr web app.

# Information for Conference Participants

See the [User
Manual](https://docs.google.com/document/d/1S-pNNqjA4RjQ8fn2i1Z2998VFn9bSwV4adOTpHw0BIo/edit#heading=h.dhd7xqg6t0qm)
for instructions on how to use Clowdr as a conference participant.

# Information for Conference Organizers

Please see the [Clowdr Conference Organizer's
Manual](https://docs.google.com/document/d/1-9Rbt3KnPYUTO2cz-rAPhczw8pkozbWMaBGzfPAT5Lo)
for instructions and answers to frequently asked questions about running
Clowdr.

If you are interested
in using Clowdr for your event, there is no need for you to download any
code or run your own server (unless you want to!). We can host your backend
server for free; the only costs to your conference are for streaming video (you'll need accounts with Zoom and Twilio). Clowdr has been battle-tested by thousands of users already this year at [PLDI](https://pldi20.sigplan.org/), [ICSE](https://2020.icse-conferences.org/) and [ISSTA](https://conf.researchr.org/home/issta-2020). In August, [VL/HCC](https://conf.researchr.org/home/vlhcc2020) and [ICFP](https://icfp20.sigplan.org/) plan to use Clowdr. As we gain deployment experience, we hope to offer conference organizers a one-click installation of Clowdr. However, in the meantime, if you are considering Clowdr for your virtual conference, please email us at [hello@clowdr.org](mailto:hello@clowdr.org) and we can provide a demo and deployment for your conference.

# Information for Developers

This repository contains the source code for the "web app" component of the
Clowdr platform -- i.e., the user-interface code that runs in each client
browser.  

## Front-End Setup

If you only want to make changes to the user interface, then this is the
only repo you need.  You can serve the code from your local copy of this
repo directly to your web browser and connect to a remote back end for an
existing conference.  

However, if you are only going to run the front end code, you will need to
get some secret keys for some running instance of the Clowdr back end from
whoever owns it.  Specifically, you need settings for the following variables:
```
REACT_APP_PARSE_APP_ID=
REACT_APP_PARSE_JS_KEY=
REACT_APP_PARSE_DOMAIN=
REACT_APP_TWILIO_CALLBACK_URL=
REACT_APP_PARSE_DATABASE_URL=
REACT_APP_DEFAULT_CONFERENCE=
```

(We highly recommend you run Clowdr in a Mac or Linux environment. The
instructions below assume so. If you are on Windows, install
[WSL](https://docs.microsoft.com/en-us/windows/wsl/install-win10), and run
everything from there.)

First, clone this repo:
```bash
   git clone app/clowdr-web-app.git
   cd clowdr-web-app
```

Next, install the secret keys you've been given in a file called `.env` in
the top-level `clowdr-web-app` directory.

Then use npm (the Node.js package manager) to install or upgrade all
dependencies.

```bash
   npm install
```

Finally start the web app like this:
```bash
   npm start
```
This should open a web browser window and connect to the Clowdr instance
described in your `.env` profile.

## Back-End Setup

If you want to run a complete Clowdr system locally (e.g., to help develop
functionality that requires changes to the database schema), you will need
some more pieces.

Clowdr uses the [Parse Platform](https://docs.parseplatform.org/js/guide/)
as the backend. The fastest way of getting this set up is to sign up for
free app hosting in [Back4App](https://www.back4app.com/) and
create an app space for Clowdr with any name you like. The instructions
here assume you have done so.

Although you do not have to run MongoDB when using Back4App, you will need to install mongodb in your local computer in order to initialize Clowdr. Installing MongoDB locally is used only for calling the `mongodbrestore` command that sets up the database schema with the right permissions. Install [MongoDB](https://docs.mongodb.com/manual/administration/install-community/).

### Environment variables

Next, set up your own configuration in ./.env according to ./.env-example.
The configuration parameters can be found from your created app in Back4App
(in Server Settings -> Core Settings). When you come to the mongodb
configuration variables, `MONGODB_PASSWORD` and `MONGODB_DB`, find the
"MongoDB Database URI" in Back4App core server settings, which looks like
this:

`mongodb://admin:XXX@mongodb.back4app.com:27017/YYY?ssl=true`

Use XXX as the MONGODB_PASSWORD, YYY as MONGODB_DB.

@Jon/@Crista: Some Instructions about the MONGODB_HOST var would be useful

### Populate the Database

Run the following script to add and initialize a minimal database:

```bash
$ npm run init-app
```

After this command runs, you should be able to see all tables with some essential data stored in the database in Back4App.

@Jon/@Crista: Pressing tab in my browser (safari) selected the URL bar at the top!
right arrow might have worked.

Select the `InstanceConfiguration` table, and click on the security icon on the top-right (a shield-like icon). Double check that Public read and write are unchecked, then add the role name `ClowdrSysAdmin` (press the tab key after typing this word), and check both Read and Write permissions for this role. Click save.

#### Set Up Hosting and Live Query

From the app created in back4app, turn on live queries for the tables in the
image below by going to Server Settings -> Web Hosting and Live Query:

![Live Query tables](art/LiveQuery.png?raw=true "Live Query Tables")

Also check the Activate Back4App hosting box, and make sure the subdomain
name you give it, `YOUR_APP_NAME` matches the environment variable
`REACT_APP_PARSE_DOMAIN=wss://YOUR_APP_NAME.back4app.io` in your .env file.

#### Cloud Functions

Go to Cloud Code (also called "Cloud Code Functions") in your Back4App
workspace, upload all files with .js extension under backend/cloud, and click "deploy".

#### Developing and Debugging Cloud Functions
It's *much* easier to debug and develop cloud functions by running a local parse server, so that changes to cloud code just require restarting your local server. I don't know how to make it work with live query or with uploaded files - this should be doable, but I haven't found the magic strings yet. However, this is sufficient for testing cloud functions that don't involve files.

To run a local parse server:

1. Install the correct version of parse-server (we are currently on 3.9.0): `npm install -g parse-server@3.9.0
`
2. Run `npm install` in the `backend/cloud` directory
3. Start the server, using the same keys that you would otherwise use on Back4App. Get the correct keys by logging into your Back4App console, then got to "Server Settings" -> "Core Settings." Copy and paste the app id, client key, master key, database URI and javascript key: `parse-server --appId <appID> --clientKey <clientKey> --masterKey <masterKey> --databaseURI <mongoDB URI>  --javascriptKey <javascriptKey> --cloud /path/to/backend/cloud/main.js`
4. In your `.env.development` set `REACT_APP_PARSE_DATABASE_URL=http://localhost:1337/parse`, then do `npm start` to start the frontend.
5. As you change your cloud functions, stop (control-C) and restart the parse server.

## Usage and Further Configuration

After the installation, start the application by executing

```bash
$ npm start
```

This will pop up a tab in your default browser and from there you can log into the website using the login credentials:

`clowdr@localhost / admin`

@Jon/@Crista: Should we mention that it will come up looking like ICSE?

### Set up Zoom for your test conference
To use zoom embedding, you need to create a JWT app on Zoom, and set the instance
configuration variables `ZOOM_API_KEY` and `ZOOM_API_SECRET` with the values from
Zoom.

### Set up Twilio for your test conference

Clowdr uses Twilio as the text and video chat service. Please go to
[Twilio](https://www.twilio.com/),  create an account there, and create an
API key/secret. (Select API Keys on the left under settings.)

@Jon/@Crista: What friendly name?

Once you login into Clowdr with the admin account, go to Administration->Conference Configuration to enter the Twilio credentials for chat. You must enter, at least the following configuration variables:

| Config Value | Description |
| ------------ | ----------- |
| `TWILIO_ACCOUNT_SID` | [Your primary Twilio account identifier](https://www.twilio.com/console).|
|`TWILIO_API_KEY` | [Used to authenticate](https://www.twilio.com/console/dev-tools/api-keys).|
|`TWILIO_API_SECRET` | [Used to authenticate](https://www.twilio.com/console/dev-tools/api-keys).|
|`TWILIO_AUTH_TOKEN`|[Used to authenticate](https://www.twilio.com/console/dev-tools/api-keys).|
|`TWILIO_CHAT_SERVICE_SID` | [Chat](https://www.twilio.com/console/chat/services)|
|`FRONTEND_URL` | http://localhost:3000, for development|

(Don't press Initialize Conference yet!)

### Set up email (Sendgrid) for your test conference

Clowdr uses Sendgrid to deliver emails to conference participants. Please go to [Sendgrid](https://sendgrid.com/), create an account there, and create a Web API, and a key for it. Make sure to set up a verified sender address (or domain), for example you+clowdr@gmail.com or any other email address that is yours and that will be used as the sender of your Clowdr installation's emails. Sendgrid will ask you to verify it before you can send emails via their API.

Then add the following additional configuration variables in Clowdr:

| Config Value | Description |
| ------------ | ----------- |
|`SENDGRID_API_KEY`| Your sendgrid API key|
|`SENDGRID_SENDER`| Your verified sender address|

After entering all these variables, press the big red button for initializing the conference, and logout.

### Backend Setup

From here on, you must also run the [backend](https://github.com/clowdr-app/clowdr-backend) server. Follow the instructions there.

After running the token server, login to your Clowdr app again. This time,
you should see two additional panels, one on the left side and one on the
right side, both related to text and video chat.

Setup complete!!

# Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Join us on the Slack [CLOWDR](clowdr.slack.com) workspace!
