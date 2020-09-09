const Deployer = require('ssh-deploy-release');

const options = {
    localPath: 'build',
    host: 'clowdr.org',
    username: 'clowdr',
    deployPath: '/home/clowdr/icse2020.clowdr.org'
};

const deployer = new Deployer(options);
deployer.deployRelease(() => {
    console.log('Ok !')
});