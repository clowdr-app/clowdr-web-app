import React from 'react';
import { Card, List, Space, Spin } from "antd";

class ChannelList extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 'loading': true };
        this.videosRef = this.props.firebase.db.ref("videos");
    }

    componentDidMount() {
        this.videosRef.once("value").then((val) => {
            let data = val.val();
            const videos = [];
            if (data) {
                val.forEach((vid) => {
                    videos.push({ id: vid.key, data: vid.val() });
                });
            }
            this.setState({
                loading: false,
                videos: videos
            });
        });

    }


    render() {
        if (this.state.loading || !this.props.firebase.auth.currentUser) {
            return (
                <Spin tip="Loading...">
                </Spin>)
        }
        return <div><h2>Previously Aired Videos</h2><List dataSource={this.state.videos}
            itemLayout="vertical"
            renderItem={item => (
                <List.Item>
                    <Card title={item.data.title}>
                        <Space align={"center"} style={{
                            width: '80vw',
                            overflow: 'scroll'
                        }}>
                            {
                                Object.keys(item.data.videos).map((video) => {
                                    return <Card type="inner"
                                        title={item.data.videos[video].title}
                                        style={{ width: "350px" }}>
                                        <iframe width="300" height="200"
                                            src={"https://www.youtube.com/embed/" + video}
                                            frameBorder="0"
                                            allow="autoplay; encrypted-media"
                                            allowFullScreen></iframe>
                                    </Card>
                                })}
                        </Space>
                    </Card>
                </List.Item>
            )}
        /></div>
    }
}

export default ChannelList;
