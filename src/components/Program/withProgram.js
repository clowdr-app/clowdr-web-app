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
                        console.log('Tracks downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload tracks: ' + err);
                        this.setState({tracks: []});
                    });

                    let roomQ = new Parse.Query("ProgramRoom");
                    roomQ.equalTo("conference", props.auth.currentConference);
                    roomQ.find().then(res => {
                        this.setState({rooms: res});
                        console.log('Rooms downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload rooms: ' + err);
                        this.setState({rooms: []});
                    });

                    let itemQ = new Parse.Query("ProgramItem");
                    itemQ.equalTo("conference", props.auth.currentConference);
                    itemQ.limit(10000);
                    itemQ.find().then(res => {
                        this.setState({items: res});
                        console.log('Items downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload items: ' + err);
                        this.setState({items: []});
                    });

                    let sessionQ = new Parse.Query("ProgramSession");
                    sessionQ.equalTo("conference", props.auth.currentConference);
                    sessionQ.limit(10000);
                    sessionQ.addAscending("startTime");
                    sessionQ.find().then(res => {
                        this.setState({sessions: res});
                        console.log('Sessions downloaded: ' + res.length);
                    }).catch(err => {
                        console.log('[withProgram]: Unable to dowload sessions: ' + err);
                        this.setState({sessions: []});
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
