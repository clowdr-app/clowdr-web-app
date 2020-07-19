# Clowdr

Clowdr is a project bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Installation

### Install all dependencies

Use npm to install (or upgrade) all dependencies after cloning.

```bash
npm install
```

### Set Up a Backend

Clowdr uses the [Parse Platform](https://docs.parseplatform.org/js/guide/)
as the backend. The fastest way of getting this set up is to sign up for
free app hosting in [Back4App](https://www.back4app.com/). The instructions
here assume you have done so.

BCP: Reordered this first, since the .env step needs information from this step.
Next, download and install
[MongoDB](https://docs.mongodb.com/manual/administration/install-community/)
and start the server.  Note that installing MongoDB is used for calling the
`mongodbrestore` command. You do not have to run MongoDB when using
Back4App.

For windows users, you MUST add environment variable to the PATH and make
sure that you could run `mongo` command in your CMD.  (BCP: Does that mean
"Run it in a shell?"  Which environment var?)

BCP: Don't understand this bit:
You can find the MongoDB Database URI there. xxx is the password, yyy is the database ID in the following example.

`mongodb://admin:XXX@mongodb.back4app.com:27017/YYY?ssl=true`

Finally, create an account on [Back4App](https://www.back4app.com/) and
create an app space for Clowdr with any name you like.

Set up your own configuration in ./.env according to ./.env-example (both
files are in this directory).  The configuration parameters can be found
from your created app in Back4App (in Server Settings -> Core Settings).

### Populate the Database

Run the following script to add initialized a minimal database:

```bash
npm run init-app
```

You should be able to see all tables being added with some essential data stored in the database.

#### Set Up Hosting and Live Query

From the app created in back4app, turn on live queries for the following tables by going to Server Settings -> Web Hosting and Live Query:

![Live Query tables](art/LiveQuery.png?raw=true "Live Query Tables")

#### Cloud Functions

Go to Cloud Functions in your Back4App workspace, upload all js code under backend/cloud, and click "deploy".

#### Backend Setup

Additionally, you must to run the [backend](https://github.com/clowdr-app/clowdr-backend) server. Follow the instructions there.

## Usage and Further Configuration

After the installation, start the application by executing

```bash
npm start
```

This will pop up a tab in your default browser and from there you can log into the website using the login credentials:
clowdr@localhost / admin

When you want to exit, enter `ctrl + c`.

Once you login with the admin account, go to Administration->Conference Configuration to enter the Twilio credentials for chat. You must enter, at least the following configuration variables:

| Config Value | Description |
| ------------ | ----------- |
| `TWILIO_ACCOUNT_SID` | [Your primary Twilio account identifier](https://www.twilio.com/console).|
|`TWILIO_API_KEY` | [Used to authenticate](https://www.twilio.com/console/dev-tools/api-keys).|
|`TWILIO_API_SECRET` | [Used to authenticate](https://www.twilio.com/console/dev-tools/api-keys).|
|`TWILIO_CHAT_SERVICE_SID` | [Chat](https://www.twilio.com/console/chat/services)|
|`FRONTEND_URL` | http://localhost:3000, for development|

After entering these variables, press the big red button for initializing the conference. Assuming that succeeds, you should logout, and login again. This time, you should see two additional panels, one on the left side and one on the right side, both related to text and video chat.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Join us on the Slack [CLOWDR](clowdr.slack.com) workspace!
