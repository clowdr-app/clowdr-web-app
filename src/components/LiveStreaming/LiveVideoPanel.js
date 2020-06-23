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

        let src = this.props.video.get("src1");
        let id = this.props.video.get("id1");
        let pwd = this.props.video.get("pwd1");
        this.video_url = videoURLFromData(src, id, pwd);

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
        console.log("[LiveVideoPanel]: Something changed " + this.props.watchers.length + " " + prevProps.watchers.length + " in " + this.props.video.get("title"));
        if (prevProps.watchers.length !== this.props.watchers.length) {
            var w = this.props.watchers.filter(w =>  w.get("video") == this.props.video.id );
            if (!this.state || w.length !== this.state.count) {
                // console.log("[LiveVideoPanel]: NEW COUNT! " + w.length);
                this.setState({count: w.length});
            }
        }
    }

    render() {

        let videopanel = <ReactPlayer playing playsinline controls={true} muted={true} volume={1} 
                                    width='900px' height='506px' url={this.video_url}/>

        let qa = "";
        const q_url = this.props.video.get("qa");
        if (q_url) {
            qa = <div className={"col-sm"}>
                        <iframe title={this.props.title} src={q_url} style={{"height":"720px"}}
                        allowFullScreen/>
                </div>
        }

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
                                    {videopanel}
                                    {qa} 
                            </div>
                            <div className={"row"}>
                                    Watching now: {count}
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        )
    }
}

export default LiveVideoPanel;