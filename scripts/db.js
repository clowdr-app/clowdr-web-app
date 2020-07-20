const Parse = require('parse/node');
const fs = require('fs');
const path = require('path'); 
const { exec } = require('child_process');
const { SSL_OP_ALL } = require('constants');

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
            }
            else {
                console.log('DB import succeeded!');
                version = new Version();
                version.set("version", 0);
                version.save().then(res => {
                    console.log("Schema version set to 0");
                });
                addRequiredData();
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

    let data = fs.readFileSync('art/clowdr-logo.png');     
    let base64Image = new Buffer(data, 'binary').toString('base64');
    let file = new Parse.File('clowdr-logo.png', {base64: base64Image});
    await file.save();
    instance.set('headerImage', file);

    instance.set('isIncludeAllFeatures', true);
    instance.save().then(async i => {
        let InstanceAccess = Parse.Object.extend('ClowdrInstanceAccess');
        let iaccess = new InstanceAccess();
        iaccess.set('instance', i);
        try {
            await iaccess.save();
            console.log('InstanceAccess created successfuly');
        } catch (err){
            console.log('InstanceAccess: ' + err)
        }

        let SocialSpace = Parse.Object.extend('SocialSpace');
        let ss = new SocialSpace();
        ss.set('conference', i);
        ss.set('name', 'Lobby');
        ss.set('isGlobal', true);
        try {
            await ss.save()
            console.log('Lobby created successfully');
        } catch(err) {
             console.log('SocialSpace: ' + err)
        };


        let user = new Parse.User();
        user.set('username', 'clowdr');
        user.set('password', 'admin');
        user.set('email', 'clowdr@localhost')
        user.set('passwordSet', true);
        user.save().then(u => {
            let UserProfile = Parse.Object.extend('UserProfile');
            let userprofile = new UserProfile();
            userprofile.set('realName', 'Clowdr Super Admin');
            userprofile.set('displayName', 'Clowdr Super Admin');
            userprofile.set('user', u);
            userprofile.set('conference', i);
            userprofile.save().then(up => {
                let profiles = u.relation('profiles');
                profiles.add(up);
                u.save().then(async u2 => {
                    const roleACL = new Parse.ACL();
                    roleACL.setPublicReadAccess(true);
                    let role1 = new Parse.Role('ClowdrSysAdmin', roleACL);
                    let role2 = new Parse.Role(i.id+'-admin', roleACL);
                
                    let users1 = role1.relation('users');
                    users1.add(u2);
                    let users2 = role2.relation('users');
                    users2.add(u2);

                    let roles = [role1, role2];

                    try {
                        await Parse.Object.saveAll(roles);
                        console.log('Roles created successfully');

                    } catch(err) {
                        console.log('Roles saved: ' + err);
                    }

                }).catch(err => {console.log('User saved (again):' + err)}); 
            }).catch(err => console.log('UserProfile saved:' + err));    
        }).catch(err => console.log('User saved:' + err));
    }).catch(err => console.log('Instance saved:' + err));

}
