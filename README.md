1. Fork/download this project
2. Install npm and MongoDB
3. Create an app in back4app
4. Set up the env variables in .env file and .env-db file according to the .env-example and .env-db-example, respectively.
The parameters can be found: Server Settings -> Core Settings
You can find the MongoDB Database URI there. xxx is the password, yyy is the database ID in the following example.
mongodb://admin:xxx@mongodb.back4app.com:27017/yyy?ssl=true
5. Populate the database
     > npm run init-app
6. In the app created in back4app, turn on live queries on some tables. LiveVideos / LiveVideoWatchers/BreakoutRoom in Server Settings -> Web Hosting and Live Query
7. Add an entry to the ClowdrInstanceAccess table
Go to the ClowdrInstance table. Double-click on the objecId of that row and copy it to clipboard and then go to the ClowdrInstanceAccess table and add a new row. Double-click on the instance field of the new row and paste that objectId.
Go to the ClowdrInstance table, double-click on the field called isIncludeAllFeatures and switch it to true
8. Run
    > npm start