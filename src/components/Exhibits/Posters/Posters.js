import React from 'react';
import {Card, Spin, Tooltip} from 'antd';
import {AuthUserContext} from "../../Session";
import {ProgramContext} from "../../Program";
import placeholder from '../placeholder.png';

let TRACK = "icse-2020-poster";

class Posters extends React.Component {
    constructor(props) {
        super(props);
        console.log('Made it to posters');
        this.state = {
            posters: [],
            gotTracks: false,
            gotItems: false,
            gotPeople: false,
            loading: true
        }

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            this.state.posters = this.getPosters(this.props.items, this.props.tracks);
            this.state.loading = false;
        }
    
    }

    getPosters(items, tracks) {
        let posters = [];
        let track = tracks.find(t => t.get('name') == TRACK);
        if (track) {
            posters = items.filter(i => {
                return i.get("track") ? (i.get("track").id === track.id) : false
            });
            console.log(`[Posters]: number of posters in ${TRACK}: ${posters.length}`)
        }
        else
            console.log('[Posters]: track not found ' + TRACK);

        return posters;
    }

    componentDidMount() {
    }

    componentDidUpdate(prevProps) {
        console.log("[Posters]: Something changed");

        if (this.state.loading) {
            if (this.state.gotItems && this.state.gotTracks && this.state.gotPeople) {
                console.log('[Posters]: Program download complete');

                this.setState({
                    posters: this.getPosters(this.props.items, this.props.tracks),
                    loading: false
                });
            }
            else {
                console.log('[Posters]: Program still downloading...');
                if (prevProps.items.length != this.props.items.length) {
                    this.setState({gotItems: true});
                    console.log('[Posters]: got items');
                }
                if (prevProps.tracks.length != this.props.tracks.length) {
                    this.setState({gotTracks: true});
                    console.log('[Posters]: got tracks');
                }
                if (prevProps.people.length != this.props.people.length) {
                    this.setState({gotPeople: true});
                    console.log('[Posters]: got people');
                }
            }
        }
        else {
            console.log('[Posters]: Program cached');
        }
    }
    

    render() {

        const { Meta } = Card;

        if (this.props.downloaded) {
            return <div className={"space-align-container"}>
                    {this.state.posters.map((poster) => {
                        let authors = poster.get("authors");
                        let authorstr = authors.map(a => a.get('name')).join(", ");
                        return <div className={"space-align-block"} key={poster.id} >
                                    <Card hoverable style={{ width: 300 }} cover={<img alt="poster" style={{width:300, height:200 }} src={placeholder} />}>
                                        <Tooltip placement="topLeft" title={poster.get("title")} arrowPointAtCenter>
                                            <Meta title={poster.get('title')} description={authorstr} />
                                        </Tooltip>
                                    </Card>
                                </div>
                    })}
                </div> 
        }
        return (
            <Spin tip="Loading...">
            </Spin>)

    }
}

const PostersWithAuth = (props) => (
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <Posters {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} people={people} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>
);

export default PostersWithAuth;

