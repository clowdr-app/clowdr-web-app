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
needed to be so the relevant module could be found during loading.

Back4App has a nasty fail-unsafe behaviour: it will enable whatever code it
succeeded in loading up to the failure point, and ignore everything else (so
some stuff will work, and some won't).
