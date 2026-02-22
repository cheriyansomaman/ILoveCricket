# 🏏 Live Cricket Scorer - Database Schema Design

This document details the SQLite database schema for the offline-first React Native app.

## Tables

### 1. `tournaments`
Stores tournament details.
```sql
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  startDate TEXT,
  endDate TEXT,
  location TEXT,
  oversLimit INTEGER DEFAULT 20,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `teams`
Stores team information.
```sql
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  shortName TEXT,
  color TEXT,
  logoUri TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `players`
Stores individual player profiles.
```sql
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER')),
  batStyle TEXT CHECK(batStyle IN ('RIGHT_HAND', 'LEFT_HAND')),
  bowlStyle TEXT CHECK(bowlStyle IN ('RIGHT_ARM_FAST', 'RIGHT_ARM_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_SPIN', 'NONE')),
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `team_players` (Junction Table)
Links players to teams. A player can be in multiple teams (e.g., different tournaments).
```sql
CREATE TABLE IF NOT EXISTS team_players (
  teamId TEXT NOT NULL,
  playerId TEXT NOT NULL,
  isCaptain BOOLEAN DEFAULT 0,
  isWicketKeeper BOOLEAN DEFAULT 0,
  PRIMARY KEY (teamId, playerId),
  FOREIGN KEY(teamId) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY(playerId) REFERENCES players(id) ON DELETE CASCADE
);
```

### 5. `matches`
Stores match metadata and state.
```sql
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY NOT NULL,
  tournamentId TEXT,
  teamAId TEXT NOT NULL,
  teamBId TEXT NOT NULL,
  tossWinnerId TEXT,
  battingFirstId TEXT,
  overs INTEGER DEFAULT 20,
  status TEXT CHECK(status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'ABANDONED')) DEFAULT 'SCHEDULED',
  winnerId TEXT,
  resultDescription TEXT,
  matchDate TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tournamentId) REFERENCES tournaments(id) ON DELETE SET NULL,
  FOREIGN KEY(teamAId) REFERENCES teams(id),
  FOREIGN KEY(teamBId) REFERENCES teams(id)
);
```

### 6. `innings`
Tracks the state of each innings within a match.
```sql
CREATE TABLE IF NOT EXISTS innings (
  id TEXT PRIMARY KEY NOT NULL,
  matchId TEXT NOT NULL,
  battingTeamId TEXT NOT NULL,
  bowlingTeamId TEXT NOT NULL,
  inningIndex INTEGER NOT NULL, -- 0 for 1st innings, 1 for 2nd
  totalRuns INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  oversBowled REAL DEFAULT 0.0,
  isDeclared BOOLEAN DEFAULT 0,
  isCompleted BOOLEAN DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(matchId) REFERENCES matches(id) ON DELETE CASCADE
);
```

### 7. `balls`
The core transactional table. Stores every ball bowled.
```sql
CREATE TABLE IF NOT EXISTS balls (
  id TEXT PRIMARY KEY NOT NULL,
  inningId TEXT NOT NULL,
  overNumber INTEGER NOT NULL, -- 0-based index of the over
  ballNumber INTEGER NOT NULL, -- 1-based index within the over
  strikerId TEXT NOT NULL,
  nonStrikerId TEXT NOT NULL,
  bowlerId TEXT NOT NULL,
  runsScored INTEGER DEFAULT 0, -- Runs off the bat
  extrasType TEXT CHECK(extrasType IN ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY', 'NONE')) DEFAULT 'NONE',
  extrasRuns INTEGER DEFAULT 0, -- Runs from extras
  isWicket BOOLEAN DEFAULT 0,
  wicketType TEXT CHECK(wicketType IN ('BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED', 'TIMED_OUT', 'OBSTRUCTING', 'NONE')) DEFAULT 'NONE',
  dismissedPlayerId TEXT, -- Usually striker, but could be non-striker for runout
  fielderId TEXT, -- For catch/runout
  shotX REAL, -- Normalized X coordinate (0.0 - 1.0) on field graphic
  shotY REAL, -- Normalized Y coordinate (0.0 - 1.0) on field graphic
  shotZone TEXT, -- e.g., 'LONG_ON', 'COVER'
  videoTimestamp REAL, -- Optional sync with video
  isValidBall BOOLEAN DEFAULT 1, -- False for wide/no-ball (for ball count purposes)
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(inningId) REFERENCES innings(id) ON DELETE CASCADE,
  FOREIGN KEY(strikerId) REFERENCES players(id),
  FOREIGN KEY(bowlerId) REFERENCES players(id)
);
```

## Indexes
For performance optimization:
```sql
CREATE INDEX idx_match_tournament ON matches(tournamentId);
CREATE INDEX idx_balls_inning ON balls(inningId);
CREATE INDEX idx_player_name ON players(name);
```
