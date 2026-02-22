import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async () => {
    if (db) {
        return db;
    }
    db = await SQLite.openDatabaseAsync('cricket.db');
    return db;
};

export const initDB = async () => {
    const database = await getDB();

    await database.execAsync(`
    PRAGMA foreign_keys = ON;

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

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      shortName TEXT,
      color TEXT,
      logoUri TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER')),
      batStyle TEXT CHECK(batStyle IN ('RIGHT_HAND', 'LEFT_HAND')),
      bowlStyle TEXT CHECK(bowlStyle IN ('RIGHT_ARM_FAST', 'RIGHT_ARM_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_SPIN', 'NONE')),
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS team_players (
      teamId TEXT NOT NULL,
      playerId TEXT NOT NULL,
      isCaptain BOOLEAN DEFAULT 0,
      isWicketKeeper BOOLEAN DEFAULT 0,
      PRIMARY KEY (teamId, playerId),
      FOREIGN KEY(teamId) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(playerId) REFERENCES players(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS innings (
      id TEXT PRIMARY KEY NOT NULL,
      matchId TEXT NOT NULL,
      battingTeamId TEXT NOT NULL,
      bowlingTeamId TEXT NOT NULL,
      inningIndex INTEGER NOT NULL,
      totalRuns INTEGER DEFAULT 0,
      wickets INTEGER DEFAULT 0,
      oversBowled REAL DEFAULT 0.0,
      isDeclared BOOLEAN DEFAULT 0,
      isCompleted BOOLEAN DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(matchId) REFERENCES matches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS balls (
      id TEXT PRIMARY KEY NOT NULL,
      inningId TEXT NOT NULL,
      overNumber INTEGER NOT NULL,
      ballNumber INTEGER NOT NULL,
      strikerId TEXT NOT NULL,
      nonStrikerId TEXT NOT NULL,
      bowlerId TEXT NOT NULL,
      runsScored INTEGER DEFAULT 0,
      extrasType TEXT CHECK(extrasType IN ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY', 'NONE')) DEFAULT 'NONE',
      extrasRuns INTEGER DEFAULT 0,
      isWicket BOOLEAN DEFAULT 0,
      wicketType TEXT DEFAULT 'NONE',
      dismissedPlayerId TEXT,
      fielderId TEXT,
      shotX REAL,
      shotY REAL,
      shotZone TEXT,
      isValidBall BOOLEAN DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(inningId) REFERENCES innings(id) ON DELETE CASCADE,
      FOREIGN KEY(strikerId) REFERENCES players(id),
      FOREIGN KEY(bowlerId) REFERENCES players(id)
    );
  `);

    console.log('Database initialized successfully');
};
