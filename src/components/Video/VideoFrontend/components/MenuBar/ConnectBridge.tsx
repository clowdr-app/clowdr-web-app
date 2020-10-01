import React, { Component, Dispatch, SetStateAction } from 'react';

import { IVideoContext } from '../VideoProvider';

export default class ConnectBridge extends Component<
    { videoContext: IVideoContext; setRoomName: Dispatch<SetStateAction<string>> },
    {}
    > {
    componentWillUnmount(): void {
        if (this.props.videoContext.room && this.props.videoContext.room.disconnect) {
            // Detach the local media elements
            let room = this.props.videoContext.room;
            room.localParticipant.tracks.forEach(publication => {
                console.log(publication.track.kind);
                switch (publication.track.kind) {
                    case 'video':
                        publication.track.stop();
                        const attachedElements1 = publication.track.detach();
                        attachedElements1.forEach(element => element.remove());
                        break;
                    case 'audio':
                        const attachedElements2 = publication.track.detach();
                        attachedElements2.forEach(element => element.remove());
                        break;
                    default:
                        console.log(publication.track.kind);
                }
                publication.unpublish();
                room.localParticipant.unpublishTrack(publication.track);
            });
            if (room.localParticipant.state === 'connected') {
                room.disconnect();
            }
            this.props.videoContext.localTracks.forEach(track => {
                track.stop();
            });
        }
    }

    render() {
        return <span></span>;
    }
}
