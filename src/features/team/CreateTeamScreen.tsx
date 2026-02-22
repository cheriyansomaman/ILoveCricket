
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useTeamStore } from '../../store/teamStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { FlatList } from 'react-native';
import { List, IconButton, Avatar as PaperAvatar, Checkbox } from 'react-native-paper';

export default function CreateTeamScreen() {
    const route = useRoute<any>();
    const { teamId } = route.params || {};

    const teams = useTeamStore((state) => state.teams);
    const existingTeam = teamId ? teams.find(t => t.id === teamId) : null;

    const [name, setName] = useState(existingTeam?.name || '');
    const [shortName, setShortName] = useState(existingTeam?.shortName || '');
    const [color, setColor] = useState(existingTeam?.color || '');
    const [managerName, setManagerName] = useState(existingTeam?.managerName || '');
    const [sponsorName, setSponsorName] = useState(existingTeam?.sponsorName || '');
    const [logoUri, setLogoUri] = useState<string | null>(existingTeam?.logoUri || null);

    const createTeam = useTeamStore((state) => state.createTeam);
    const updateTeam = useTeamStore((state) => state.updateTeam);
    const getTeamPlayers = useTeamStore((state) => state.getTeamPlayers);
    const removePlayerFromTeam = useTeamStore((state) => state.removePlayerFromTeam);

    // Fetch players if editing
    const teamPlayers = teamId ? getTeamPlayers(teamId) : [];

    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);

    // Multi-select for players
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [memberSelectionMode, setMemberSelectionMode] = useState(false);

    const toggleMemberSelection = (id: string) => {
        const newSet = new Set(selectedMemberIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedMemberIds(newSet);
    };

    const cancelMemberSelectionMode = () => {
        setMemberSelectionMode(false);
        setSelectedMemberIds(new Set());
    };

    useEffect(() => {
        if (existingTeam) {
            setName(existingTeam.name);
            setShortName(existingTeam.shortName || '');
            setColor(existingTeam.color || '');
            setManagerName(existingTeam.managerName || '');
            setSponsorName(existingTeam.sponsorName || '');
            setLogoUri(existingTeam.logoUri || null);
            navigation.setOptions({ title: 'Edit Team' });
        }
    }, [existingTeam, navigation]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setLogoUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Team name is required');
            return;
        }

        // Short Name Validation: 2 or 3 Capital Letters
        if (!/^[A-Z]{2,3}$/.test(shortName)) {
            Alert.alert('Error', 'Short name must be 2 or 3 Capital Letters (e.g., MI, CSK)');
            return;
        }

        if (!color.trim()) {
            Alert.alert('Error', 'Team color is required');
            return;
        }

        setLoading(true);
        try {
            if (teamId) {
                await updateTeam(teamId, name, shortName, color, managerName, sponsorName, logoUri || undefined);
                Alert.alert('Success', 'Team updated successfully');
            } else {
                await createTeam(name, shortName, color, managerName, sponsorName, logoUri || undefined);
                Alert.alert('Success', 'Team created successfully');
            }
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to save team');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.logoContainer}>
                <TouchableOpacity onPress={pickImage} style={styles.logoPicker}>
                    {logoUri ? (
                        <Image source={{ uri: logoUri }} style={styles.logo} />
                    ) : (
                        <Text style={styles.logoPlaceholder}>+ Logo</Text>
                    )}
                </TouchableOpacity>
                <Text style={{ marginTop: 8, color: 'gray' }}>Tap to add logo (Optional)</Text>
            </View>

            <TextInput
                label="Team Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
            />
            <TextInput
                label="Short Name (2-3 CAP letters) *"
                value={shortName}
                onChangeText={(text) => setShortName(text.toUpperCase())} // Auto-caps
                mode="outlined"
                style={styles.input}
                maxLength={3}
            />
            <TextInput
                label="Team Color *"
                value={color}
                onChangeText={setColor}
                mode="outlined"
                placeholder="e.g. Blue, Yellow, #FF0000"
                style={styles.input}
            />

            <TextInput
                label="Manager Name (Optional)"
                value={managerName}
                onChangeText={setManagerName}
                mode="outlined"
                style={styles.input}
            />
            <TextInput
                label="Sponsor Name (Optional)"
                value={sponsorName}
                onChangeText={setSponsorName}
                mode="outlined"
                style={styles.input}
            />

            <Button
                mode="contained"
                onPress={handleSave}
                style={styles.button}
                loading={loading}
                disabled={loading}
            >
                {teamId ? 'Update Team Details' : 'Create Team'}
            </Button>

            {teamId && (
                <View style={styles.playersSection}>
                    {memberSelectionMode ? (
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <IconButton icon="close" onPress={cancelMemberSelectionMode} size={20} />
                                <Text variant="titleMedium">{selectedMemberIds.size} Selected</Text>
                            </View>
                            <IconButton
                                icon="delete"
                                iconColor="red"
                                onPress={() => {
                                    Alert.alert('Remove Players', `Remove ${selectedMemberIds.size} players?`, [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Remove',
                                            style: 'destructive',
                                            onPress: async () => {
                                                await Promise.all(Array.from(selectedMemberIds).map(pid => removePlayerFromTeam(teamId, pid)));
                                                cancelMemberSelectionMode();
                                            }
                                        }
                                    ]);
                                }}
                            />
                        </View>
                    ) : (
                        <View style={styles.sectionHeader}>
                            <Text variant="titleMedium">Team Players ({teamPlayers.length})</Text>
                            <Button
                                mode="text"
                                onPress={() => navigation.navigate('AddPlayerToTeam', { teamId })}
                                icon="plus"
                            >
                                Add
                            </Button>
                        </View>
                    )}

                    {teamPlayers.length === 0 ? (
                        <Text style={{ fontStyle: 'italic', color: 'gray', marginTop: 8 }}>No players in this team yet.</Text>
                    ) : (
                        teamPlayers.map(player => {
                            const isSelected = selectedMemberIds.has(player.id);
                            return (
                                <List.Item
                                    key={player.id}
                                    title={player.name}
                                    description={player.role}
                                    onLongPress={() => {
                                        setMemberSelectionMode(true);
                                        toggleMemberSelection(player.id);
                                    }}
                                    onPress={() => {
                                        if (memberSelectionMode) {
                                            toggleMemberSelection(player.id);
                                        }
                                    }}
                                    style={{ backgroundColor: isSelected ? '#f0f0f0' : 'transparent' }}
                                    left={props => memberSelectionMode ? (
                                        <View style={{ justifyContent: 'center' }}>
                                            <Checkbox
                                                status={isSelected ? 'checked' : 'unchecked'}
                                                onPress={() => toggleMemberSelection(player.id)}
                                            />
                                        </View>
                                    ) : (
                                        <View style={{ justifyContent: 'center', paddingLeft: 8 }}>
                                            {player.photoUri ? (
                                                <PaperAvatar.Image size={30} source={{ uri: player.photoUri }} />
                                            ) : (
                                                <PaperAvatar.Text size={30} label={player.name.substring(0, 2).toUpperCase()} />
                                            )}
                                        </View>
                                    )}
                                    right={props => !memberSelectionMode && (
                                        <IconButton
                                            icon="close"
                                            size={20}
                                            onPress={() => {
                                                Alert.alert('Remove Player', `Remove ${player.name} from team?`, [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Remove', style: 'destructive', onPress: () => removePlayerFromTeam(teamId, player.id) }
                                                ]);
                                            }}
                                        />
                                    )}
                                />
                            );
                        })
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 24,
    },
    playersSection: {
        marginTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoPicker: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        color: '#757575',
    },
});

