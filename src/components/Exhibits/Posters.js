import React from 'react';
import {NavLink} from "react-router-dom";
import Parse from "parse";
import {Card, Spin, Tooltip, Button, Input, Upload} from 'antd';
import {DownloadOutlined, SettingOutlined, UploadOutlined} from '@ant-design/icons';
import {AuthUserContext} from "../Session";
import {ProgramContext} from "../Program";
import placeholder from './placeholder.png';

class Exhibits extends React.Component {
    constructor(props) {
        super(props);
        console.log('Made it to posters');
        this.state = {
            dirty: false,
            loading: true,
            posters: [],
            myposter: undefined,
            gotTracks: false,
            gotItems: false,
            gotPeople: false,
            gotSessions: false,
            gotRooms: false,
            waitForProgram: true
        }

        // Who am I? Very lightweight security
        this.first_last = this.props.auth.userProfile.get("displayName") ? this.props.auth.userProfile.get("displayName").split() : ["", ""];
        if (this.first_last.length > 2) {
            this.first_last = [this.first_last[0], this.first_last[1]]; // Just first and last names
        }
        
        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            let posters = this.getPosters(this.props.match.params.track, this.props.items, this.props.tracks);
            this.state.posters = posters;
            this.state.myposter = this.getUserPoster(posters);
            this.state.waitForProgram = false;
            this.changeChatPanel(posters);
        }        
        
    }

    changeChatPanel(posters) {
        if (posters.length > 0) {
            let poster = posters.find(p => p.get("programSession"));
            if(poster.get("programSession") && poster.get("programSession").get("room") && poster.get("programSession").get("room").get("socialSpace")){
                //set the social space...
                let ss = poster.get("programSession").get("room").get("socialSpace");
                this.props.auth.setSocialSpace(ss.get("name"));
                this.props.auth.helpers.setGlobalState({forceChatOpen: true});
            }
        }
    }

    getPosters(TRACK, items, tracks) {
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

    getUserPoster(posters) {
        let myposter = posters.find(poster => {
            let authors = poster.get("authors");
            let me = authors.find(a => {
                let fl = a.get('name') ? a.get('name').split() : ["-", "-"];
                if (fl.length > 2) 
                    fl = [fl[0], fl[1]];
                return fl[0] === this.first_last[0] && fl[1] == this.first_last[1];
            });
            if (me) return true
            else return false
        });
        return myposter;
    }

    async componentDidMount() {
        //For social features, we need to wait for the login to complete before doing anything
        let user = await this.props.auth.refreshUser();
        this.setState({loading: false})
    }

    initializePosters(track) {
        console.log(`[Posters]: track ${track}`);

        let posters = this.getPosters(track, this.props.items, this.props.tracks);
        this.setState({
            posters: posters,
            myposter: this.getUserPoster(posters),
            waitForProgram: false
        });
        this.changeChatPanel(posters);
    }

    componentDidUpdate(prevProps) {
        console.log("[Posters]: Something changed");

        if (this.state.waitForProgram) {
            if (this.state.gotItems && this.state.gotTracks && this.state.gotPeople && this.state.gotSessions && this.state.gotRooms) {
                console.log('[Posters]: Program download complete');
                this.initializePosters(this.props.match.params.track);
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
                if (prevProps.sessions.length != this.props.sessions.length) {
                    this.setState({gotSessions: true});
                    console.log('[Posters]: got sessions');
                }
                if (prevProps.rooms.length != this.props.rooms.length) {
                    this.setState({gotRooms: true});
                    console.log('[Posters]: got rooms');
                }
            }
        }
        else {
            console.log('[Posters]: Program cached');
        }

        if (prevProps.match.params.track != this.props.match.params.track) {
            this.initializePosters(this.props.match.params.track);
        }
    }

    onImageUpload(file, fileList) {
        if (!this.state.myposter) {
            console.log("[Posters]: attempt to upload poster without poster id");
            return false;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const data = {
                content: reader.result, 
                conferenceId: this.props.auth.currentConference.id,
                posterId: this.state.myposter.id
            };
            
            Parse.Cloud.run("poster-upload", data).then(() => {
                this.state.myposter.set("image", reader.result);
                this.setState({dirty: !this.state.dirty});
                console.log('[Posters]: Poster uploaded successfully');
            });
        }
        reader.readAsDataURL(file);
        return false;
    } 
    
    onImageDownload() {
        console.log("[Posters]: onImageDownload");
    }

    render() {

        const { Meta } = Card;

        if (this.state.loading)
            return <Spin/>

        if (this.props.downloaded) {

            return <div className={"space-align-container"}>
                    {this.state.posters.map((poster) => {
                        let authors = poster.get("authors");
                        let authorstr = authors.map(a => a.get('name')).join(", ");
                        
                        let tool = "";
                        if (this.state.myposter && (this.state.myposter.id == poster.id))
                            tool = <span title="Looks like you're an author. Replace the image? Use 3x2 ratio.">
                                        <Upload accept=".png, .jpg" name='poster' beforeUpload={this.onImageUpload.bind(this)}>
                                        <Button type="primary">
                                            <UploadOutlined />Upload
                                        </Button>
                                        </Upload>
                                    </span>;

                        let img = placeholder;
                        if (poster.get("image"))
                            img = poster.get("image");

                        return <div className={"space-align-block"} key={poster.id} >
                                    <NavLink to={"/program/" + poster.get("confKey")}>
                                        <Card hoverable style={{ width: 300 }} cover={<img alt="poster" style={{width:300, height:200 }} 
                                            src={img} 
                                        />}>
                                            <Tooltip placement="topLeft" title={poster.get("title")} arrowPointAtCenter>
                                                <Meta title={poster.get('title')} description={authorstr} />
                                            </Tooltip>
                                        </Card>
                                    </NavLink>
                                    {tool}
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
                    <Exhibits {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} people={people} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>
);

export default PostersWithAuth;

