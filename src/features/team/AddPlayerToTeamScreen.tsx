import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Searchbar, List, FAB, Checkbox, Avatar } from 'react-native-paper';
import { useTeamStore } from '../../store/teamStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Player } from '../../types/models';

export default function AddPlayerToTeamScreen() {
    const route = useRoute<any>();
    const { teamId } = route.params;
    const navigation = useNavigation<any>();

    const allPlayers = useTeamStore((state) => state.players);
    const getTeamPlayers = useTeamStore((state) => state.getTeamPlayers);
    const addPlayerToTeam = useTeamStore((state) => state.addPlayerToTeam);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    // Filter players who are NOT in the team already
    const availablePlayers = useMemo(() => {
        const teamPlayers = getTeamPlayers(teamId);
        const teamPlayerIds = new Set(teamPlayers.map(p => p.id));

        return allPlayers.filter(p => !teamPlayerIds.has(p.id))
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [allPlayers, teamId, getTeamPlayers, searchQuery]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedPlayerIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedPlayerIds(newSet);
    };

    const handleAddSelected = async () => {
        if (selectedPlayerIds.size === 0) return;

        setLoading(true);
        try {
            await Promise.all(
                Array.from(selectedPlayerIds).map(playerId => addPlayerToTeam(teamId, playerId))
            );
            Alert.alert('Success', `Added ${selectedPlayerIds.size} players to the team.`);
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to add players.');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Player }) => (
        <List.Item
            title={item.name}
            description={`${item.role} • ${item.batStyle}`}
            left={props => (
                <View style={{ justifyContent: 'center', paddingLeft: 8 }}>
                    <Checkbox
                        status={selectedPlayerIds.has(item.id) ? 'checked' : 'unchecked'}
                        onPress={() => toggleSelection(item.id)}
                    />
                </View>
            )}
            onPress={() => toggleSelection(item.id)}
        />
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search players..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />
            </View>

            <FlatList
                data={availablePlayers}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text>No available players found.</Text>
                        <Text style={{ color: 'gray', marginTop: 8 }}>Create a new one below.</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    onPress={handleAddSelected}
                    disabled={selectedPlayerIds.size === 0 || loading}
                    loading={loading}
                    style={{ flex: 1, marginRight: 8 }}
                >
                    Add Selected ({selectedPlayerIds.size})
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('CreatePlayer', { preSelectedTeamId: teamId })}
                    style={{ flex: 1 }}
                    compact
                >
                    New
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('BulkAddPlayers', { preSelectedTeamId: teamId })}
                    style={{ flex: 1, marginLeft: 8 }}
                    compact
                >
                    Bulk New
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    searchContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchBar: {
        elevation: 0,
        backgroundColor: '#f5f5f5',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        flexDirection: 'row',
    },
});
