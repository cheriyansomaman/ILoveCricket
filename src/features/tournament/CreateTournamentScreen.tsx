import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, HelperText, SegmentedButtons, Text } from 'react-native-paper';
import { useTournamentStore } from '../../store/tournamentStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CricketFormat } from '../../types/models';

export default function CreateTournamentScreen() {
    const route = useRoute<any>();
    const { tournamentId } = route.params || {}; // Check if we are editing

    const updateTournament = useTournamentStore((state) => state.updateTournament);
    const tournamentToEdit = useTournamentStore((state) => state.tournaments.find(t => t.id === tournamentId));

    const [name, setName] = useState(tournamentToEdit?.name || '');
    const [location, setLocation] = useState(tournamentToEdit?.location || '');
    const [format, setFormat] = useState<CricketFormat>(tournamentToEdit?.format || 'T20');
    const [overs, setOvers] = useState(tournamentToEdit?.oversLimit?.toString() || '20');
    const createTournament = useTournamentStore((state) => state.createTournament);
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    // Auto-update overs based on format ONLY IF NOT Initial Load
    // We need to be careful not to overwrite existing overs when loading edit screen
    // Simple fix: Only update if user changes format
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    React.useEffect(() => {
        if (isInitialLoad) {
            setIsInitialLoad(false);
            return;
        }

        if (format === 'T20') setOvers('20');
        if (format === 'ODI') setOvers('50');
        if (format === 'T10') setOvers('10');
        // If custom, keep as is or clear? Let's keep as is to allow editing
    }, [format]);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Tournament name is required');
            return;
        }

        // Simple validation for overs
        const oversNum = parseInt(overs, 10);
        if (isNaN(oversNum) || oversNum <= 0) {
            Alert.alert('Error', 'Please enter a valid number of overs');
            return;
        }

        setLoading(true);
        try {
            if (tournamentId) {
                // UPDATE
                await updateTournament(tournamentId, { name, location, oversLimit: oversNum, format });
                Alert.alert("Success", "Tournament updated!");
            } else {
                // CREATE
                await createTournament(name, location, oversNum, format);
            }
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to save tournament');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                label="Tournament Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
            />
            <TextInput
                label="Location (Optional)"
                value={location}
                onChangeText={setLocation}
                mode="outlined"
                style={styles.input}
            />


            <View style={{ marginBottom: 16 }}>
                <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Cricket Format</Text>
                <SegmentedButtons
                    value={format}
                    onValueChange={val => setFormat(val as CricketFormat)}
                    buttons={[
                        { value: 'ODI', label: 'ODI' },
                        { value: 'T20', label: 'T20' },
                        { value: 'T10', label: 'T10' },
                        { value: 'CUSTOM', label: 'Custom' },
                    ]}
                />
            </View>

            <TextInput
                label="Overs Limit"
                value={overs}
                onChangeText={setOvers}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                disabled={format !== 'CUSTOM'}
            />

            <Button
                mode="contained"
                onPress={handleCreate}
                style={styles.button}
                loading={loading}
                disabled={loading}
            >

                {tournamentId ? "Update Tournament" : "Create Tournament"}
            </Button>
        </View>
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
        marginTop: 8,
    },
});
