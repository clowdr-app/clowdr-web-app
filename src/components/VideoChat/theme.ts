import { createMuiTheme } from '@material-ui/core';


export default createMuiTheme({
    palette: {
        type: 'light',
        primary: {
            main: '#F22F46',
        },
    },
    // @ts-ignore    
    // @Jon: sidebarWidth doesn't seem to exist in the appropriate interface type
    //Jon: It came from twilio's starter kit, if it's deleted, does the video chat still work OK?
    sidebarWidth: '260',
    sidebarMobileHeight: '90',
});
