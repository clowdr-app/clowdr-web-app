import React from 'react';

const ProgramContext = React.createContext({
    rooms: [],
    tracks: [],
    items: [],
    sessions: [],
    onDownload: () => {},
    downloaded: false
});

export default ProgramContext;
