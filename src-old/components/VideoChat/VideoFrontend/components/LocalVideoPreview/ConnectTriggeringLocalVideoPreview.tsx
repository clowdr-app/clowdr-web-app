import React from 'react';
import { LocalVideoTrack, LocalVideoTrackPublication } from 'twilio-video';
import VideoTrack from '../VideoTrack/VideoTrack';
import { IVideoContext, VideoContext } from '../VideoProvider';
import { StateContext, StateContextType } from '../../state';

class LocalVideoPreview extends React.Component<{ stateContext: StateContextType; videoContext: IVideoContext }> {
    componentDidMount(): void { }

    async getTokenForToken(token: string) {
        const headers = new window.Headers();
        const endpoint = process.env.REACT_APP_TOKEN_ENDPOINT || '/token';
        const params = new window.URLSearchParams({ token });

        console.log(endpoint);
        return fetch(`${endpoint}?${params}`, { headers }).then(res => {
            return res.text();
        });
    }

    doConnect() {
        if (this.props.videoContext.isConnecting || !this.props.stateContext.token) return;
        this.props.videoContext.isConnecting = true;

        this.props.videoContext
            .connect(this.props.stateContext.token)
            .then(room => {
                if (this.props.stateContext.onConnect) {
                    this.props.stateContext.onConnect(room);
                }
                this.props.videoContext.room.on('disconnected', room => {
                    console.log('Disconnected.');
                    room.localParticipant.tracks.forEach((publication: LocalVideoTrackPublication) => {
                        const attachedElements = publication.track.detach();
                        attachedElements.forEach(element => element.remove());
                    });
                });
            })
            .catch(err => this.props.videoContext.onError);
    }
    render():
        | React.ReactElement<any, string | React.JSXElementConstructor<any>>
        | string
        | number
        | {}
        | React.ReactNodeArray
        | React.ReactPortal
        | boolean
        | null
        | undefined {
        let localTracks = this.props.videoContext.localTracks;
        const videoTrack = localTracks.find(track => track.name.includes('camera')) as LocalVideoTrack;

        return videoTrack ? <VideoTrack track={videoTrack} onLoad={this.doConnect.bind(this)} isLocal /> : null;
    }

    // const { localTracks } = useVideoContext();
}

const VideoContextConsumer = () => (
    <VideoContext.Consumer>
        {videoContext => (
            <StateContext.Consumer>
                {value => <LocalVideoPreview stateContext={value} videoContext={videoContext} />}
            </StateContext.Consumer>
        )}
    </VideoContext.Consumer>
);
export default VideoContextConsumer;
