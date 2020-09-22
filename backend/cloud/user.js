/* global Parse */
// ^ for eslint

Parse.Cloud.define("user-create", async (request) => {
    // Validate: email, conference

    // If: user already exists by the supplied email address
    // Then: validate their password matches
    //       If: they don't already have a profile for this conference
    //       Then: create a new user profile for the specificed conference and log them in
    //       Else: Log them in and redirect to the profile page, with a message telling them so
    // Else: create a new user, set their password, send the verification email
    //       and create a new profile for the specificed conference

    // Overrides: Only log them in if their email is verified
    return false;
});
