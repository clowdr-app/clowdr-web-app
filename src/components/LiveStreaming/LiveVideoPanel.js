import React from 'react';

const LiveVideoSourceMappings = {
    "YouTube" : {
        "url" : "https://www.youtube.com/embed/",
        "vars" : {
            "autoplay" : 1
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
        const video_url = LiveVideoSourceMappings[src1].url + id1 + '?' + queryVars.map(k => `${k}=${LiveVideoSourceMappings[src1].vars[k]}&`);
        //`https://www.youtube.com/embed/${videoId}?autoplay=1`;

        const chat_url = `https://www.youtube.com/live_chat?v=${id1}&embed_domain=${process.env.REACT_APP_DOMAIN}`;

        return (
            <div className={"container"}>
                <div className={"row"}>
                    <div className={"col-sm"}>
                        <div className={"embed-responsive embed-responsive-16by9"}>
                            <iframe title={this.props.title} className={"embed-responsive-item"} src={video_url}
                                    allowFullScreen/>
                        </div>
                    </div>
                    <div className={"col col-lg-4"}>
                        <div className={"embed-responsive "} style={{"height": "100%", "minWidth":"500px"}}>
                            <iframe title={this.props.title} className={"embed-responsive-item"} src={chat_url}
                                    allowFullScreen/>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default LiveVideoPanel