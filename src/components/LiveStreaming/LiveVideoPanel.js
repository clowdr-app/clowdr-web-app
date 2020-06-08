import React from 'react';
import {videoURLFromData} from './utils'
import Parse from "parse";

class LiveVideoPanel extends React.Component {
    constructor(props) {
        super(props);
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
        const src1 = this.props.video.get("src1");
        const id1 = this.props.video.get("id1");
        const video_url = videoURLFromData(src1, id1);

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
                                    <iframe title={this.props.title} src={video_url} style={{"minWidth":"720px", "height":"450px"}}
                                            allowFullScreen/>
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