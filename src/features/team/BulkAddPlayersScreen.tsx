import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, IconButton, Card, SegmentedButtons, Chip, Surface, Divider } from 'react-native-paper';
import { useTeamStore } from '../../store/teamStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PlayerRole, BatStyle, BowlStyle } from '../../types/models';

interface BulkPlayerEntry {
    tempId: string;
    name: string;
    jerseyNumber: string;
    role: PlayerRole;
    batStyle: BatStyle;
    bowlStyle: BowlStyle;
}

export default function BulkAddPlayersScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { preSelectedTeamId } = route.params || {};

    const availableTeams = useTeamStore((state) => state.teams);
    const addPlayersBulk = useTeamStore((state) => state.addPlayersBulk);
    const addPlayerToTeam = useTeamStore((state) => state.addPlayerToTeam);

    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(preSelectedTeamId || null);
    const [players, setPlayers] = useState<BulkPlayerEntry[]>([
        { tempId: '1', name: '', jerseyNumber: '', role: 'BATTER', batStyle: 'RIGHT_HAND', bowlStyle: 'RIGHT_ARM_FAST' }
    ]);
    const [loading, setLoading] = useState(false);

    const addRow = () => {
        setPlayers([
            ...players,
            {
                tempId: Math.random().toString(36).substr(2, 9),
                name: '',
                jerseyNumber: '',
                role: 'BATTER',
                batStyle: 'RIGHT_HAND',
                bowlStyle: 'RIGHT_ARM_FAST'
            }
        ]);
    };

    const removeRow = (tempId: string) => {
        if (players.length === 1) return;
        setPlayers(players.filter(p => p.tempId !== tempId));
    };

    const updatePlayer = (tempId: string, field: keyof BulkPlayerEntry, value: any) => {
        setPlayers(players.map(p => p.tempId === tempId ? { ...p, [field]: value } : p));
    };

    const handleSave = async () => {
        const validPlayers = players.filter(p => p.name.trim() !== '');
        if (validPlayers.length === 0) {
            Alert.alert('Error', 'Please add at least one player name');
            return;
        }

        setLoading(true);
        try {
            const createdPlayers = await addPlayersBulk(validPlayers.map(p => ({
                name: p.name,
                role: p.role,
                batStyle: p.batStyle,
                bowlStyle: p.bowlStyle,
                jerseyNumber: p.jerseyNumber
            })));

            if (selectedTeamId && createdPlayers) {
                await Promise.all(createdPlayers.map(p => addPlayerToTeam(selectedTeamId, p.id)));
            }

            Alert.alert('Success', `Successfully added ${createdPlayers.length} players`);
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to add players');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Surface style={styles.teamSelection} elevation={1}>
                    <Text variant="titleMedium" style={styles.label}>Select Team (Optional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamChipContainer}>
                        {availableTeams.map(team => (
                            <Chip
                                key={team.id}
                                selected={selectedTeamId === team.id}
                                onPress={() => setSelectedTeamId(selectedTeamId === team.id ? null : team.id)}
                                style={styles.chip}
                            >
                                {team.name}
                            </Chip>
                        ))}
                    </ScrollView>
                    {availableTeams.length === 0 && (
                        <Text style={styles.helperText}>No teams available. You can assign teams later.</Text>
                    )}
                </Surface>

                <View style={styles.playerList}>
                    {players.map((player, index) => (
                        <Card key={player.tempId} style={styles.card} mode="outlined">
                            <Card.Content>
                                <View style={styles.rowHeader}>
                                    <Text variant="titleSmall">Player #{index + 1}</Text>
                                    {players.length > 1 && (
                                        <IconButton
                                            icon="delete-outline"
                                            size={20}
                                            iconColor="red"
                                            onPress={() => removeRow(player.tempId)}
                                        />
                                    )}
                                </View>

                                <View style={styles.inputGrid}>
                                    <TextInput
                                        label="Name"
                                        value={player.name}
                                        onChangeText={(val) => updatePlayer(player.tempId, 'name', val)}
                                        mode="outlined"
                                        style={[styles.input, { flex: 2 }]}
                                        dense
                                    />
                                    <TextInput
                                        label="No."
                                        value={player.jerseyNumber}
                                        onChangeText={(val) => updatePlayer(player.tempId, 'jerseyNumber', val)}
                                        mode="outlined"
                                        style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                        keyboardType="numeric"
                                        dense
                                    />
                                </View>

                                <Text style={styles.subLabel}>Role</Text>
                                <SegmentedButtons
                                    value={player.role}
                                    onValueChange={(val) => updatePlayer(player.tempId, 'role', val)}
                                    density="small"
                                    buttons={[
                                        { value: 'BATTER', label: 'BAT' },
                                        { value: 'BOWLER', label: 'BOWL' },
                                        { value: 'ALL_ROUNDER', label: 'ALL' },
                                        { value: 'WICKET_KEEPER', label: 'WK' },
                                    ]}
                                    style={styles.segmented}
                                />

                                <View style={styles.inputGrid}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.subLabel}>Batting Style</Text>
                                        <SegmentedButtons
                                            value={player.batStyle}
                                            onValueChange={(val) => updatePlayer(player.tempId, 'batStyle', val)}
                                            density="small"
                                            buttons={[
                                                { value: 'RIGHT_HAND', label: 'RHB' },
                                                { value: 'LEFT_HAND', label: 'LHB' },
                                            ]}
                                        />
                                    </View>
                                </View>

                                <Text style={styles.subLabel}>Bowling Style</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <SegmentedButtons
                                        value={player.bowlStyle}
                                        onValueChange={(val) => updatePlayer(player.tempId, 'bowlStyle', val)}
                                        density="small"
                                        buttons={[
                                            { value: 'RIGHT_ARM_FAST', label: 'RAF' },
                                            { value: 'RIGHT_ARM_SPIN', label: 'RAS' },
                                            { value: 'LEFT_ARM_FAST', label: 'LAF' },
                                            { value: 'LEFT_ARM_SPIN', label: 'LAS' },
                                            { value: 'NONE', label: 'None' },
                                        ]}
                                        style={{ minWidth: 450 }}
                                    />
                                </ScrollView>
                            </Card.Content>
                        </Card>
                    ))}
                </View>

                <Button
                    mode="outlined"
                    icon="plus"
                    onPress={addRow}
                    style={styles.addBtn}
                >
                    Add Another Row
                </Button>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    style={styles.saveBtn}
                    contentStyle={{ height: 50 }}
                >
                    Add {players.filter(p => p.name.trim() !== '').length} Players
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
    scrollContent: {
        padding: 16,
    },
    teamSelection: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    teamChipContainer: {
        marginTop: 8,
    },
    chip: {
        marginRight: 8,
    },
    label: {
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        fontStyle: 'italic',
    },
    playerList: {
        marginBottom: 8,
    },
    card: {
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputGrid: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    input: {
        backgroundColor: '#fff',
    },
    subLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    segmented: {
        marginBottom: 4,
    },
    addBtn: {
        marginTop: 8,
        borderColor: '#6200ee',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    saveBtn: {
        borderRadius: 8,
    },
    bottomSpacer: {
        height: 40,
    }
});
