/* global Parse */
// ^ for eslint

const { validateRequest } = require("./utils");

/**
 * All the information needed to initialise a fresh conference.
 */
const createConferenceRequestSchema = {
    conference: {
        // Conference
        name: "string",
        shortName: "string",
        welcomeText: "string",

        // Privileged Conference Details
        loggedInText: "string",
    },
    admin: {
        // User
        username: "string",
        password: "string",
        email: "string",

        // User Profile
        realName: "string",
        pronouns: "[string]",
        displayName: "string",
        country: "string",
    }
};

Parse.Cloud.job("conference-create", async (request) => {
    const { params, headers, log, message } = request;

    message("Starting...");

    let requestValidation = validateRequest(createConferenceRequestSchema, params);
    if (requestValidation.ok) {
        message("Creating conference");

        // TODO: Create the conference
        const conference = new Parse.Object("Conference");
        conference.set({
            name: request.conference.name,

        });

        // TODO: Initialise roles
        // TODO: Initialise empty flair
        // TODO: Initialise admin flair
        // TODO: Initialise moderator flair
        // TODO: Initialise LOGGED_IN_TEXT

        // TODO: Initialise admin user
        // TODO: Initialise admin user profile

        // TODO: Initialise Twilio sub account
        // TODO: Initialise Twilio Programmable Chat Service
        // TODO: Initialise Twilio Programmable Video Service
        // TODO: Initialise Twilio Chat roles
        // TODO: Initialise Twilio Video roles

        // TODO: Initialise announcements channel
        // TODO: Initialise auto-subscribe to text chats

        // TODO Later: Can we initialise SendGrid?
    }
    else {
        console.error("ERROR: " + requestValidation.error);
        message(requestValidation.error);
        throw new Error(requestValidation.error);
    }
});
