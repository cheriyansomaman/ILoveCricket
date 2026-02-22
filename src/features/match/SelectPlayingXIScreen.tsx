import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Button, Text, Checkbox, List, Appbar, SegmentedButtons, Chip } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMatchStore } from '../../store/matchStore';
import { useTeamStore } from '../../store/teamStore';
import { Player } from '../../types/models';

export default function SelectPlayingXIScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { matchId } = route.params;

    const match = useMatchStore(state => state.matches.find(m => m.id === matchId));
    const teams = useTeamStore(state => state.teams);
    const getTeamPlayers = useTeamStore(state => state.getTeamPlayers);
    const updateMatchPlayers = useMatchStore(state => state.updateMatchPlayers);

    const matchTeamA = teams.find(t => t.id === match?.teamAId);
    const matchTeamB = teams.find(t => t.id === match?.teamBId);

    const teamAPlayers = useMemo(() => matchTeamA ? getTeamPlayers(matchTeamA.id) : [], [matchTeamA, getTeamPlayers]);
    const teamBPlayers = useMemo(() => matchTeamB ? getTeamPlayers(matchTeamB.id) : [], [matchTeamB, getTeamPlayers]);

    // Initialize with existing selection if any, or empty
    const [selectedA, setSelectedA] = useState<string[]>(match?.teamAPlayerIds || []);
    const [selectedB, setSelectedB] = useState<string[]>(match?.teamBPlayerIds || []);

    // Auto-select first 11 if freshly starting and none selected? 
    // Maybe better to let user pick.

    const [activeTab, setActiveTab] = useState('teamA');

    if (!match || !matchTeamA || !matchTeamB) {
        return <View style={styles.center}><Text>Match Data Not Found</Text></View>;
    }

    const togglePlayer = (id: string, team: 'A' | 'B') => {
        if (team === 'A') {
            if (selectedA.includes(id)) {
                setSelectedA(prev => prev.filter(p => p !== id));
            } else {
                if (selectedA.length >= 11) {
                    Alert.alert("Limit Reached", "You can only select 11 players.");
                    return;
                }
                setSelectedA(prev => [...prev, id]);
            }
        } else {
            if (selectedB.includes(id)) {
                setSelectedB(prev => prev.filter(p => p !== id));
            } else {
                if (selectedB.length >= 11) {
                    Alert.alert("Limit Reached", "You can only select 11 players.");
                    return;
                }
                setSelectedB(prev => [...prev, id]);
            }
        }
    };

    const handleSave = async () => {
        if (selectedA.length === 0 || selectedB.length === 0) {
            Alert.alert("Incomplete", "Please select players for both teams.");
            return;
        }

        // Allow flexible playing numbers for local matches?
        // Usually 11, but let's just warn if < 2 maybe?
        if (selectedA.length < 2 || selectedB.length < 2) {
            Alert.alert("Warning", "Teams need at least 2 players.");
            return;
        }

        await updateMatchPlayers(matchId, selectedA, selectedB);
        navigation.navigate('Toss', { matchId });
    };

    const renderPlayerItem = ({ item }: { item: Player }) => {
        const isTeamA = activeTab === 'teamA';
        const isSelected = isTeamA ? selectedA.includes(item.id) : selectedB.includes(item.id);

        return (
            <List.Item
                title={item.name}
                description={item.role}
                left={() => <Checkbox status={isSelected ? 'checked' : 'unchecked'} />}
                onPress={() => togglePlayer(item.id, isTeamA ? 'A' : 'B')}
                style={{ backgroundColor: isSelected ? '#e3f2fd' : 'white', marginBottom: 1 }}
            />
        );
    };

    const currentCount = activeTab === 'teamA' ? selectedA.length : selectedB.length;

    return (
        <View style={styles.container}>
            <View style={[styles.header, { borderBottomColor: activeTab === 'teamA' ? (matchTeamA.color || '#eee') : (matchTeamB.color || '#eee'), borderBottomWidth: 3 }]}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={setActiveTab}
                    buttons={[
                        {
                            value: 'teamA',
                            label: `${matchTeamA.name} (${selectedA.length})`,
                        },
                        {
                            value: 'teamB',
                            label: `${matchTeamB.name} (${selectedB.length})`,
                        },
                    ]}
                />
            </View>
            <View style={styles.infoBar}>
                <Text style={{ color: 'gray' }}>Select Playing XI</Text>
                <Chip icon="account-group">{currentCount}/11</Chip>
            </View>

            <FlatList
                data={activeTab === 'teamA' ? teamAPlayers : teamBPlayers}
                keyExtractor={item => item.id}
                renderItem={renderPlayerItem}
                contentContainerStyle={styles.list}
            />

            <View style={styles.footer}>
                <Button mode="contained" onPress={handleSave} contentStyle={{ paddingVertical: 8 }}>
                    Proceed to Toss
                </Button>
            </View>
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
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    list: {
        paddingBottom: 80,
    },
    footer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    }
});
