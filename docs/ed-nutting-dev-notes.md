# Back4App

## "Invalid function" - Cloud Code functions not found

If you find that in-browser you receive the error "Invalid function" when making
a REST API request, this may be caused by Back4App (silently) failing to load
the uploaded Cloud Code properly.

To determine if this is the case, go to Back4App's Cloud Code Functions. Click
on Logs. Scroll back to when you see "The server is listening on port 3000".
Just prior to that there may be an error such as:

```
Error: Cannot find module 'moment-timezone'
Require stack:
- /usr/src/app/data/cloud/program.js
- /usr/src/app/data/cloud/main.js
- /usr/src/app/cloudCodeWrapper.js
- /usr/src/app/node_modules/parse-server/lib/ParseServer.js
- /usr/src/app/node_modules/parse-server/lib/index.js
- /usr/src/app/src/back/app.js
- /usr/src/app/src/back/server.js
- /usr/src/app/src/back/index.js
- /usr/src/app/index.js
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:623:15)
    at Function.Module._load (internal/modules/cjs/loader.js:527:27)
    at Module.require (internal/modules/cjs/loader.js:681:19)
    at require (internal/modules/cjs/helpers.js:16:16)
    at Object.<anonymous> (/usr/src/app/data/cloud/program.js:8:14)
    at Module._compile (internal/modules/cjs/loader.js:774:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:785:10)
    at Module.load (internal/modules/cjs/loader.js:641:32)
    at Function.Module._load (internal/modules/cjs/loader.js:556:12)
    at Module.require (internal/modules/cjs/loader.js:681:19)
    at require (internal/modules/cjs/helpers.js:16:16)
    at Object.<anonymous> (/usr/src/app/data/cloud/main.js:3:1)
    at Module._compile (internal/modules/cjs/loader.js:774:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:785:10)
    at Module.load (internal/modules/cjs/loader.js:641:32)
    at Function.Module._load (internal/modules/cjs/loader.js:556:12)
```

In the above example, `package.json` had not been uploaded to Cloud Code and
needed to be so the relevant module could be found during loading. After
uploading `package.json`, it defaults into the `public` folder, so it is
necessary to click and drag it into the `cloud` folder. [See also this
page.](https://help.back4app.com/hc/en-us/articles/360002038772-How-to-install-an-NPM-module-at-Back4App-)

Back4App has a nasty fail-unsafe behaviour: it will enable whatever code it
succeeded in loading up to the failure point, and ignore everything else (so
some stuff will work, and some won't).

## Twilio: Invalid Access Token issuer/subject

This may be a symptom of the Twilio "User Updated" callback not working properly.
To fix:

1. Stop all your running services - i.e. shutdown clowdr-web-app and
   clowdr-backend locally.
1. Ensure you've carefully followed the directions for configuring
   clowdr-web-app environment variables.
1. Ensure you've carefully followed the directions for configuring the cloudr-backend
   and Twilio API correctly.
    * Hint: In the WebHooks configuration for Twilio Programmable Chat, there
      are two sections: "Pre-Event Webhooks" and "Post-Event Webhooks". We want
      the "Post-Event Webhooks" `onUserUpdated` - NOT `onUserUpdate` from the
      "Pre-Event Webhooks"!
    * Anytime you change the Twilio config, it's important to stop the cloudr
      services locally, restart the cloudr-backend, then restart the
      cloudr-web-app. Then log back in and it should work again.

[See also this Twilio documentation](https://www.twilio.com/docs/api/errors/20103).
