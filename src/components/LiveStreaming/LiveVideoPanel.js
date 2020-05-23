import React from 'react';

class LiveVideoPanel extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    render() {

        const videoId = this.props.video.get("key");
        const video_url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

        const chat_url = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${process.env.REACT_APP_DOMAIN}`;

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