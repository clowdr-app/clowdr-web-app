import React, { useState } from 'react';

import AudioInputList from './AudioInputList/AudioInputList';
import AudioOutputList from './AudioOutputList/AudioOutputList';
import { Dialog, IconButton, DialogContent, Button } from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';
import VideoInputList from './VideoInputList/VideoInputList';

export function DeviceSelector() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <IconButton onClick={() => setIsOpen(true)} data-cy-device-select>
                <SettingsIcon />
            </IconButton>
            <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
                <DialogContent className="dialog-content">
                    <div className="list-selection">
                        <AudioInputList />
                    </div>
                    <div className="list-selection">
                        <AudioOutputList />
                    </div>
                    <div className="list-selection">
                        <VideoInputList />
                    </div>
                    <Button className="done-button" onClick={() => setIsOpen(false)}>
                        Done
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
