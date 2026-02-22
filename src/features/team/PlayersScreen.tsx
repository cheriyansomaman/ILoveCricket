import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, Searchbar, List, FAB, Checkbox, Avatar, IconButton, Chip, Portal, Appbar } from 'react-native-paper';
import { useTeamStore } from '../../store/teamStore';
import { useNavigation } from '@react-navigation/native';
import { Player, PlayerRole, BatStyle, BowlStyle } from '../../types/models';

export default function PlayersScreen() {
    const navigation = useNavigation<any>();
    const allPlayers = useTeamStore((state) => state.players);
    const deletePlayersBulk = useTeamStore((state) => state.deletePlayersBulk);
    const deletePlayer = useTeamStore((state) => state.deletePlayer);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    // FAB Group state
    const [fabOpen, setFabOpen] = useState(false);

    // Filters
    const [roleFilter, setRoleFilter] = useState<PlayerRole | null>(null);
    const [batStyleFilter, setBatStyleFilter] = useState<BatStyle | null>(null);
    const [bowlStyleFilter, setBowlStyleFilter] = useState<BowlStyle | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const filteredPlayers = useMemo(() => {
        return allPlayers.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.jerseyNumber && p.jerseyNumber.includes(searchQuery));

            const matchesRole = roleFilter ? p.role === roleFilter : true;
            const matchesBatStyle = batStyleFilter ? p.batStyle === batStyleFilter : true;
            const matchesBowlStyle = bowlStyleFilter ? p.bowlStyle === bowlStyleFilter : true;

            return matchesSearch && matchesRole && matchesBatStyle && matchesBowlStyle;
        });
    }, [allPlayers, searchQuery, roleFilter, batStyleFilter, bowlStyleFilter]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedPlayerIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedPlayerIds(newSet);
    };

    const handleLongPress = (id: string) => {
        setSelectionMode(true);
        toggleSelection(id);
    };

    const cancelSelectionMode = () => {
        setSelectionMode(false);
        setSelectedPlayerIds(new Set());
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            'Delete Players',
            `Are you sure you want to delete ${selectedPlayerIds.size} player(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deletePlayersBulk(Array.from(selectedPlayerIds));
                        cancelSelectionMode();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Player }) => (
        <List.Item
            title={item.name}
            description={`#${item.jerseyNumber || '?'} • ${item.role}`}
            left={props => selectionMode ? (
                <View style={{ justifyContent: 'center', paddingLeft: 8 }}>
                    <Checkbox
                        status={selectedPlayerIds.has(item.id) ? 'checked' : 'unchecked'}
                        onPress={() => toggleSelection(item.id)}
                    />
                </View>
            ) : (
                <View style={{ justifyContent: 'center', paddingLeft: 16 }}>
                    {item.photoUri ? (
                        <Avatar.Image size={40} source={{ uri: item.photoUri }} />
                    ) : (
                        <Avatar.Text size={40} label={item.name.substring(0, 2).toUpperCase()} />
                    )}
                </View>
            )}
            right={props => !selectionMode && (
                <View style={{ flexDirection: 'row' }}>
                    <IconButton icon="pencil" onPress={() => navigation.navigate('CreatePlayer', { player: item })} />
                    <IconButton icon="delete" onPress={() => {
                        Alert.alert('Delete Player', `Delete ${item.name}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deletePlayer(item.id) }
                        ]);
                    }} />
                </View>
            )}
            onPress={() => {
                if (selectionMode) {
                    toggleSelection(item.id);
                } else {
                    navigation.navigate('CreatePlayer', { player: item });
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
                    <Appbar.Content title={`${selectedPlayerIds.size} Selected`} />
                    <Appbar.Action
                        icon="select-all"
                        onPress={() => {
                            if (selectedPlayerIds.size === filteredPlayers.length) {
                                setSelectedPlayerIds(new Set());
                            } else {
                                const allIds = new Set(filteredPlayers.map(p => p.id));
                                setSelectedPlayerIds(allIds);
                            }
                        }}
                    />
                    <Appbar.Action icon="delete" onPress={handleDeleteSelected} />
                </Appbar.Header>
            ) : null}

            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Search name or jersey no..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />
                <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                    <Chip icon={showFilters ? "chevron-up" : "chevron-down"} style={{ marginTop: 8 }}>Filters</Chip>
                </TouchableOpacity>
            </View>

            {showFilters && (
                <View style={styles.filterContainer}>
                    <Text variant="labelMedium" style={{ marginTop: 8 }}>Role:</Text>
                    <View style={styles.chipRow}>
                        {['BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'].map((r) => (
                            <Chip
                                key={r}
                                selected={roleFilter === r}
                                onPress={() => setRoleFilter(roleFilter === r ? null : r as PlayerRole)}
                                style={styles.filterChip}
                                showSelectedOverlay
                            >
                                {r.replace('_', ' ')}
                            </Chip>
                        ))}
                    </View>

                    <Text variant="labelMedium" style={{ marginTop: 8 }}>Batting Style:</Text>
                    <View style={styles.chipRow}>
                        {['RIGHT_HAND', 'LEFT_HAND'].map((s) => (
                            <Chip
                                key={s}
                                selected={batStyleFilter === s}
                                onPress={() => setBatStyleFilter(batStyleFilter === s ? null : s as BatStyle)}
                                style={styles.filterChip}
                                showSelectedOverlay
                            >
                                {s.replace('_', ' ')}
                            </Chip>
                        ))}
                    </View>

                    <Text variant="labelMedium" style={{ marginTop: 8 }}>Bowling Style:</Text>
                    <View style={styles.chipRow}>
                        {['RIGHT_ARM_FAST', 'RIGHT_ARM_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_SPIN', 'NONE'].map((s) => (
                            <Chip
                                key={s}
                                selected={bowlStyleFilter === s}
                                onPress={() => setBowlStyleFilter(bowlStyleFilter === s ? null : s as BowlStyle)}
                                style={styles.filterChip}
                                showSelectedOverlay
                            >
                                {s.replace('_', ' ')}
                            </Chip>
                        ))}
                    </View>
                </View>
            )}

            <FlatList
                data={filteredPlayers}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text>No players found.</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 100 }}
            />

            {!selectionMode && (
                <Portal>
                    <FAB.Group
                        open={fabOpen}
                        visible
                        icon={fabOpen ? 'close' : 'plus'}
                        actions={[
                            {
                                icon: 'account-plus',
                                label: 'New Player',
                                onPress: () => navigation.navigate('CreatePlayer'),
                            },
                            {
                                icon: 'account-multiple-plus',
                                label: 'Bulk Add Players',
                                onPress: () => navigation.navigate('BulkAddPlayers'),
                            },
                        ]}
                        onStateChange={({ open }) => setFabOpen(open)}
                    />
                </Portal>
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
    filterContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
    filterChip: {
        marginRight: 8,
        marginBottom: 8,
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
