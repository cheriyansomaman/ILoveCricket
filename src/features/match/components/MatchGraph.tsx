import React, { useMemo, useState } from 'react';
import { View, Dimensions, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { Ball } from '../../../types/models';

interface Props {
    balls1: Ball[];
    balls2?: Ball[];
    totalOvers: number;
    team1Name?: string;
    team2Name?: string;
}

export default function MatchGraph({ balls1, balls2 = [], totalOvers, team1Name = "Team 1", team2Name = "Team 2" }: Props) {
    const theme = useTheme();
    const [layoutWidth, setLayoutWidth] = useState(0);

    const processData = (ballList: Ball[]) => {
        let cumulativeRuns = 0;
        const points: { x: number; y: number; isWicket: boolean; ballText: string }[] = [];
        points.push({ x: 0, y: 0, isWicket: false, ballText: '' });

        const sorted = [...ballList].sort((a, b) => {
            const overDiff = a.overNumber - b.overNumber;
            if (overDiff !== 0) return overDiff;
            return a.ballNumber - b.ballNumber;
        });

        sorted.forEach((ball, index) => {
            cumulativeRuns += ball.runsScored + ball.extrasRuns;
            points.push({
                x: index + 1,
                y: cumulativeRuns,
                isWicket: ball.isWicket,
                ballText: `${ball.overNumber}.${ball.ballNumber}`
            });
        });
        return points;
    };

    const data1 = useMemo(() => processData(balls1), [balls1]);
    const data2 = useMemo(() => processData(balls2), [balls2]);

    if (balls1.length === 0 && balls2.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', color: 'gray' }}>No data to display graph</Text>
            </View>
        );
    }

    const handleLayout = (event: LayoutChangeEvent) => {
        setLayoutWidth(event.nativeEvent.layout.width);
    };

    const height = 250;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const width = layoutWidth || Dimensions.get('window').width - 40;
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    const maxRuns1 = data1.length > 0 ? data1[data1.length - 1].y : 0;
    const maxRuns2 = data2.length > 0 ? data2[data2.length - 1].y : 0;
    const maxRuns = Math.max(maxRuns1, maxRuns2, 10);

    const maxBalls1 = data1.length;
    const maxBalls2 = data2.length;
    const totalBalls = totalOvers * 6;
    const xMax = Math.max(totalBalls, maxBalls1, maxBalls2);

    const getX = (index: number) => padding.left + (index / xMax) * graphWidth;
    const getY = (runs: number) => padding.top + graphHeight - (runs / maxRuns) * graphHeight;

    const pointsString1 = data1.map((p) => `${getX(p.x)},${getY(p.y)}`).join(' ');
    const pointsString2 = data2.map((p) => `${getX(p.x)},${getY(p.y)}`).join(' ');

    return (
        <View style={styles.container} onLayout={handleLayout}>
            {/* Legend */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                    <View style={{ width: 10, height: 10, backgroundColor: theme.colors.primary, marginRight: 5 }} />
                    <Text style={{ fontSize: 12 }}>{team1Name}</Text>
                </View>
                {balls2.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 10, height: 10, backgroundColor: '#E91E63', marginRight: 5 }} />
                        <Text style={{ fontSize: 12 }}>{team2Name}</Text>
                    </View>
                )}
            </View>

            <Svg width={width} height={height}>
                {/* Axes */}
                <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke={theme.colors.onSurfaceVariant} strokeWidth="1" />
                <Line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke={theme.colors.onSurfaceVariant} strokeWidth="1" />

                {/* Y-Axis Grid & Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((factor) => {
                    const value = Math.round(maxRuns * factor);
                    const y = getY(value);
                    return (
                        <G key={`y-${value}`}>
                            <Line x1={padding.left - 5} y1={y} x2={width - padding.right} y2={y} stroke={theme.colors.onSurfaceVariant} strokeWidth="0.5" strokeOpacity={0.3} />
                            <SvgText x={padding.left - 10} y={y + 4} fill={theme.colors.onSurface} fontSize="10" textAnchor="end">{value}</SvgText>
                        </G>
                    );
                })}

                {/* X-Axis Grid & Labels */}
                {Array.from({ length: Math.ceil(xMax / 6) + 1 }, (_, i) => i * 6).map((val) => {
                    if (xMax > 60 && val % 12 !== 0 && val !== xMax) return null;
                    return (
                        <G key={`x-${val}`}>
                            <Line x1={getX(val)} y1={height - padding.bottom} x2={getX(val)} y2={height - padding.bottom + 5} stroke={theme.colors.onSurfaceVariant} strokeWidth="1" />
                            <SvgText x={getX(val)} y={height - padding.bottom + 15} fill={theme.colors.onSurface} fontSize="10" textAnchor="middle">{val}</SvgText>
                        </G>
                    );
                })}
                <SvgText x={width / 2} y={height - 5} fill={theme.colors.onSurface} fontSize="12" textAnchor="middle" fontWeight="bold">Balls</SvgText>

                {/* Lines */}
                <Polyline points={pointsString1} fill="none" stroke={theme.colors.primary} strokeWidth="2" />
                {data2.length > 0 && (
                    <Polyline points={pointsString2} fill="none" stroke="#E91E63" strokeWidth="2" />
                )}

                {/* Wickets */}
                {data1.filter(p => p.isWicket).map((p, i) => (
                    <Circle key={`w1-${i}`} cx={getX(p.x)} cy={getY(p.y)} r="3" fill="white" stroke={theme.colors.primary} strokeWidth="2" />
                ))}
                {data2.filter(p => p.isWicket).map((p, i) => (
                    <Circle key={`w2-${i}`} cx={getX(p.x)} cy={getY(p.y)} r="3" fill="white" stroke="#E91E63" strokeWidth="2" />
                ))}

            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 5,
        borderRadius: 8,
        marginVertical: 10,
        alignItems: 'center',
    }
});
