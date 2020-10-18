import React, { useState } from 'react';
import clsx from 'clsx';
import Participant from '../Participant/Participant';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import useMainParticipant from '../../hooks/useMainParticipant/useMainParticipant';
import useParticipants from '../../hooks/useParticipants/useParticipants';
import useVideoContext from '../../hooks/useVideoContext/useVideoContext';
import useSelectedParticipant from '../VideoProvider/useSelectedParticipant/useSelectedParticipant';
import useScreenShareParticipant from '../../hooks/useScreenShareParticipant/useScreenShareParticipant';
import useUserProfile from '../../../../../hooks/useUserProfile';
import { UserProfile } from '@clowdr-app/clowdr-db-schema';
import useConference from '../../../../../hooks/useConference';
import useSafeAsync from '../../../../../hooks/useSafeAsync';
import { removeNull } from '@clowdr-app/clowdr-db-schema/build/Util';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        container: {
            padding: '2em',
            overflowY: 'auto',
            background: 'rgb(79, 83, 85)',
            gridArea: '1 / 2 / 1 / 3',
            zIndex: 5,
            [theme.breakpoints.down('sm')]: {
                gridArea: '2 / 1 / 3 / 3',
                overflowY: 'initial',
                overflowX: 'auto',
                display: 'flex',
                padding: '8px',
            },
        },
        transparentBackground: {
            background: 'transparent',
        },
        scrollContainer: {
            [theme.breakpoints.down('sm')]: {
                display: 'flex',
            },
        },
    })
);

export default function ParticipantList() {
    const classes = useStyles();
    const {
        room: { localParticipant },
    } = useVideoContext();
    const participants = useParticipants();
    const [selectedParticipant, setSelectedParticipant] = useSelectedParticipant();
    const screenShareParticipant = useScreenShareParticipant();
    const mainParticipant = useMainParticipant();
    const isRemoteParticipantScreenSharing = screenShareParticipant && screenShareParticipant !== localParticipant;

    const conference = useConference();
    const localUserProfile = useUserProfile();

    const [remoteProfiles, setRemoteProfiles] = useState<Array<UserProfile> | null>(null);

    useSafeAsync(async () => {
        const profiles = await Promise.all(participants.map(participant => UserProfile.get(participant.identity, conference.id)));
        return removeNull(profiles);
    }, setRemoteProfiles, [participants]);

    if (participants.length === 0) return null; // Don't render this component if there are no remote participants.

    return (
        <aside
            className={clsx(classes.container, {
                [classes.transparentBackground]: !isRemoteParticipantScreenSharing,
            })}
        >
            <div className={classes.scrollContainer}>
                <Participant
                    participant={localParticipant}
                    profile={localUserProfile}
                    isLocalParticipant={true} />
                {participants.map(participant => {
                    const isSelected = participant === selectedParticipant;
                    const hideParticipant =
                        participant === mainParticipant &&
                        participant !== screenShareParticipant &&
                        !isSelected;
                    const remoteProfile = participant.identity === localParticipant.identity
                        ? localUserProfile
                        : remoteProfiles?.find(y => y.id === participant.identity);
                    return (
                        <Participant
                            key={participant.sid}
                            participant={participant}
                            profile={remoteProfile}
                            isSelected={participant === selectedParticipant}
                            onClick={() => setSelectedParticipant(participant)}
                            hideParticipant={hideParticipant}
                        />
                    );
                })}
            </div>
        </aside>
    );
}
