import React from 'react';
import Parse from "parse";

import ProgramContext from './context';

// Used to make sure the download is done only once
var program = undefined;

const withProgram = Component => {
    class Program extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                rooms: [], 
                tracks: [],
                items: [],
                sessions: [],
                people: [],
                onDownload: this.downloadProgram.bind(this),
                downloaded: false
            };
            console.log('[withProgram]: onDownload ' + this.state.onDownload);
            console.log('[withProgram]: auth ' + this.props.auth);
        }

        downloadProgram(props) {
            console.log('[withProgram]: Downloading program ' + props.auth);
            if (props.auth) {
                if (!this.state.downloaded) {
                    let trackQ = new Parse.Query("ProgramTrack");
                    trackQ.equalTo("conference", props.auth.currentConference);
                    trackQ.find().then(res => {
                        this.setState({tracks: res});
                        console.log('[withProgram]: Tracks downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload tracks: ' + err);
                        this.setState({tracks: []});
                    });
                    this.subscribeToLiveQuery(trackQ, 'tracks');

                    let roomQ = new Parse.Query("ProgramRoom");
                    roomQ.equalTo("conference", props.auth.currentConference);
                    roomQ.find().then(res => {
                        this.setState({rooms: res});
                        console.log('[withProgram]: Rooms downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload rooms: ' + err);
                        this.setState({rooms: []});
                    });
                    this.subscribeToLiveQuery(roomQ, 'rooms');

                    let itemQ = new Parse.Query("ProgramItem");
                    itemQ.equalTo("conference", props.auth.currentConference);
                    itemQ.limit(10000);
                    itemQ.find().then(res => {
                        this.setState({items: res});
                        console.log('[withProgram]: Items downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload items: ' + err);
                        this.setState({items: []});
                    });
                    this.subscribeToLiveQuery(itemQ, 'items');

                    let sessionQ = new Parse.Query("ProgramSession");
                    sessionQ.equalTo("conference", props.auth.currentConference);
                    sessionQ.limit(10000);
                    sessionQ.addAscending("startTime");
                    sessionQ.find().then(res => {
                        this.setState({sessions: res});
                        console.log('[withProgram]: Sessions downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload sessions: ' + err);
                        this.setState({sessions: []});
                    });
                    this.subscribeToLiveQuery(sessionQ, 'sessions');

                    let peopleQ = new Parse.Query("ProgramPerson");
                    peopleQ.limit(10000);
                    peopleQ.find().then(res => {
                        this.setState({people: res});
                        console.log('[withProgram]: People downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload people: ' + err);
                        this.setState({people: []});
                    });

                    this.setState({
                        downloaded: true
                    });

                }
                else {
                    console.log('[withProgram]: Program is already cached');
                }
            }
            else 
                console.log('[withProgram]: No auth no good!');
        }    

        subscribeToLiveQuery(query, ppart) {
            console.log('[withProgram]: subscribing to live query for ' + ppart);
            query.subscribe().then(sub => {
                this.sub = sub;
                this.sub.on('create', obj => {
                    console.log("[withProgram]: object created " + (obj.get('name') ? obj.get('name') : obj.get('title')));
                    this.setState((prevState) => prevState[ppart] = [...prevState[ppart], obj]);
                })
                this.sub.on('delete', obj => {
                    console.log("[withProgram]: object deleted " + (obj.get('name') ? obj.get('name') : obj.get('title')));
                    this.setState((prevState) => (prevState[ppart] = prevState[ppart].filter(v => v.id != obj.id)));
                });
                this.sub.on('update', obj => {
                    console.log("[withProgram]: object updated " + (obj.get('name') ? obj.get('name') : obj.get('title')));
                });
            });
        }

        render() {
            return (
                <ProgramContext.Provider value={this.state} >
                    <Component />
                </ProgramContext.Provider>
            );

        }
    }

    return Program;
};

export default withProgram;
