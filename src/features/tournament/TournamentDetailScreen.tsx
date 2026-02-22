import React, { useState } from 'react';
import { View, StyleSheet, Alert, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Text, Button, Card, Title, Paragraph, List, Avatar, Chip, FAB, Portal, Modal, Checkbox, Searchbar, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTournamentStore } from '../../store/tournamentStore';
import { useMatchStore } from '../../store/matchStore';
import { useTeamStore } from '../../store/teamStore';
import { useScoringStore } from '../../store/scoringStore';
import { useShallow } from 'zustand/react/shallow';

export default function TournamentDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { tournamentId } = route.params;

    const tournament = useTournamentStore((state) => state.tournaments.find(t => t.id === tournamentId));
    const deleteTournament = useTournamentStore((state) => state.deleteTournament);
    const addTeamsToTournament = useTournamentStore((state) => state.addTeamsToTournament);
    const removeTeamFromTournament = useTournamentStore((state) => state.removeTeamFromTournament);
    const matches = useMatchStore(useShallow((state) => state.matches.filter(m => m.tournamentId === tournamentId)));
    const innings = useScoringStore(state => state.innings);

    const balls = useScoringStore(useShallow(state => state.balls));
    const deleteMatch = useMatchStore((state) => state.deleteMatch); // Moved hook up

    // Helper to calculate stats for a specific player in a specific inning

    // Helper to calculate stats for a specific player in a specific inning
    const getPlayerStats = (playerId: string, inningId: string) => {
        const playerBalls = balls.filter(b => b.inningId === inningId);
        // Batting Stats
        const runs = playerBalls.filter(b => b.strikerId === playerId).reduce((sum, b) => sum + b.runsScored, 0);
        const ballsFaced = playerBalls.filter(b => b.strikerId === playerId && b.isValidBall).length;

        // Bowling Stats
        const bowlingBalls = playerBalls.filter(b => b.bowlerId === playerId);
        const runsConceded = bowlingBalls.reduce((sum, b) => sum + b.runsScored + b.extrasRuns, 0);
        const wickets = bowlingBalls.filter(b => b.isWicket && b.wicketType !== 'RUN_OUT').length;
        const validBalls = bowlingBalls.filter(b => b.isValidBall).length;
        const overs = Math.floor(validBalls / 6) + (validBalls % 6) / 10;

        const player = allPlayers.find(p => p.id === playerId);
        return {
            name: player?.name || 'Unknown',
            runs,
            balls: ballsFaced,
            bowlingFigures: `${wickets}/${runsConceded} (${overs.toFixed(1)})`
        };
    };

    // We can just select all teams for now, or filter if we had a team-tournament link
    const allTeams = useTeamStore((state) => state.teams);

    // Filter teams belonging to this tournament
    const tournamentTeamIds = tournament?.teamIds || [];
    const tournamentTeams = allTeams.filter(t => tournamentTeamIds.includes(t.id));

    // For Adding Teams Modal
    const [addTeamModalVisible, setAddTeamModalVisible] = useState(false);
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
    const [teamSearchQuery, setTeamSearchQuery] = useState('');

    const availableTeams = allTeams.filter(t => !tournamentTeamIds.includes(t.id));
    const filteredAvailableTeams = availableTeams.filter(t => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()));

    const handleAddTeams = async () => {
        if (selectedTeamIds.length > 0) {
            await addTeamsToTournament(tournamentId, selectedTeamIds);
            setAddTeamModalVisible(false);
            setSelectedTeamIds([]);
        }
    };

    const toggleTeamSelection = (id: string) => {
        setSelectedTeamIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
    };
    const allPlayers = useTeamStore((state) => state.players);
    const teamsPlayers = useTeamStore((state) => state.teamsPlayers);

    const getTeamPlayers = (teamId: string) => {
        const playerIds = teamsPlayers[teamId] || [];
        return allPlayers.filter(p => playerIds.includes(p.id));
    };



    const [activeTab, setActiveTab] = useState<'MATCHES' | 'TEAMS'>('MATCHES');
    const [matchFilter, setMatchFilter] = useState<'ALL' | 'SCHEDULED' | 'LIVE' | 'COMPLETED'>('ALL');

    const filteredMatches = matches
        .filter(m => matchFilter === 'ALL' || m.status === matchFilter)
        .sort((a, b) => {
            const statusPriority: { [key: string]: number } = { 'LIVE': 0, 'SCHEDULED': 1, 'COMPLETED': 2 };
            const priorityDiff = (statusPriority[a.status] ?? 3) - (statusPriority[b.status] ?? 3);
            if (priorityDiff !== 0) return priorityDiff;
            const dateA = a.matchDate ? new Date(a.matchDate).getTime() : 0;
            const dateB = b.matchDate ? new Date(b.matchDate).getTime() : 0;
            return dateA - dateB;
        });

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                    <Button
                        compact
                        onPress={() => navigation.navigate('CreateTournament', { tournamentId: tournament?.id })}
                    >
                        Edit
                    </Button>
                    <Button
                        compact
                        textColor="red"
                        onPress={handleDelete}
                    >
                        Delete
                    </Button>
                </View>
            ),
            title: tournament?.name || 'Tournament Detail'
        });
    }, [navigation, tournament]);

    if (!tournament) {
        return (
            <View style={styles.center}>
                <Text>Tournament not found!</Text>
            </View>
        );
    }



    const getTeamName = (id: string) => allTeams.find(t => t.id === id)?.name || 'Unknown Team';

    const renderRightActions = (id: string, progress: any, dragX: any) => {
        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => {
                    Alert.alert(
                        "Delete Match",
                        "Delete this match permanently?",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => deleteMatch(id) }
                        ]
                    );
                }}
            >
                <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
        );
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Tournament",
            "Are you sure? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteTournament(tournamentId);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    const renderMatchItem = ({ item }: { item: any }) => {
        const matchInnings = innings.filter(i => i.matchId === item.id).sort((a, b) => a.inningIndex - b.inningIndex);
        const firstInning = matchInnings.find(i => i.inningIndex === 1);
        const secondInning = matchInnings.find(i => i.inningIndex === 2);
        const currentInning = matchInnings[matchInnings.length - 1]; // Latest inning

        const teamA = allTeams.find(t => t.id === item.teamAId);
        const teamB = allTeams.find(t => t.id === item.teamBId);

        // --- Status Text Logic ---
        let statusText = '';
        if (item.status === 'SCHEDULED') {
            statusText = `${new Date(item.matchDate).toLocaleDateString()} • ${item.venue || 'TBD'}`;
        } else if (item.status === 'LIVE') {
            const tossText = item.tossWinnerId ? `${item.tossWinnerId === item.teamAId ? teamA?.name : teamB?.name} chose to ${item.battingFirstId === item.tossWinnerId ? 'bat' : 'bowl'}` : '';

            let crrText = '';
            if (currentInning && currentInning.oversBowled > 0) {
                const validBalls = Math.floor(currentInning.oversBowled * 6 + (currentInning.oversBowled % 1) * 10);
                const crr = validBalls > 0 ? ((currentInning.totalRuns / validBalls) * 6).toFixed(2) : '0.00';
                crrText = ` • CRR: ${crr}`;
            }
            statusText = `${tossText}${crrText}`;
        } else {
            statusText = item.resultDescription || 'Match Completed';
        }

        // --- Active Players Data (Live Only) ---
        let striker = null;
        let nonStriker = null;
        let bowler = null;
        let battingTeamName = '';

        if (item.status === 'LIVE' && currentInning) {
            if (currentInning.currentStrikerId) striker = getPlayerStats(currentInning.currentStrikerId, currentInning.id);
            if (currentInning.currentNonStrikerId) nonStriker = getPlayerStats(currentInning.currentNonStrikerId, currentInning.id);
            if (currentInning.currentBowlerId) bowler = getPlayerStats(currentInning.currentBowlerId, currentInning.id);
            battingTeamName = allTeams.find(t => t.id === currentInning.battingTeamId)?.name || '';
        }

        // --- Scores Calculation ---
        const getScoreString = (inning?: typeof firstInning) => {
            if (!inning) return null;
            return `${inning.totalRuns}/${inning.wickets}`;
        };
        const getOversString = (inning?: typeof firstInning) => {
            if (!inning) return null;
            return `(${inning.oversBowled.toFixed(1)})`;
        };

        // Scores for Team A and Team B columns (for Completed/Live view where we show both)
        const teamAScore = matchInnings.find(i => i.battingTeamId === item.teamAId);
        const teamBScore = matchInnings.find(i => i.battingTeamId === item.teamBId);

        return (
            <Swipeable renderRightActions={(progress, dragX) => renderRightActions(item.id, progress, dragX)}>
                <Card style={[styles.matchCard, { marginBottom: 16 }]} onPress={() => {
                    const targetScreen = (item.status === 'LIVE' || item.status === 'COMPLETED') ? 'LiveScore' : 'SelectPlayingXI';
                    navigation.navigate(targetScreen, { matchId: item.id });
                }}>
                    <Card.Content style={{ paddingBottom: 12 }}>
                        {/* Live/Status Badge */}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                            <Text style={{
                                color: item.status === 'LIVE' ? 'green' : (item.status === 'COMPLETED' ? '#1976D2' : 'gray'),
                                fontWeight: 'bold', fontSize: 12
                            }}>
                                {item.status === 'LIVE' ? 'Live' : (item.status === 'COMPLETED' ? 'Result' : 'Upcoming')}
                            </Text>
                        </View>

                        {/* Teams and Main Score Layout */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>

                            {/* Team A Section */}
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                {teamA?.logoUri ? (
                                    <Avatar.Image size={48} source={{ uri: teamA.logoUri }} style={{ backgroundColor: 'transparent', marginBottom: 4 }} />
                                ) : (
                                    <Avatar.Text size={48} label={teamA?.name?.substring(0, 2).toUpperCase() || 'TA'}
                                        style={{ backgroundColor: '#E0E0E0', marginBottom: 4 }}
                                    />
                                )}
                                <Text style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>{teamA?.name}</Text>
                            </View>

                            {/* Center / Scores Section */}
                            <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' }}>
                                {/* Left Score (Team A) */}
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    {item.status !== 'SCHEDULED' && teamAScore ? (
                                        <>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{getScoreString(teamAScore)}</Text>
                                            <Text style={{ fontSize: 11, color: '#666' }}>{getOversString(teamAScore)}</Text>
                                        </>
                                    ) : (
                                        item.status !== 'SCHEDULED' && <Text style={{ fontSize: 11, color: '#999', marginTop: 8 }}>Yet to bat</Text>
                                    )}
                                </View>

                                {/* Middle VS or Info */}
                                <View style={{ alignItems: 'center', justifyContent: 'center', width: 30, marginTop: 4 }}>
                                    {item.status === 'SCHEDULED' ? (
                                        <Text style={{ fontSize: 14, color: '#666', fontWeight: 'bold' }}>vs</Text>
                                    ) : (
                                        <View style={{ width: 1, height: 30, backgroundColor: '#E0E0E0' }} />
                                    )}
                                </View>

                                {/* Right Score (Team B) */}
                                <View style={{ alignItems: 'center', flex: 1 }}>
                                    {item.status !== 'SCHEDULED' && teamBScore ? (
                                        <>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{getScoreString(teamBScore)}</Text>
                                            <Text style={{ fontSize: 11, color: '#666' }}>{getOversString(teamBScore)}</Text>
                                        </>
                                    ) : (
                                        item.status !== 'SCHEDULED' && <Text style={{ fontSize: 11, color: '#999', marginTop: 8 }}>Yet to bat</Text>
                                    )}
                                </View>
                            </View>

                            {/* Team B Section */}
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                {teamB?.logoUri ? (
                                    <Avatar.Image size={48} source={{ uri: teamB.logoUri }} style={{ backgroundColor: 'transparent', marginBottom: 4 }} />
                                ) : (
                                    <Avatar.Text size={48} label={teamB?.name?.substring(0, 2).toUpperCase() || 'TB'}
                                        style={{ backgroundColor: '#E0E0E0', marginBottom: 4 }}
                                    />
                                )}
                                <Text style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>{teamB?.name}</Text>
                            </View>
                        </View>

                        {/* Status Text Line */}
                        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, color: '#444', textAlign: 'center' }}>
                                {statusText}
                            </Text>
                            {item.status === 'COMPLETED' && item.manOfTheMatchId && (
                                <Text style={{ fontSize: 12, color: '#2e7d32', fontWeight: 'bold', marginTop: 2 }}>
                                    MoM: {allPlayers.find(p => p.id === item.manOfTheMatchId)?.name || 'Unknown'}
                                </Text>
                            )}
                            {item.status === 'SCHEDULED' && (
                                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{new Date(item.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            )}
                        </View>

                        {/* Divider + Detailed Stats (LIVE ONLY) */}
                        {item.status === 'LIVE' && currentInning && (
                            <>
                                <View style={{ height: 1, backgroundColor: '#EEEEEE', marginVertical: 8 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    {/* Batters */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>{battingTeamName} batting</Text>
                                        {striker && <Text style={{ fontSize: 11, fontWeight: '500' }}>● {striker.name}: {striker.runs}* ({striker.balls})</Text>}
                                        {nonStriker && <Text style={{ fontSize: 11 }}>   {nonStriker.name}: {nonStriker.runs}* ({nonStriker.balls})</Text>}
                                    </View>

                                    {/* Bowlers */}
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Bowling</Text>
                                        {bowler && <Text style={{ fontSize: 11, fontWeight: '500' }}>{bowler.name}: {bowler.bowlingFigures} ●</Text>}
                                    </View>
                                </View>
                            </>
                        )}
                    </Card.Content>
                </Card>
            </Swipeable>
        );
    };
    const renderTeamItem = ({ item }: { item: any }) => {
        const players = getTeamPlayers(item.id);
        return (
            <List.Accordion
                title={item.name}
                description={`${players.length} players`}
                left={props => <List.Icon {...props} icon="shield-account" />}
                style={{ backgroundColor: '#fff', marginBottom: 1 }}
            >
                {players.length === 0 ? (
                    <List.Item title="No players in this team" />
                ) : (
                    players.map(player => (
                        <List.Item
                            key={player.id}
                            title={`${player.name} (${player.jerseyNumber || '-'})`}
                            description={`${player.role}`}
                            left={props => <List.Icon {...props} icon="account" style={{ margin: 0 }} />}
                        />
                    ))
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8 }}>
                    <Button
                        icon="delete"
                        compact
                        textColor="red"
                        onPress={() => {
                            Alert.alert('Remove Team', `Remove ${item.name} from tournament?`, [
                                { text: 'Cancel' },
                                { text: 'Remove', style: 'destructive', onPress: () => removeTeamFromTournament(tournamentId, item.id) }
                            ])
                        }}
                    >
                        Remove from Tournament
                    </Button>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 8 }}>
                    <Button
                        icon="account-multiple-plus"
                        compact
                        onPress={() => navigation.navigate('BulkAddPlayers', { preSelectedTeamId: item.id })}
                    >
                        Bulk Add
                    </Button>
                    <Button
                        icon="account-plus"
                        compact
                        onPress={() => navigation.navigate('AddPlayerToTeam', { teamId: item.id })}
                    >
                        Add
                    </Button>
                    <Button
                        icon="pencil"
                        compact
                        onPress={() => navigation.navigate('CreateTeam', { teamId: item.id })}
                    >
                        Edit
                    </Button>
                </View>
            </List.Accordion>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.tabContainer}>
                <Button
                    mode={activeTab === 'MATCHES' ? 'contained' : 'text'}
                    onPress={() => setActiveTab('MATCHES')}
                    style={styles.tabButton}
                >
                    Matches
                </Button>
                <Button
                    mode={activeTab === 'TEAMS' ? 'contained' : 'text'}
                    onPress={() => setActiveTab('TEAMS')}
                    style={styles.tabButton}
                >
                    Teams
                </Button>
            </View>

            {activeTab === 'MATCHES' && (
                <View style={{ flex: 1 }}>

                    <View style={{ marginBottom: 8 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                            <Chip selected={matchFilter === 'ALL'} onPress={() => setMatchFilter('ALL')} style={{ marginRight: 8 }}>All</Chip>
                            <Chip selected={matchFilter === 'LIVE'} onPress={() => setMatchFilter('LIVE')} style={{ marginRight: 8 }}>Live</Chip>
                            <Chip selected={matchFilter === 'SCHEDULED'} onPress={() => setMatchFilter('SCHEDULED')} style={{ marginRight: 8 }}>Upcoming</Chip>
                            <Chip selected={matchFilter === 'COMPLETED'} onPress={() => setMatchFilter('COMPLETED')} style={{ marginRight: 8 }}>Finished</Chip>
                        </ScrollView>
                    </View>
                    <FlatList
                        data={filteredMatches}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMatchItem}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={() => (
                            filteredMatches.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text>No matches found.</Text>
                                </View>
                            ) : null
                        )}
                    />
                </View>
            )}

            {activeTab === 'TEAMS' && (
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={tournamentTeams}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTeamItem}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={() => (
                            tournamentTeams.length === 0 ? (
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ marginBottom: 10 }}>No teams added to this tournament yet.</Text>
                                    <Button mode="contained" onPress={() => setAddTeamModalVisible(true)}>
                                        Add Teams
                                    </Button>
                                </View>
                            ) : null
                        )}
                    />
                    {/* Add Team FAB (only if teams exist, otherwise centered button shows) */}
                    {tournamentTeams.length > 0 && (
                        <FAB
                            style={[styles.fab, { bottom: 16 }]}
                            icon="account-multiple-plus"
                            label="Add Teams"
                            onPress={() => setAddTeamModalVisible(true)}
                        />
                    )}
                </View>
            )}
            {activeTab === 'MATCHES' && (
                <FAB
                    style={styles.fab}
                    icon="plus"
                    label="New Match"
                    onPress={() => navigation.navigate('CreateMatch', { tournamentId })}
                />
            )}

            {/* Add Teams Modal */}
            <Portal>
                <Modal visible={addTeamModalVisible} onDismiss={() => setAddTeamModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Title>Add Teams to Tournament</Title>
                    <Searchbar
                        placeholder="Search teams..."
                        onChangeText={setTeamSearchQuery}
                        value={teamSearchQuery}
                        style={{ marginBottom: 10 }}
                    />
                    <View style={{ height: 300 }}>
                        {filteredAvailableTeams.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text>No available teams found.</Text>
                                <Button onPress={() => {
                                    setAddTeamModalVisible(false);
                                    navigation.navigate('CreateTeam');
                                }}>Create New Team</Button>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredAvailableTeams}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <List.Item
                                        title={item.name}
                                        left={() => <Checkbox status={selectedTeamIds.includes(item.id) ? 'checked' : 'unchecked'} onPress={() => toggleTeamSelection(item.id)} />}
                                        onPress={() => toggleTeamSelection(item.id)}
                                    />
                                )}
                            />
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <Button onPress={() => setAddTeamModalVisible(false)} style={{ marginRight: 10 }}>Cancel</Button>
                        <Button mode="contained" onPress={handleAddTeams} disabled={selectedTeamIds.length === 0}>Add Selected ({selectedTeamIds.length})</Button>
                    </View>
                    <Divider style={{ marginVertical: 10 }} />
                    <Button mode="outlined" onPress={() => {
                        setAddTeamModalVisible(false);
                        navigation.navigate('CreateTeam');
                    }}>Create New Team</Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        elevation: 2,
    },
    tabButton: {
        flex: 1,
        marginHorizontal: 5,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    matchCard: {
        marginBottom: 12,
        elevation: 2,
    },
    matchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    teamName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    matchStatus: {
        fontSize: 12,
        color: 'gray',
        textAlign: 'right'
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    deleteAction: {
        backgroundColor: '#dd2c00',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        marginBottom: 12,
        borderRadius: 4,
    },
    actionText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
