import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, Text, Divider, Menu, TextInput } from 'react-native-paper';
import { useMatchStore } from '../../store/matchStore';
import { useTeamStore } from '../../store/teamStore';
import { useTournamentStore } from '../../store/tournamentStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-paper-dropdown';

import { useShallow } from 'zustand/react/shallow';

export default function CreateMatchScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { tournamentId } = route.params;

    const teams = useTeamStore((state) => state.teams);
    const createMatch = useMatchStore((state) => state.createMatch);
    const venues = useMatchStore(useShallow((state) => state.getAllVenues()));
    const tournament = useTournamentStore((state) => state.tournaments.find(t => t.id === tournamentId));

    const [teamA, setTeamA] = useState<string | null>(null);
    const [teamB, setTeamB] = useState<string | null>(null);

    // For dropdowns
    const [showTeamA, setShowTeamA] = useState(false);
    const [showTeamB, setShowTeamB] = useState(false);

    const [venue, setVenue] = useState('');
    const [showVenueMenu, setShowVenueMenu] = useState(false);

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // const [overs, setOvers] = useState('20');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!teamA || !teamB) {
            Alert.alert('Error', 'Please select two teams');
            return;
        }
        if (teamA === teamB) {
            Alert.alert('Error', 'Teams must be different');
            return;
        }
        if (!venue.trim()) {
            Alert.alert('Error', 'Please enter a venue');
            return;
        }

        setLoading(true);
        try {
            await createMatch(
                tournamentId,
                teamA,
                teamB,
                tournament?.oversLimit || 20,
                venue,
                date.toISOString()
            );
            Alert.alert('Success', 'Match scheduled!');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to create match');
        } finally {
            setLoading(false);
        }
    };

    const teamOptions = teams.map(t => ({ label: t.name, value: t.id }));

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(false);
        setDate(currentDate);
        // Automatically show time picker after date is picked (optional flow)
        // setShowTimePicker(true);
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowTimePicker(false);
        setDate(currentDate);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Team A</Text>
                    <Menu
                        visible={showTeamA}
                        onDismiss={() => setShowTeamA(false)}
                        anchor={
                            <Button mode="outlined" onPress={() => setShowTeamA(true)}>
                                {teamA ? teams.find(t => t.id === teamA)?.name : 'Select Team'}
                            </Button>
                        }
                    >
                        {teams.map((t) => (
                            <Menu.Item
                                key={t.id}
                                onPress={() => { setTeamA(t.id); setShowTeamA(false); }}
                                title={t.name}
                            />
                        ))}
                    </Menu>
                </View>
                <Text style={styles.vs}>VS</Text>
                <View style={styles.col}>
                    <Text style={styles.label}>Team B</Text>
                    <Menu
                        visible={showTeamB}
                        onDismiss={() => setShowTeamB(false)}
                        anchor={
                            <Button mode="outlined" onPress={() => setShowTeamB(true)}>
                                {teamB ? teams.find(t => t.id === teamB)?.name : 'Select Team'}
                            </Button>
                        }
                    >
                        {teams.map((t) => (
                            <Menu.Item
                                key={t.id}
                                onPress={() => { setTeamB(t.id); setShowTeamB(false); }}
                                title={t.name}
                            />
                        ))}
                    </Menu>
                </View>
            </View>

            <View style={styles.section}>
                <TextInput
                    label="Venue"
                    value={venue}
                    onChangeText={setVenue}
                    mode="outlined"
                    right={
                        venues.length > 0 && (
                            <TextInput.Icon
                                icon="menu-down"
                                onPress={() => setShowVenueMenu(true)}
                            />
                        )
                    }
                />
                {/* Venue Suggestions Menu anchored to input is tricky with TextInput.Icon, simplified with a Menu wrapping a hidden anchor or just using a separate button usually. 
                     Here i'll just use a Portal Menu or simplified approach for suggestions 
                 */}


                {venues.length > 0 && (
                    <View style={styles.suggestionContainer}>
                        <Text style={styles.suggestionLabel}>Suggestions:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {venues.map((v, index) => (
                                <TouchableOpacity key={index} onPress={() => setVenue(v)} style={styles.chip}>
                                    <Text>{v}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Date & Time</Text>
                <View style={styles.row}>
                    <Button mode="outlined" onPress={() => setShowDatePicker(true)} style={{ flex: 1, marginRight: 8 }}>
                        {date.toLocaleDateString()}
                    </Button>
                    <Button mode="outlined" onPress={() => setShowTimePicker(true)} style={{ flex: 1 }}>
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Button>
                </View>
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}
                {showTimePicker && (
                    <DateTimePicker
                        value={date}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                    />
                )}
            </View>



            <Button
                mode="contained"
                onPress={handleCreate}
                style={styles.button}
                disabled={loading}
                loading={loading}
            >
                Schedule Match
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    col: {
        flex: 1,
    },
    vs: {
        fontSize: 20,
        fontWeight: 'bold',
        marginHorizontal: 10,
        marginTop: 20, // Align with inputs
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    section: {
        marginBottom: 20,
    },
    button: {
        marginTop: 10,
    },
    suggestionContainer: {
        marginTop: 8,
    },
    suggestionLabel: {
        fontSize: 12,
        color: 'gray',
        marginBottom: 4,
    },
    chip: {
        backgroundColor: '#e0e0e0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
    }
});
