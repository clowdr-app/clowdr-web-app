// tslint:disable:no-console

const fs = require('fs');
const fsExtra = require('fs-extra')
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const BSON = require('bson');
const path = require('path');

dotenv.config();

if (!process.env.MONGODB_HOST.includes("localhost")) {
    throw new Error("Don't run this against a production database - it obliterates everything!");
}

let dbSchemaPackagePath = path.dirname(require.resolve("@clowdr-app/clowdr-db-schema/package.json"));
let schemaDirPath = "./db/schema-base";
let testDirPath = "./db/test";

fsExtra.removeSync(schemaDirPath);
fsExtra.copySync(path.join(dbSchemaPackagePath, schemaDirPath), schemaDirPath, { overwrite: false, errorOnExist: true });

if (!fs.existsSync(testDirPath)) {
    fs.mkdirSync(testDirPath);
}
else {
    fsExtra.emptyDirSync(testDirPath);
}

let schemaFilePaths = fs.readdirSync(schemaDirPath);
for (let schemaFilePath of schemaFilePaths) {
    let tableName = schemaFilePath.replace(/\.json/i, "");
    if (tableName.includes("meta")) {
        console.log(schemaFilePath);
        fs.copyFileSync(
            `${schemaDirPath}/${schemaFilePath}`,
            `${testDirPath}/${schemaFilePath}`
        );
    }
    else {
        let JSONStr = fs.readFileSync(`${schemaDirPath}/${schemaFilePath}`, 'UTF-8');
        const JSONLines = JSONStr.split(/\r?\n/);
        if (JSONLines.length > 0 && JSONLines[0].length > 0) {
            console.log(schemaFilePath);

            let data;
            JSONLines.forEach(JSONLine => {
                if (JSONLine.length > 0) {
                    let obj = JSON.parse(JSONLine);
                    let datas = BSON.serialize(obj);
                    if (data) {
                        data = Buffer.concat([datas, data]);
                    }
                    else {
                        data = datas;
                    }
                }
            });

            fs.writeFileSync(
                `${testDirPath}/${tableName}.bson`,
                data
            );
        }
    }
}

let db = process.env.MONGODB_DB;
let host = process.env.MONGODB_HOST;

let cmd = { cmd: "", args: [] };
if (process.env.MONGODB_PASSWORD) {
    cmd = {
        cmd: `mongorestore`,
        args: [
            "--host", host,
            "--username", "admin",
            "--password", process.env.MONGODB_PASSWORD,
            "--db", db,
            `${testDirPath} /`
        ]
    }
}
else {
    cmd = {
        cmd: `mongorestore`,
        args: [
            "--host", host,
            "--db", db,
            `${testDirPath}/`
        ]
    }
}

let dropDBProcess = spawn(
    `mongo`,
    [
        `--host`, host,
        db,
        `--eval`, "db.dropDatabase()"],
    { stdio: 'inherit', stderr: 'inherit' });

dropDBProcess.on("error", (err) => {
    console.error(`DB drop error! ${err.toString()}`);
});

dropDBProcess.on("exit", (code) => {
    if (code) {
        console.error("===============================");
        console.error(`DB drop failed! Error code: ${code}`);
        console.error("===============================");
    }
    else {
        console.log("===============================");
        console.log('DB drop succeeded.');
        console.log("===============================");
        console.log('> ' + cmd);
        let dbRestoreProcess = spawn(cmd.cmd, cmd.args, { stdio: 'inherit', stderr: 'inherit' });

        dbRestoreProcess.on("error", (err) => {
            console.error(`DB drop error! ${err.toString()}`);
        });

        dbRestoreProcess.on("exit", (code2) => {
            if (code2) {
                console.error("===============================");
                console.error(`DB restore failed! Error code: ${code2}`);
                console.error("===============================");
            }
            else {
                console.log("===============================");
                console.log('DB restore succeeded.');
                console.log("===============================");
            }
        });
    }
});
