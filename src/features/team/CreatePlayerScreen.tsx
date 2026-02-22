import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image, TouchableOpacity } from 'react-native';
import { TextInput, Button, SegmentedButtons, Text, Checkbox, List, Chip } from 'react-native-paper';
import { useTeamStore } from '../../store/teamStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PlayerRole, BatStyle, BowlStyle } from '../../types/models';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePlayerScreen() {
    const route = useRoute<any>();
    const { preSelectedTeamId, player } = route.params || {};

    const [name, setName] = useState(player?.name || '');
    const [jerseyNumber, setJerseyNumber] = useState(player?.jerseyNumber || '');
    const [role, setRole] = useState<PlayerRole>(player?.role || 'BATTER');
    const [batStyle, setBatStyle] = useState<BatStyle>(player?.batStyle || 'RIGHT_HAND');
    const [bowlStyle, setBowlStyle] = useState<BowlStyle>(player?.bowlStyle || 'RIGHT_ARM_FAST');
    const [image, setImage] = useState<string | null>(player?.photoUri || null);

    // Team selection
    const availableTeams = useTeamStore((state) => state.teams);
    const addPlayer = useTeamStore((state) => state.addPlayer);
    const updatePlayer = useTeamStore((state) => state.updatePlayer);
    const addPlayerToTeam = useTeamStore((state) => state.addPlayerToTeam);
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    // Auto-select team if passed or empty
    const [selectedTeams, setSelectedTeams] = useState<string[]>(preSelectedTeamId ? [preSelectedTeamId] : []);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const toggleTeamSelection = (teamId: string) => {
        if (selectedTeams.includes(teamId)) {
            setSelectedTeams(selectedTeams.filter(id => id !== teamId));
        } else {
            setSelectedTeams([...selectedTeams, teamId]);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Player name is required');
            return;
        }

        if (!jerseyNumber.trim()) {
            Alert.alert('Error', 'Jersey number is required');
            return;
        }

        setLoading(true);
        try {
            if (player) {
                // Update existing player
                await updatePlayer(player.id, {
                    name,
                    jerseyNumber,
                    role,
                    batStyle,
                    bowlStyle,
                    photoUri: image || undefined
                });
                Alert.alert('Success', 'Player updated successfully');
            } else {
                // Create new player
                const newPlayer = await addPlayer(
                    name,
                    role,
                    batStyle,
                    bowlStyle,
                    jerseyNumber,
                    image || undefined
                );

                // Add player to selected teams
                if (newPlayer && selectedTeams.length > 0) {
                    await Promise.all(selectedTeams.map(teamId => addPlayerToTeam(teamId, newPlayer.id)));
                }
                Alert.alert('Success', 'Player created successfully');
            }

            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to create player');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.imageContainer}>
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.image} />
                    ) : (
                        <Text style={styles.imagePlaceholder}>+ Photo</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Text variant="headlineSmall" style={{ textAlign: 'center', marginBottom: 16 }}>
                {player ? 'Edit Profile' : 'Create New Player'}
            </Text>

            <TextInput
                label="Player Name (Required)"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
            />

            <TextInput
                label="Jersey Number (Required)"
                value={jerseyNumber}
                onChangeText={setJerseyNumber}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
            />

            <Text style={styles.label}>Role</Text>
            <SegmentedButtons
                value={role}
                onValueChange={(val) => setRole(val as PlayerRole)}
                buttons={[
                    { value: 'BATTER', label: 'Bat' },
                    { value: 'BOWLER', label: 'Bowl' },
                    { value: 'ALL_ROUNDER', label: 'All' },
                    { value: 'WICKET_KEEPER', label: 'WK' },
                ]}
                style={styles.segment}
            />

            <Text style={styles.label}>Batting Style</Text>
            <SegmentedButtons
                value={batStyle}
                onValueChange={(val) => setBatStyle(val as BatStyle)}
                buttons={[
                    { value: 'RIGHT_HAND', label: 'Right' },
                    { value: 'LEFT_HAND', label: 'Left' },
                ]}
                style={styles.segment}
            />

            <Text style={styles.label}>Bowling Style</Text>
            <SegmentedButtons
                value={bowlStyle}
                onValueChange={(val) => setBowlStyle(val as BowlStyle)}
                buttons={[
                    { value: 'RIGHT_ARM_FAST', label: 'Fast' },
                    { value: 'RIGHT_ARM_SPIN', label: 'Spin' },
                    { value: 'NONE', label: 'None' },
                ]}
                style={styles.segment}
            />

            <Text style={styles.label}>Add to Teams (Optional)</Text>
            <View style={styles.teamContainer}>
                {availableTeams.length === 0 ? (
                    <Text style={{ color: 'gray', fontStyle: 'italic' }}>No teams created yet.</Text>
                ) : (
                    availableTeams.map(team => (
                        <Chip
                            key={team.id}
                            selected={selectedTeams.includes(team.id)}
                            onPress={() => toggleTeamSelection(team.id)}
                            style={styles.chip}
                            showSelectedOverlay
                        >
                            {team.name}
                        </Chip>
                    ))
                )}
            </View>

            <Button
                mode="contained"
                onPress={handleSave}
                style={styles.button}
                loading={loading}
                disabled={loading}
            >
                {player ? 'Save Changes' : 'Create Player'}
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    imagePicker: {
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
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        color: '#757575',
    },
    input: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        fontWeight: 'bold',
        marginTop: 8,
    },
    segment: {
        marginBottom: 16,
    },
    button: {
        marginTop: 24,
    },
    teamContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    chip: {
        marginRight: 8,
        marginBottom: 8,
    }
});
