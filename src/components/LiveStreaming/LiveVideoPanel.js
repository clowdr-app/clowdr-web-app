import React from 'react';
import {videoURLFromData} from './utils'
import Parse from "parse";

class LiveVideoPanel extends React.Component {
    constructor(props) {
        super(props);
        console.log("VideoPanel count: " + this.props.count)
    }

    componentDidMount() {
        console.log("VideoPanel mounted: " + this.props.watchers.get("count"));
        this.props.onUpdate();
        this.props.watchers.increment("count");
        this.props.watchers.save();
    }

    componentWillUnmount() {
        console.log("VideoPanel unmounted: " + this.props.watchers.get("count"));
        this.props.onUpdate();
        this.props.watchers.decrement("count");
        this.props.watchers.save();
    }

    componentDidUpdate(prevProps) {
        console.log("Something changed");
    }

    render() {
        const src1 = this.props.video.get("src1");
        const id1 = this.props.video.get("id1");
        const video_url = videoURLFromData(src1, id1);

        const q_url = this.props.video.get("slido");
      
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
                                    Watching now: {this.props.watchers.get("count")}
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