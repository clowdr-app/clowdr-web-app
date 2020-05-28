import React from 'react';

const LiveVideoSourceMappings = {
    YouTube : {
        url : "https://www.youtube.com/embed/",
        vars : {
            mute : 1,
            autoplay : 1,
        }
    }
}

class LiveVideoPanel extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    render() {
        const src1 = this.props.video.get("src1");
        const id1 = this.props.video.get("id1");
        var queryVars = Object.keys(LiveVideoSourceMappings[src1].vars);
        const video_url = LiveVideoSourceMappings[src1].url + id1 + '?' + queryVars.map(k => `${k}=${LiveVideoSourceMappings[src1].vars[k]}&`).join('');
        console.log(video_url);

        const chat_url = `https://www.youtube.com/live_chat?v=${id1}&embed_domain=${process.env.REACT_APP_DOMAIN}`;

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