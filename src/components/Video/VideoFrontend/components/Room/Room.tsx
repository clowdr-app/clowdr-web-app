import React from 'react';
import ParticipantList from '../ParticipantList/ParticipantList';
import { styled } from '@material-ui/core/styles';
import MainParticipant from '../MainParticipant/MainParticipant';
import useScreenShareParticipant from '../../hooks/useScreenShareParticipant/useScreenShareParticipant';
import useSelectedParticipant from '../VideoProvider/useSelectedParticipant/useSelectedParticipant';

const Container = styled('div')(({ theme }) => ({
    position: 'relative',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: `1fr ${theme.sidebarWidth}px`,
    gridTemplateRows: '100%',
    [theme.breakpoints.down('sm')]: {
        gridTemplateColumns: `100%`,
        gridTemplateRows: `1fr ${theme.sidebarMobileHeight + 26}px`,
        overflow: "auto"
    },
}));

export default function Room() {
    const [selectedParticipant] = useSelectedParticipant();
    const screenShareParticipant = useScreenShareParticipant();

    const presenterView = selectedParticipant || screenShareParticipant;
    return (
        <Container>
            {presenterView ? <MainParticipant /> : <></>}
            <ParticipantList gridView={!presenterView} />
        </Container>
    );
}
