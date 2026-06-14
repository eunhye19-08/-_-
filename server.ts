/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// DB SERVICE (Supabase + Local fallback)
// ==========================================
let supabase: any = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const isUrlValid = supabaseUrl && (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"));

if (isUrlValid && supabaseKey && supabaseUrl !== "YOUR_SUPABASE_URL" && supabaseKey !== "YOUR_SUPABASE_KEY") {
  try {
    supabase = createClient(supabaseUrl!, supabaseKey);
    console.log("[Supabase] Client initialized successfully!");
  } catch (err) {
    console.error("[Supabase] Failed to initialize client:", err);
  }
} else {
  console.log("[Supabase] SUPABASE_URL or SUPABASE_KEY missing or invalid. Using transparent local JSON DB (profiles_db.json) for Auth & Profiles.");
}

const LOCAL_DB_PATH = path.join(process.cwd(), "profiles_db.json");

function readLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify({ users: {}, friends: {} }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
  } catch (e) {
    return { users: {}, friends: {} };
  }
}

function writeLocalDb(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[LocalDB] Write error:", err);
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Helper to handle Supabase DB calls with defensive fallback to local JSON DB
async function runDbOp<T>(supabaseOp: () => Promise<T>, localOp: () => T): Promise<T> {
  if (supabase) {
    try {
      return await supabaseOp();
    } catch (err: any) {
      console.warn("[DB] Supabase call failed. Falling back to local database. Error:", err.message || err);
      return localOp();
    }
  }
  return localOp();
}

// ==========================================
// IN-MEMORY MULTIPLAYER ROOM STORE
// ==========================================
interface Room {
  code: string;
  lobbyMode: "SOLO" | "INVITE";
  teacherCount: number;
  timeLimit: number;
  phase: string;
  hostId: string;
  players: { [id: string]: any }; // id is username
  bots: any[];
  keys: any[];
  doors: any[];
  eventLogs: any[];
  timeLeft: number;
  gateOpenCountdown: number | null;
  readyCountdown: number;
  lastUpdated: number;
}

const rooms: { [code: string]: Room } = {};

// Clean up dead rooms periodically (runs every 10 mins)
setInterval(() => {
  const now = Date.now();
  Object.keys(rooms).forEach((code) => {
    if (now - rooms[code].lastUpdated > 30 * 60 * 100) { // 30 mins inactive
      delete rooms[code];
      console.log(`[Manager] Cleaned up inactive room: ${code}`);
    }
  });
}, 10 * 60 * 1000);


// ==========================================
// GEMINI DIALOGUE / STORY CODES
// ==========================================
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY가 누락되었거나 활성화되지 않았습니다. 스마트 예비 리스트를 대신 사용하여 작동합니다.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}


// ==========================================
// AUTH & PROFILE ENDPOINTS
// ==========================================

// 1. Register User Profile
app.post("/api/auth/register", async (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password || !nickname) {
    return res.status(400).json({ error: "아이디, 비밀번호, 닉네임은 필수입니다." });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanNickname = nickname.trim();

  try {
    const result = await runDbOp(
      async () => {
        // Query supabase
        const { data: existing } = await supabase.from("profiles").select("username").eq("username", cleanUsername).maybeSingle();
        if (existing) {
          throw new Error("ALREADY_EXISTS");
        }
        
        const payload = {
          username: cleanUsername,
          password_hash: hashPassword(password),
          nickname: cleanNickname,
          level: 1,
          experience: 0,
          coins: 0,
          wins: 0,
          escapes: 0,
          arrests: 0,
          games_played: 0,
          title: "초보 탈출러",
          skin: "기본"
        };
        const { error } = await supabase.from("profiles").insert(payload);
        if (error) throw error;
        return payload;
      },
      () => {
        // Local fallback
        const db = readLocalDb();
        if (db.users[cleanUsername]) {
          throw new Error("ALREADY_EXISTS");
        }
        const payload = {
          username: cleanUsername,
          password_hash: hashPassword(password),
          nickname: cleanNickname,
          level: 1,
          experience: 0,
          coins: 0,
          wins: 0,
          escapes: 0,
          arrests: 0,
          games_played: 0,
          title: "초보 탈출러",
          skin: "기본"
        };
        db.users[cleanUsername] = payload;
        writeLocalDb(db);
        return payload;
      }
    );

    return res.json({ success: true, profile: result });
  } catch (err: any) {
    if (err.message === "ALREADY_EXISTS") {
      return res.status(400).json({ error: "이미 가입 완료된 아이디입니다." });
    }
    console.error("Registration error:", err);
    return res.status(500).json({ error: "가입 처리 중 오류 발생: " + err.message });
  }
});

// 2. Login User Profile
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "아이디와 비밀번호를 모두 입력하십시오." });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    const result = await runDbOp(
      async () => {
        const { data, error } = await supabase.from("profiles").select("*").eq("username", cleanUsername).maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error("NOT_FOUND");
        }
        if (data.password_hash !== hashPassword(password)) {
          throw new Error("WRONG_PASSWORD");
        }
        return data;
      },
      () => {
        const db = readLocalDb();
        const user = db.users[cleanUsername];
        if (!user) {
          throw new Error("NOT_FOUND");
        }
        if (user.password_hash !== hashPassword(password)) {
          throw new Error("WRONG_PASSWORD");
        }
        return user;
      }
    );

    return res.json({ success: true, profile: result });
  } catch (err: any) {
    if (err.message === "NOT_FOUND") {
      return res.status(400).json({ error: "존재하지 않는 아이디입니다." });
    }
    if (err.message === "WRONG_PASSWORD") {
      return res.status(400).json({ error: "비밀번호가 일치하지 않습니다." });
    }
    console.error("Login error:", err);
    return res.status(500).json({ error: "로그인 중 서버 오류 발생" });
  }
});

// 3. Get profile details (including win rate etc.)
app.get("/api/profile/:username", async (req, res) => {
  const cleanUsername = req.params.username.trim().toLowerCase();

  try {
    const profile = await runDbOp(
      async () => {
        const { data, error } = await supabase.from("profiles").select("*").eq("username", cleanUsername).maybeSingle();
        if (error) throw error;
        return data;
      },
      () => {
        const db = readLocalDb();
        return db.users[cleanUsername] || null;
      }
    );

    if (!profile) {
      return res.status(404).json({ error: "프로필을 찾을 수 없습니다." });
    }

    return res.json({ success: true, profile });
  } catch (err) {
    console.error("Get Profile error:", err);
    return res.status(500).json({ error: "프로필 취득 실패" });
  }
});

// 4. Update Profile stats after a game ends
app.post("/api/profile/update", async (req, res) => {
  const { username, winsUpdate, escapesUpdate, arrestsUpdate, coinsUpdate, xpUpdate } = req.body;
  if (!username) {
    return res.status(400).json({ error: "username 필수입니다." });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    const updated = await runDbOp(
      async () => {
        const { data: current } = await supabase.from("profiles").select("*").eq("username", cleanUsername).single();
        if (!current) throw new Error("NOT_FOUND");

        const gamesPlayed = (current.games_played || 0) + 1;
        const totalWins = (current.wins || 0) + (winsUpdate || 0);
        const totalEscapes = (current.escapes || 0) + (escapesUpdate || 0);
        const totalArrests = (current.arrests || 0) + (arrestsUpdate || 0);
        const totalCoins = (current.coins || 0) + (coinsUpdate || 0);
        const rawXp = (current.experience || 0) + (xpUpdate || 0);
        
        // Calculate dynamic level (100XP per level)
        const newLevel = Math.floor(rawXp / 100) + 1;
        
        // Calculate Dynamic User Title based on statistics
        let newTitle = current.title || "초보 탈출러";
        if (totalEscapes >= 10) newTitle = "탈출 엘리트";
        if (totalArrests >= 10) newTitle = "악몽의 주임교사";
        if (totalWins >= 30) newTitle = "은장고 가디언";
        if (totalWins >= 50) newTitle = "봉쇄 파괴자";

        const updatePayload = {
          wins: totalWins,
          escapes: totalEscapes,
          arrests: totalArrests,
          coins: totalCoins,
          experience: rawXp,
          games_played: gamesPlayed,
          level: newLevel,
          title: newTitle
        };

        const { error } = await supabase.from("profiles").update(updatePayload).eq("username", cleanUsername);
        if (error) throw error;
        
        return { username: cleanUsername, ...current, ...updatePayload };
      },
      () => {
        const db = readLocalDb();
        const current = db.users[cleanUsername];
        if (!current) throw new Error("NOT_FOUND");

        const gamesPlayed = (current.games_played || 0) + 1;
        const totalWins = (current.wins || 0) + (winsUpdate || 0);
        const totalEscapes = (current.escapes || 0) + (escapesUpdate || 0);
        const totalArrests = (current.arrests || 0) + (arrestsUpdate || 0);
        const totalCoins = (current.coins || 0) + (coinsUpdate || 0);
        const rawXp = (current.experience || 0) + (xpUpdate || 0);
        const newLevel = Math.floor(rawXp / 100) + 1;

        let newTitle = current.title || "초보 탈출러";
        if (totalEscapes >= 10) newTitle = "탈출 엘리트";
        if (totalArrests >= 10) newTitle = "악몽의 주임교사";
        if (totalWins >= 30) newTitle = "은장고 가디언";
        if (totalWins >= 50) newTitle = "봉쇄 파괴자";

        const updatePayload = {
          wins: totalWins,
          escapes: totalEscapes,
          arrests: totalArrests,
          coins: totalCoins,
          experience: rawXp,
          games_played: gamesPlayed,
          level: newLevel,
          title: newTitle
        };

        db.users[cleanUsername] = { ...current, ...updatePayload };
        writeLocalDb(db);
        return db.users[cleanUsername];
      }
    );

    return res.json({ success: true, profile: updated });
  } catch (err: any) {
    console.error("Stats update error:", err);
    return res.status(500).json({ error: "스탯 기록 연동 실패" });
  }
});

// 5. Add Friend endpoint (친구 추가)
app.post("/api/profile/add_friend", async (req, res) => {
  const { username, friendUsername } = req.body;
  if (!username || !friendUsername) {
    return res.status(400).json({ error: "본인 아이디와 친구 신청자 아이디가 필요합니다." });
  }

  const u1 = username.trim().toLowerCase();
  const u2 = friendUsername.trim().toLowerCase();

  if (u1 === u2) {
    return res.status(400).json({ error: "자기 자신은 구우 친구로 추가할 수 없습니다!" });
  }

  try {
    const success = await runDbOp(
      async () => {
        // Check friend exists
        const { data: fr } = await supabase.from("profiles").select("username").eq("username", u2).maybeSingle();
        if (!fr) throw new Error("FRIEND_NOT_FOUND");

        // Insert symmetric relations
        const { error: err1 } = await supabase.from("friends").insert({ user_username: u1, friend_username: u2 });
        // Fail silently on unique key violations (already friends)
        return true;
      },
      () => {
        const db = readLocalDb();
        if (!db.users[u2]) {
          throw new Error("FRIEND_NOT_FOUND");
        }
        
        if (!db.friends[u1]) db.friends[u1] = [];
        if (!db.friends[u2]) db.friends[u2] = [];

        if (!db.friends[u1].includes(u2)) db.friends[u1].push(u2);
        if (!db.friends[u2].includes(u1)) db.friends[u2].push(u1);

        writeLocalDb(db);
        return true;
      }
    );

    return res.json({ success: true, message: `${friendUsername}님과 친구가 되었습니다!` });
  } catch (err: any) {
    if (err.message === "FRIEND_NOT_FOUND") {
      return res.status(404).json({ error: "존재하지 않는 사용자 계정(ID)입니다." });
    }
    console.error("Friends link error:", err);
    return res.json({ success: true, message: "이미 친구 상태이거나 연계 완료되었습니다." });
  }
});

// 6. Get Friends List
app.get("/api/profile/friends/:username", async (req, res) => {
  const u1 = req.params.username.trim().toLowerCase();

  try {
    const list = await runDbOp(
      async () => {
        const { data, error } = await supabase.from("friends").select("friend_username").eq("user_username", u1);
        if (error) throw error;
        if (!data || data.length === 0) return [];

        const usernames = data.map((f: any) => f.friend_username);
        const { data: profiles, error: err2 } = await supabase.from("profiles").select("username, nickname, title, level, wins, escapes, arrests, games_played").in("username", usernames);
        if (err2) throw err2;
        return profiles || [];
      },
      () => {
        const db = readLocalDb();
        const friendsList = db.friends[u1] || [];
        return friendsList.map((fName: string) => {
          const profile = db.users[fName];
          if (profile) {
            return {
              username: profile.username,
              nickname: profile.nickname,
              title: profile.title,
              level: profile.level,
              wins: profile.wins,
              escapes: profile.escapes,
              arrests: profile.arrests,
              games_played: profile.games_played
            };
          }
          return null;
        }).filter(Boolean);
      }
    );

    return res.json({ success: true, friends: list });
  } catch (err) {
    console.error("Get friends list error:", err);
    return res.json({ success: true, friends: [] });
  }
});


// ==========================================
// ROOMS MULTIPLAYER CLUSTER ENDPOINTS
// ==========================================

// 1. Create Room (Host creates room)
app.post("/api/rooms", (req, res) => {
  const { code, hostId, hostNickname, studentRole, teacherRole, timeLimit, teacherCount, lobbyMode } = req.body;
  
  if (!code || !hostId) {
    return res.status(400).json({ error: "room code and hostId are required." });
  }

  const upperCode = code.trim().toUpperCase();

  // Initialize room state
  rooms[upperCode] = {
    code: upperCode,
    lobbyMode: lobbyMode || "SOLO",
    teacherCount: teacherCount || 1,
    timeLimit: timeLimit || 300,
    phase: "LOBBY",
    hostId: hostId,
    players: {
      [hostId]: {
        id: hostId,
        username: hostId,
        nickname: hostNickname,
        isHost: true,
        isAI: false,
        team: null,
        selectedStudentRole: studentRole,
        selectedTeacherRole: teacherRole,
        role: null,
        x: 5.5,
        y: 12.5,
        angle: 0,
        speed: 3.0,
        isCaptured: false,
        hasEscaped: false,
        cooldowns: {},
        lastActive: Date.now()
      }
    },
    bots: [],
    keys: [],
    doors: [],
    eventLogs: [],
    timeLeft: timeLimit || 300,
    gateOpenCountdown: null,
    readyCountdown: 30,
    lastUpdated: Date.now()
  };

  console.log(`[Lobby] Room created on server: ${upperCode} by Host: ${hostId}`);
  return res.json({ success: true, room: rooms[upperCode] });
});

// 2. Join Room (Guest enters room)
app.post("/api/rooms/join", (req, res) => {
  const { code, username, nickname, studentRole, teacherRole } = req.body;
  if (!code || !username) {
    return res.status(400).json({ error: "Room code and username are required." });
  }

  const upperCode = code.trim().toUpperCase();
  const room = rooms[upperCode];

  if (!room) {
    return res.status(404).json({ error: `[${upperCode}] 방을 찾을 수 없습니다. 초대 코드를 다시 확인해 주십시오.` });
  }

  // Insert player card
  room.players[username] = {
    id: username,
    username,
    nickname,
    isHost: room.hostId === username,
    isAI: false,
    team: null,
    selectedStudentRole: studentRole,
    selectedTeacherRole: teacherRole,
    role: null,
    x: 5.5,
    y: 12.5,
    angle: 0,
    speed: 3.0,
    isCaptured: false,
    hasEscaped: false,
    cooldowns: {},
    lastActive: Date.now()
  };

  room.lastUpdated = Date.now();
  console.log(`[Lobby] Guest joined Room: ${upperCode} - Name: ${nickname} (ID: ${username})`);
  return res.json({ success: true, room });
});

// 3. Start Room Game (Authoritative initial setup uploaded from Host)
app.post("/api/rooms/:code/start_game", (req, res) => {
  const { code } = req.params;
  const { players, keys, doors, timeLimit, readyCountdown } = req.body;

  const upperCode = code.toUpperCase();
  const room = rooms[upperCode];
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  // Convert array of players back into the room map
  if (players && Array.isArray(players)) {
    players.forEach((p: any) => {
      if (p.isAI) {
        // Bots are fine as separate entries in room.players or in bots
        room.players[p.id] = { ...p, lastActive: Date.now() };
      } else {
        const id = p.id;
        room.players[id] = { ...room.players[id], ...p, lastActive: Date.now() };
      }
    });
  }

  if (keys) room.keys = keys;
  if (doors) room.doors = doors;
  if (timeLimit) {
    room.timeLimit = timeLimit;
    room.timeLeft = timeLimit;
  }
  
  room.phase = "READY_TIME";
  room.readyCountdown = readyCountdown !== undefined ? readyCountdown : 30;
  room.lastUpdated = Date.now();

  console.log(`[Gameplay] Room started successfully on Server: ${upperCode}`);
  return res.json({ success: true, room });
});

// 4. Update Game coordinates & state snapshots periodically from both Host and Guests
app.post("/api/rooms/:code/update", (req, res) => {
  const { code } = req.params;
  const { playerId, player, bots, keys, doors, eventLogs, phase, timeLeft, gateOpenCountdown, readyCountdown, endingStory } = req.body;

  const upperCode = code.toUpperCase();
  const room = rooms[upperCode];
  if (!room) {
    return res.status(404).json({ error: "실시간 게임 세션 방이 존재하지 않거나 자동 폭파되었습니다." });
  }

  room.lastUpdated = Date.now();

  // Merging client player coordinate updates
  if (playerId && player) {
    room.players[playerId] = {
      ...room.players[playerId],
      ...player,
      lastActive: Date.now()
    };
  }

  // Host updates the rest of authoritative elements
  if (playerId === room.hostId) {
    if (bots) {
      room.bots = bots;
      if (Array.isArray(bots)) {
        bots.forEach((b: any) => {
          room.players[b.id] = {
            ...room.players[b.id],
            ...b,
            lastActive: Date.now()
          };
        });
      }
    }
    if (keys) room.keys = keys;
    if (doors) room.doors = doors;
    if (phase) room.phase = phase;
    if (timeLeft !== undefined) room.timeLeft = timeLeft;
    if (gateOpenCountdown !== undefined) room.gateOpenCountdown = gateOpenCountdown;
    if (readyCountdown !== undefined) room.readyCountdown = readyCountdown;
    if (endingStory !== undefined) (room as any).endingStory = endingStory;

    // Direct merge of logs: Host passes and appends system logs
    if (eventLogs && Array.isArray(eventLogs)) {
      const currentIds = new Set(room.eventLogs.map((l) => l.id));
      eventLogs.forEach((log) => {
        if (!currentIds.has(log.id)) {
          room.eventLogs.push(log);
        }
      });
      if (room.eventLogs.length > 40) {
        room.eventLogs = room.eventLogs.slice(-40);
      }
    }
  } else {
    // Ordinary guests can also merge client-originated event logs if they trigger an action (like Free Friend or Use Skill)
    if (eventLogs && Array.isArray(eventLogs)) {
      const currentIds = new Set(room.eventLogs.map((l) => l.id));
      eventLogs.forEach((log) => {
        if (!currentIds.has(log.id)) {
          room.eventLogs.push(log);
        }
      });
      if (room.eventLogs.length > 40) {
        room.eventLogs = room.eventLogs.slice(-40);
      }
    }
    // Also sync keys and doors if guest updates them (e.g. they pick up key or drop key)
    if (keys && Array.isArray(keys)) {
      room.keys = keys;
    }
    if (doors && Array.isArray(doors)) {
      room.doors = doors;
    }
  }

  // Compile full array to serve back immediately
  const returnPlayers = Object.values(room.players);

  return res.json({
    success: true,
    room: {
      ...room,
      players: returnPlayers
    }
  });
});

// 5. Fetch current state of room (GET Poll)
app.get("/api/rooms/:code", (req, res) => {
  const upperCode = req.params.code.toUpperCase();
  const room = rooms[upperCode];
  if (!room) {
    return res.status(404).json({ error: "대기방 정보 취득 실패" });
  }

  // Filter out disconnected guest players if they are silent for 15s (lobby safety)
  if (room.phase === "LOBBY") {
    const now = Date.now();
    Object.keys(room.players).forEach((pId) => {
      if (pId !== room.hostId && now - room.players[pId].lastActive > 15000) {
        delete room.players[pId];
        console.log(`[Cleanup] Dropped timed-out player ${pId} in room ${upperCode}`);
      }
    });
  }

  return res.json({
    success: true,
    room: {
      ...room,
      players: Object.values(room.players)
    }
  });
});


// API: 학교탈출 상황별 캐릭터 대사 인공지능 생성
app.post("/api/gemini/dialogue", async (req, res) => {
  const { characterName, situation, team } = req.body;

  if (!characterName || !situation) {
    return res.status(400).json({ error: "characterName and situation are required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ dialogue: `${characterName}: 야간 자율학습은 끝났다. 여기서 반드시 탈출한다!` });
  }

  try {
    const prompt = `
      너는 네이버 명작 웹툰 '약한영웅'의 원작 감성을 가득 담아 실감나는 대사를 뽑아내는 연색 연출가이다.
      상황: 야간 자율학습 중 통제 불능 상태로 갑자기 봉쇄된 고등학교에서 은밀하게 펼쳐지는 탈출 및 잡기 추격전.
      
      [요청 정보]
      - 캐릭터 이름 및 원작 특성: 
        * 연시은 (차갑고 고도로 정교함, 불필요한 말을 안 함, 이성적 독종)
        * 박후민 (강인하고 의리 넘치며 터프하고 듬직함, 정의롭고 우렁참)
        * 금성제 (성격이 미치광이 같고 잔혹하며 악당 같은 패기가 어마어마함, 거친 반말)
        * 안수호 (밝고 정이 많으며 정의롭고, 친구들을 지키기 위해 물불 안 가림)
        * 교사 A / 교사 B / 교사 C (권위적이고 성마른 학생부 교사, 밤중에 단체로 탈출하려는 학생들을 무조건 벌주려는 매서운 발소리 사냥꾼)
      - 해당 인물의 소속 팀: ${team === "STUDENT" ? "학생 연대" : "학교 교사단"}
      - 처해 있는 구체적 돌발 상황: ${situation} (예: '기절시키기 공격 중', '체포 상태', '생활지도실 구출', '정문 봉쇄 열기' 등)

      [제약 조건]
      1. 캐릭터 특유의 어조와 매력을 한층 날카롭게 부각한 '한국어 명대사 1개'를 뽑아줄 것.
      2. 반드시 1줄 요약된 독백 또는 대사 그 자체만 한글로 출력해라. 
      3. 따옴표(" 또는 ')나 발화자 이름 표시('연시은:', '박후민:')는 절대 추가하지 말고 대사 그 자체 알맹이만 출력하거라.
      4. 설명, 배경 묘사, 부연 설명은 1글자도 적지 마라.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.9,
      },
    });

    const dialogue = response.text ? response.text.trim() : "여기서 잡힐 순 없지. 끝까지 간다!";
    return res.json({ dialogue: dialogue.replace(/^["']|["']$/g, "") });
  } catch (error: any) {
    console.error("Gemini Dialogue API Error:", error);
    return res.json({ dialogue: `${characterName}: 이 지옥 같은 시험은 내가 끝내겠다.` });
  }
});

// API: 게임 승패 결과 및 생존 상황 요약 공포 소설풍 브리핑 생성
app.post("/api/gemini/story", async (req, res) => {
  const { isStudentVictory, escapedStudents, capturedStudents, gameTimeElapsed } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      story: isStudentVictory 
        ? "치열한 교사들의 사투 속에서 학교의 연동 제어장치를 모두 기동한 학생들이 새벽 정문을 열고 밤공기 너머로 극적으로 도망쳤다!" 
        : "결국 숨막히는 교사들의 추적에 의해 생활지도실 방은 어둡게 가득 차버렸고, 주동자 학생들은 처절한 벌점의 늪에서 탈출하지 못했다."
    });
  }

  try {
    const prompt = `
      네이버 인기 웹툰 '약한영웅' 테마의 야간 자율학습 고등학교 봉쇄 탈출전의 '최종 게임 결과 요약 스토리'를 긴장감 넘치고 으스스한 장편 소설의 에필로그처럼 3~4줄로 멋지게 작문해 주라.
      
      [매칭 데이터]
      - 최종 승리 팀: ${isStudentVictory ? "학생 연대 승리 (과반수 정문 돌파성공)" : "교사 사냥단 승리 (시간 초과 혹은 학생 포위검거)"}
      - 정문을 뚫고 무사히 탈출한 영웅들: ${escapedStudents && escapedStudents.length > 0 ? escapedStudents.join(", ") : "없음 (전멸)"}
      - 생활지도실에 끝내 갇혀버린 패배자들: ${capturedStudents && capturedStudents.length > 0 ? capturedStudents.join(", ") : "없음"}
      - 치열했던 사투 소요 시간: ${gameTimeElapsed}

      [작성 규칙]
      1. 마치 느와르 스릴러나 학원 공포 액션 소설의 감미롭고 무거운 결말 묘사처럼 극도로 긴박하고 분위기 넘치는 한국어로 장엄하게 쓸 것.
      2. '약한영웅' 원작 고유의 비장미를 살려서 3~4문장으로 서술할 것.
      3. 오직 생성된 소설 텍스트만 출력하고, 다른 부가적인 멘트나 서론은 일절 제외할 것.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.85,
      },
    });

    const story = response.text ? response.text.trim() : "밤은 깊었고, 학교는 침묵으로 잠겼다.";
    return res.json({ story });
  } catch (error: any) {
    console.error("Gemini Story API Error:", error);
    return res.json({ story: "야간 고등학교 탈출의 막이 내렸다. 한밤중의 비정하고 숨 가빴던 숨바꼭질은 적막한 여명과 함께 조용히 영원 속으로 묻혔다." });
  }
});

// Vite 및 정적 파일 라우팅 처리
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // 개발 모드: Vite 개발 서버 미들웨어 연동
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 프로덕션 모드: 빌드된 웹 에셋 제공
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] 약한영웅 학교탈출 게임 서버 작동중: http://0.0.0.0:${PORT}`);
  });
}

startServer();
