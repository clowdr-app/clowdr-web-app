import React, { useState } from 'react';
import clsx from 'clsx';
import Participant from '../Participant/Participant';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import useMainParticipant from '../../hooks/useMainParticipant/useMainParticipant';
import useParticipants, { ParticipantWithSlot } from '../../hooks/useParticipants/useParticipants';
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
        gridContainer: {
            gridArea: "1 / 1 / 1 / 3",
            overflowX: "hidden",
            overflowY: "auto",
            [theme.breakpoints.down('sm')]: {
                gridArea: "1 / 1 / 3 / 1",
            }
        },
        gridInnerContainer: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gridAutoRows: "1fr",
            [theme.breakpoints.down('md')]: {
                gridTemplateColumns: "1fr 1fr 1fr",
            },
            [theme.breakpoints.down('sm')]: {
                gridTemplateColumns: "1fr 1fr",
            },
            [theme.breakpoints.down('xs')]: {
                gridTemplateColumns: "1fr",
            },
        }
    })
);

export default function ParticipantList(props: {
    gridView: boolean
}) {
    const classes = useStyles();
    const {
        room: { localParticipant },
    } = useVideoContext();
    const participants = useParticipants();
    const [selectedParticipant, setSelectedParticipant] = useSelectedParticipant();
    const screenShareParticipant = useScreenShareParticipant();
    const mainParticipant = useMainParticipant();

    const conference = useConference();
    const localUserProfile = useUserProfile();

    const [remoteProfiles, setRemoteProfiles] = useState<Array<UserProfile> | null>(null);

    useSafeAsync(async () => {
        const profiles = await Promise.all(
            participants.map(participantWithSlot =>
                UserProfile.get(participantWithSlot.participant.identity, conference.id)));
        return removeNull(profiles);
    }, setRemoteProfiles, [participants], "ParticipantList:setRemoteProfiles");

    function participantSorter(x: ParticipantWithSlot, y: ParticipantWithSlot): number {
        return x.slot < y.slot ? -1 : x.slot === y.slot ? 0 : 1;
    }

    const participantsEl = <>
        <Participant
            participant={localParticipant}
            profile={localUserProfile}
            isLocalParticipant={true}
            insideGrid={props.gridView}
            slot={0}
        />
        {participants
            .sort(participantSorter)
            .map(participantWithSlot => {
                const participant = participantWithSlot.participant;
                const isSelected = participant === selectedParticipant;
                const hideParticipant =
                    participant === mainParticipant &&
                    participant !== screenShareParticipant &&
                    !isSelected &&
                    participants.length > 1;
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
                        slot={participantWithSlot.slot}
                        insideGrid={props.gridView}
                    />
                );
            })}
    </>;

    return props.gridView
        ? (
            <main
                className={clsx(classes.gridContainer, {
                    [classes.transparentBackground]: true,
                }, "participants-grid-container")}
            >
                <div className={classes.gridInnerContainer}>
                        {participantsEl}
                </div>
            </main>
        )
        : (
            <aside
                className={clsx(classes.container, {
                    [classes.transparentBackground]: true,
                })}
            >
                <div className={classes.scrollContainer}>
                    {participantsEl}
                </div>
            </aside>
        );
}
