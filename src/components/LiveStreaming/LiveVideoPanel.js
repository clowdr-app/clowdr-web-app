import React from 'react';
import {videoURLFromData} from './utils'
import Parse from "parse";
import ReactPlayer from 'react-player';

class LiveVideoPanel extends React.Component {
    constructor(props) {
        super(props);
        // available: video, watchers, geoloc
        var w = this.props.watchers.filter(w =>  w.get("video") == this.props.video.id );
        this.state = {
            count: w.length,
            mywatch: undefined
        };
    }

    componentDidMount() {
        // console.log("VideoPanel mounted: " + this.props.watchers.length);
        var _this = this;
        // Create the watcher record
        var Watcher = Parse.Object.extend("LiveVideoWatchers");
        var watcher = new Watcher();
        watcher.set("video", this.props.video.id);
        watcher.set("user", this.props.auth.user.id);
        watcher.save().then(val => {
            this.setState({mywatch: watcher});
        })
        .catch(err => {
            console.log(err);
        });
    }

    componentWillUnmount() {
        console.log("VideoPanel unmounting");
        this.state.mywatch.destroy();
    }

    componentDidUpdate(prevProps) {
        console.log("[LiveVideoPanel]: Something changed " + this.props.watchers.length + " " + prevProps.watchers.length);
        if (prevProps.watchers.length !== this.props.watchers.length) {
            var w = this.props.watchers.filter(w =>  w.get("video") == this.props.video.id );
            if (!this.state || w.length !== this.state.count) {
                // console.log("[LiveVideoPanel]: NEW COUNT! " + w.length);
                this.setState({count: w.length});
            }
        }
    }

    render() {
        let src = this.props.video.get("src1");
        let id = this.props.video.get("id1");
        let video_url = videoURLFromData(src, id);
        let videopanel = "";

        if (this.props.geoloc && this.props.geoloc.country_code.toLowerCase() == 'cn')
        {
            console.log("Viewer from China! Nǐ hǎo");
            src = this.props.video.get("src2");
            id = this.props.video.get("id2");
            video_url = videoURLFromData(src, id);
            videopanel = <ReactPlayer playing controls muted url={video_url}/>
        } else {
            videopanel = <iframe title={this.props.title} src={video_url} style={{"minWidth":"720px", "height":"450px"}} allowFullScreen/>
        }


        const q_url = this.props.video.get("slido");

        let count = ""
        if (this.state) {
            count = this.state.count;
        }
        else
            count = "0";
      
        return (
            <div className={"container"}>
                <div className={"row"}>
                    <div className={"col-sm"}>
                        <div className={"container"}>
                            <div className={"row"}>
                                <div className={"embed-responsive-item"} >
                                    {videopanel}
                                </div>
                            </div>
                            <div className={"row"}>
                                <div className={"embed-responsive-item"}>
                                    Watching now: {count}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={"col-sm"}>
                        <div className={"embed-responsive-item"} >
                            <iframe title={this.props.title} src={q_url} style={{"minWidth":"360px", "height":"720px"}}
                                    allowFullScreen/>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default LiveVideoPanel;