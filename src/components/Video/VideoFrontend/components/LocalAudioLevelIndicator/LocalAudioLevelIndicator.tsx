import React from 'react';
import useVideoContext from '../../hooks/useVideoContext/useVideoContext';
import AudioLevelIndicator from '../AudioLevelIndicator/AudioLevelIndicator';

export default function LocalAudioLevelIndicator() {
  const { localAudioTrack: audioTrack } = useVideoContext();
  return <AudioLevelIndicator audioTrack={audioTrack} />;
}
