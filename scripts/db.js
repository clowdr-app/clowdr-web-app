const Parse = require('parse/node');
const fs = require('fs');
const path = require('path'); 
const { exec } = require('child_process');

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;
Parse.Cloud.useMasterKey();

// First, read the schema version number from the db
const Version = Parse.Object.extend('Version');
let q = new Parse.Query(Version);
q.first().then(version => {
    if (!version) { // Does not exist. This is the initial setup
        const cmd = `mongorestore --host ${process.env.MONGODB_HOST} --username admin --password ${process.env.MONGODB_PASSWORD} --db ${process.env.MONGODB_DB} ./db/schema-base`;
        console.log('> ' + cmd);
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.log(`stderr: ${stderr}`);
                const versionSchema = new Parse.Schema('Version');
                versionSchema.addNumber('version');
                versionSchema.save().then (result => {
                    version = new Version();
                    version.set("version", 0);
                    version.save().then(res => {
                        console.log("Schema version set to 0");
                    });
                }).catch(err => console.log('Version schema save: ' + err));
                addRequiredData();
            }
            else {
                console.log('DB import succeeded!');
            }
        });
    }
    else { // Already exists
        let v = version.get('version'); // Latest version number
        console.log('Applying migrations from version ' + v);
        fs.readdirSync('./db')
                      .filter(file => ((file.match(/^\d/)) && (path.extname(file) == '.js')))
                      .sort()
                      .map(f => {
                          let name = f.slice(0, -4); // without the extension
                          let n = parseInt(name);
                          if (n > v) {
                            console.log('Executing migration number ' + n);
                            const migration = require(f);
                            migration.migrate();
                          }
                      });
    }
    
}).catch(err => console.log(err));

async function addRequiredData() {
    console.log('Adding required data');
    let Instance = Parse.Object.extend('ClowdrInstance');
    let instance = new Instance();
    instance.set('conferenceName', 'XYZ');
    instance.set('shortName', 'xyz');
    instance.set('headerText', 'XYZ Conference');
    instance.set('isIncludeAllFeatures', true);
    instance.save().then(i => {
        let InstanceAccess = Parse.Object.extend('ClowdrInstanceAccess');
        let iaccess = new InstanceAccess();
        iaccess.set('instance', i);
        iaccess.save().catch(err => console.log('InstanceAccess saved: ' + err));
    
        let user = new Parse.User();
        user.set('username', 'admin');
        user.set('password', 'admin');
        user.save().then(u => {
            let UserProfile = Parse.Object.extend('UserProfile');
            let userprofile = new UserProfile();
            userprofile.set('realName', 'The Boss');
            userprofile.set('displayName', 'admin');
            userprofile.set('user', u);
            userprofile.set('conference', i);
            userprofile.save().then(up => {
                let profiles = u.relation('profiles');
                profiles.add(up);
                u.save().then(u2 => {
                    const roleACL = new Parse.ACL();
                    roleACL.setPublicReadAccess(true);
                    let role1 = new Parse.Role('ClowdrSysAdmin', roleACL);
                    let role2 = new Parse.Role(i.id+'-admin', roleACL);
                
                    let users1 = role1.relation('users');
                    users1.add(u2);
                    let users2 = role2.relation('users');
                    users2.add(u2);

                    let roles = [role1, role2];

                    Parse.Object.saveAll(roles)
                        .then(res => console.log('Roles created successfully'))
                        .catch(err => console.log('Roles saved: ' + err));

                }).catch(err => {console.log('User saved (again):' + err)}); 
            }).catch(err => console.log('UserProfile saved:' + err));    
        }).catch(err => console.log('User saved:' + err));
    }).catch(err => console.log('Instance saved:' + err));

}
