import React from 'react';

const ProgramContext = React.createContext({
    rooms: [],
    tracks: [],
    items: [],
    sessions: [],
    people: [],
    onDownload: () => {},
    downloaded: false
});

export default ProgramContext;
