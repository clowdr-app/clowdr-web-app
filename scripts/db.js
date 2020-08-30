const Parse = require('parse/node');
const fs = require('fs');
const path = require('path'); 
const { exec } = require('child_process');

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;
Parse.Cloud.useMasterKey();

const defaultText = `
<div>
            <h2>XYZ LIVE @ CLOWDR</h2>
            <div><p><strong>What to do during virtual XYZ:</strong> Besides attending the live sessions, you can interact with other participants in many ways!</p>
            <ul>
                <li>Chat and ask questions during the talks in the live rooms, and upvote existing questions. Questions will be answered, live, at the end of each talk.
                    Don't be shy about chatting during the talks: not only it will not be disruptive, but it will make the presenters feel the presence of the audience!
                </li>
                <li>Continue the conversation with the presenters by locating the papers in the Exhibit Hall, and using the paper-specific text channels.</li>
                <li>If you are a presenter, consider starting a video chat right after your session, so others can talk to you.</li>
                <li>If you are a senior member of the community, consider volunteering for one-on-one or small group mentoring sessions. Meet up with younger people 
                    either in one of the existing video chat rooms or in your own video room.</li>
                <li>If you'd like to organize an informal public gathering, create one using the "Create a new video chat" button (please give it a meaningful name!), and announce it in
                    the Lobby.</li>
                <li> If you're just looking for casual conversation, feel free to drop into one of the "hallway track" rooms anytime. Or head to an empty Public Hangout room 
                    and see who else shows up.  You can also set your status to let people know what you're up to. </li>
            </ul>
            </div>
            <div><p><strong>Code of Conduct</strong>: Remember to adhere to
            the <a href="https://www.acm.org/special-interest-groups/volunteer-resources/officers-manual/policy-against-discrimination-and-harassment" rel="noopener noreferrer" target="_blank">
                ACM Policy Against Harassment</a> at all times. If you observe or are subject to innapropriate conduct, call it out:</p>
                <ul>
                    <li>Use the red "report" icon in video chats</li>
                    <li>Send a direct message to the organizers</li>
                </ul>
            </div>
            <p><b><a href="https://www.clowdr.org/" rel="noopener noreferrer" target="_blank">CLOWDR</a></b> is a community-driven effort to create a new platform to
                support <b>C</b>onferences <b>L</b>ocated <b>O</b>nline <b>W</b>ith <b>D</b>igital <b>R</b>esources. (Also, a clowder
                is <a href="https://www.merriam-webster.com/dictionary/clowder" rel="noopener noreferrer" target="_blank">a group of cats</a> &#128049;).
                CLOWDR is created by <a href="https://jonbell.net" rel="noopener noreferrer" target="_blank">Jonathan Bell</a>, <a href="https://www.ics.uci.edu/~lopes/" rel="noopener noreferrer" target="_blank">Crista Lopes</a> and <a href="https://www.cis.upenn.edu/~bcpierce/" rel="noopener noreferrer" target="_blank">Benjamin Pierce</a>.
                If you are interested in helping <a href="https://github.com/clowdr-app/clowdr-web-app"  rel="noopener noreferrer" target="_blank">develop CLOWDR</a> or using it for your live event, please <a href="mailto:hello@clowdr.org">email us</a>.
                We have built this tool extremely quickly (starting on May 19, 2020), so please
                be gentle - there are a lot more features that we plan to add, and rough corners to polish.
            </p>
            <h3>THANK YOU TO OUR SPONSORS!</h3>
            <img width="200" src="https://www.nsf.gov/news/mmg/media/images/nsf_logo_f_efcc8036-20dc-422d-ba0b-d4b64d352b4d.jpg"/>
</div>`;


// First, read the schema version number from the db
const Version = Parse.Object.extend('Version');
let q = new Parse.Query(Version);
q.first().then(version => {
    if (!version) { // Does not exist. This is the initial setup
        let cmd = "";
        if (process.env.MONGODB_PASSWORD) {
            cmd = `mongorestore --host ${process.env.MONGODB_HOST} --username admin --password ${process.env.MONGODB_PASSWORD} --db ${process.env.MONGODB_DB} ./db/schema-base`;
        }
        else {
            cmd = `mongorestore --host ${process.env.MONGODB_HOST} --db ${process.env.MONGODB_DB} ./db/schema-base`;
        }

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
                    addRequiredData();
                });
            }
        });
    }
    else { // Already exists
        let v = version.get('version'); // Latest version number
        console.log('Applying migrations from version ' + v);
        fs.readdirSync('./db')
                      .filter(file => ((file.match(/^\d/)) && (path.extname(file) === '.js')))
                      .sort()
                      .forEach(f => {
                          let name = f.slice(0, -4); // without the extension
                          let n = parseInt(name);
                          if (n > v) {
                            console.log('Executing migration number ' + n);
                            const migration = require(f);
                            migration.migrate();
                          }
                      });
    }
    
}).catch(err => console.error(err));

async function addRequiredData() {
    console.log('Adding required data');

    let Instance = Parse.Object.extend('ClowdrInstance');
    let instance = new Instance();
    instance.set('conferenceName', 'XYZ');
    instance.set('shortName', 'xyz');
    instance.set('isInitialized', true);
    instance.set('adminName', "Clowdr Admin");
    instance.set('adminEmail', "clowdr@localhost");

    let data = fs.readFileSync('art/clowdr-logo.png');     
    let base64Image = new Buffer(data, 'binary').toString('base64');
    let file = new Parse.File('clowdr-logo.png', {base64: base64Image});
    await file.save();
    instance.set('headerImage', file);

    instance.set("landingPage", defaultText)

    let acl = new Parse.ACL();
    acl.setPublicWriteAccess(false);
    acl.setPublicReadAccess(true);
    acl.setRoleWriteAccess(instance.id+"-admin", true);
    acl.setRoleReadAccess(instance.id+"-admin", true);
    instance.setACL(acl);

    instance.save().then(async i => {
        await activate(i);
    }).catch(err => console.log('Instance saved:' + err));

}

// This is very similar  to an existing cloud function, but it's too much of a hassle to
// class it from here. So copy-paste-tweak.
async function activate(instance) {

    let SocialSpace = Parse.Object.extend('SocialSpace');
    let ss = new SocialSpace();
    ss.set('conference', instance);
    ss.set('name', 'Lobby');
    ss.set('isGlobal', true);
    try {
        await ss.save({}, {useMasterKey: true})
        console.log('Lobby created successfully');
    } catch(err) {
         console.log('SocialSpace: ' + err)
    };

    // Check if the user already exists
    let userQ = new Parse.Query(Parse.User);
    userQ.equalTo("email", instance.get("adminEmail"));
    let user = await userQ.first({useMasterKey: true});
    if (!user) {
        console.log("[activate]: user not found. Creating it " + instance.get("adminEmail"));
        user = new Parse.User();
        user.set('username', instance.get("adminName"));
        user.set('password', 'admin');
        user.set('email', instance.get("adminEmail"))
        user.set('passwordSet', true);
        user = await user.signUp({}, {useMasterKey: true});
    } else {
        console.log(`[activate]: user ${instance.get("adminEmail")} already exists. Updating`);
    }

    user.save({}, {useMasterKey: true}).then(async (u) => {
        console.log(`[activate]: user ${u.get("email")} saved`);
        let UserProfile = Parse.Object.extend('UserProfile');
        let userprofile = new UserProfile();
        userprofile.set('realName', instance.get("adminName"));
        userprofile.set('displayName', instance.get("adminName"));
        userprofile.set('user', u);
        userprofile.set('conference', instance);

        let profileACL = new Parse.ACL();
        profileACL.setRoleReadAccess(instance.id + "-conference", true);
        profileACL.setWriteAccess(user, true);
        userprofile.setACL(profileACL);
        userprofile = await userprofile.save({}, {useMasterKey: true});

        userprofile.save({}, {useMasterKey: true}).then(async up => {
            console.log(`[activate]: user profile ${up.get("realName")} saved`);

            let profiles = u.relation('profiles');
            profiles.add(up);
            let u2 = await u.save();

            const roleACL = new Parse.ACL();
            roleACL.setPublicReadAccess(true);
            roleACL.setPublicWriteAccess(false);
            roleACL.setWriteAccess(instance.id+"-admin", true);
            let roleNames = [instance.id + '-admin', instance.id + '-manager', instance.id + '-conference', 'ClowdrSysAdmin']
            let roles = [];

            roleNames.forEach(r => {
                let role = new Parse.Role(r, roleACL);
                let users = role.relation('users');
                users.add(u2);
                roles.push(role);
            });

            try {
                await Parse.Object.saveAll(roles, {useMasterKey: true});
                console.log('[activate]: Roles created successfully');

            } catch(err) {
                console.log('Roles saved: ' + err);
            }

            let userACL = u2.getACL();
            if(!userACL)
                userACL = new Parse.ACL();
            userACL.setPublicReadAccess(false);
            userACL.setPublicWriteAccess(false);
            userACL.setWriteAccess(user.id, true);
            userACL.setReadAccess(user.id, true);
            userACL.setRoleReadAccess(instance.id + "-manager", true);
            userACL.setRoleReadAccess("ClowdrSysAdmin", true);
            u2.setACL(userACL);
            await u2.save({}, {useMasterKey: true});
            console.log('User ACL saved successfully');

        });    
    });
}
