# Clowdr

Clowdr is a project bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Installation

#### Install all dependencies

Use npm to install (or upgrade) all dependencies after cloning.

```bash
npm install
```

#### Set Up a Backend

Clowdr uses the [Parse Platform](https://docs.parseplatform.org/js/guide/) as the backend. The fastest way of getting this set up is to sign up for free app hosting in [Back4App](https://www.back4app.com/). The instructions here assume you do so.

Create an account on [Back4App](https://www.back4app.com/) and create an app space for Clowdr with any name you like.

Set up your own configurations in ./.env file and ./db/.env-db file according to the ./.env-example and ./db/.env-db-example, respectively.

The configuration parameters can be found from your created app in Back4App: Server Settings -> Core Settings

Additionally, download and install [MongoDB](https://docs.mongodb.com/manual/administration/install-community/) and start the server.
Note that installing MongoDB is used for calling the `mongodbrestore` command. You do not have to run MongoDB when using Back4App.
You can find the MongoDB Database URI there. xxx is the password, yyy is the database ID in the following example.

`mongodb://admin:xxx@mongodb.back4app.com:27017/yyy?ssl=true`

#### Populate the Database

Run the following script to add initialized a minimal database:

```bash
npm run init-app
```

You should be able to see all tables being added with some essential data stored in the database.

#### Set Up Hosting and Live Query

From the app created in back4app, turn on live queries for the following tables: LiveVideos /LiveVideoWatchers /BreakoutRoom, by going to Server Settings -> Web Hosting and Live Query


## Usage

After all installation, start the application by executing

```bash
npm start
```

It will pop up a tab in your default browser and from there you can log into the website using the login credentials:
admin@localhost / admin

When you want to exit, enter `ctrl + c`.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Join us on the Slack [CLOWDR](clowdr.slack.com) workspace!
