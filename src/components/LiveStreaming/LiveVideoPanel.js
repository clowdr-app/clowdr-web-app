import React from 'react';
import {videoURLFromData} from './utils'

class LiveVideoPanel extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
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
                        <div className={"embed-responsive-item"} >
                            <iframe title={this.props.title} src={video_url} style={{"minWidth":"720px", "height":"450px"}}
                                    allowFullScreen/>
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