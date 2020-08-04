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
    sidebarWidth: '260',
    sidebarMobileHeight: '90',
});
