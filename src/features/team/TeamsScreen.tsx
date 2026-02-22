import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, Searchbar, List, FAB, Checkbox, Avatar, IconButton, Chip, Appbar } from 'react-native-paper';
import { useTeamStore } from '../../store/teamStore';
import { useNavigation } from '@react-navigation/native';
import { Team } from '../../types/models';

export default function TeamsScreen() {
    const navigation = useNavigation<any>();
    const teams = useTeamStore((state) => state.teams);
    const deleteTeamsBulk = useTeamStore((state) => state.deleteTeamsBulk);
    const deleteTeam = useTeamStore((state) => state.deleteTeam);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    const filteredTeams = useMemo(() => {
        return teams.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.shortName && t.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [teams, searchQuery]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedTeamIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedTeamIds(newSet);
    };

    const handleLongPress = (id: string) => {
        setSelectionMode(true);
        toggleSelection(id);
    };

    const cancelSelectionMode = () => {
        setSelectionMode(false);
        setSelectedTeamIds(new Set());
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            'Delete Teams',
            `Are you sure you want to delete ${selectedTeamIds.size} team(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTeamsBulk(Array.from(selectedTeamIds));
                        cancelSelectionMode();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Team }) => (
        <List.Item
            title={item.name}
            description={item.shortName ? `(${item.shortName})` : ''}
            left={props => selectionMode ? (
                <View style={{ justifyContent: 'center', paddingLeft: 8 }}>
                    <Checkbox
                        status={selectedTeamIds.has(item.id) ? 'checked' : 'unchecked'}
                        onPress={() => toggleSelection(item.id)}
                    />
                </View>
            ) : (
                <View style={{ justifyContent: 'center', paddingLeft: 16 }}>
                    {item.logoUri ? (
                        <Avatar.Image size={40} source={{ uri: item.logoUri }} />
                    ) : (
                        <Avatar.Text size={40} label={item.shortName || item.name.substring(0, 2).toUpperCase()} style={{ backgroundColor: item.color?.toLowerCase() || '#6200ee' }} />
                    )}
                </View>
            )}
            right={props => !selectionMode && (
                <View style={{ flexDirection: 'row' }}>
                    <IconButton icon="account-multiple-plus" onPress={() => navigation.navigate('BulkAddPlayers', { preSelectedTeamId: item.id })} />
                    <IconButton icon="pencil" onPress={() => navigation.navigate('CreateTeam', { teamId: item.id })} />
                    <IconButton icon="delete" onPress={() => {
                        Alert.alert('Delete Team', `Delete ${item.name}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteTeam(item.id) }
                        ]);
                    }} />
                </View>
            )}
            onPress={() => {
                if (selectionMode) {
                    toggleSelection(item.id);
                } else {
                    navigation.navigate('CreateTeam', { teamId: item.id });
                }
            }}
            onLongPress={() => handleLongPress(item.id)}
        />
    );

    return (
        <View style={styles.container}>
            {selectionMode ? (
                <Appbar.Header>
                    <Appbar.BackAction onPress={cancelSelectionMode} />
                    <Appbar.Content title={`${selectedTeamIds.size} Selected`} />
                    <Appbar.Action icon="delete" onPress={handleDeleteSelected} />
                </Appbar.Header>
            ) : null}

            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search teams..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />
            </View>

            <FlatList
                data={filteredTeams}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text>No teams found.</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            {!selectionMode && (
                <FAB
                    style={styles.fab}
                    icon="plus"
                    onPress={() => navigation.navigate('CreateTeam')}
                    label="New Team"
                />
            )}
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
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});
