/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum StudentRole {
  YEON_SI_EUN = "연시은",
  PARK_HU_MIN = "박후민",
  KEUM_SUNG_JE = "금성제",
  AHN_SU_HO = "안수호"
}

export enum TeacherRole {
  TEACHER_A = "교사 A",
  TEACHER_B = "교사 B",
  TEACHER_C = "교사 C"
}

export enum GamePhase {
  LOBBY = "LOBBY",
  ROOM = "ROOM",
  ROLE_ASSIGN = "ROLE_ASSIGN",
  READY_TIME = "READY_TIME",
  PLAYING = "PLAYING",
  GAME_OVER = "GAME_OVER"
}

export interface CharacterInfo {
  name: string;
  avatar: string;
  skillName: string;
  skillDescription: string;
  cooldown: number; // 초
  description: string;
  quote: string;
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isAI: boolean;
  team: "STUDENT" | "TEACHER" | null;
  selectedStudentRole: StudentRole;
  selectedTeacherRole: TeacherRole;
  role: StudentRole | TeacherRole | null; // 배정된 실 역할
  x: number;
  y: number;
  angle: number; // 라디안
  speed: number;
  isCaptured: boolean; // 생활지도실 감금 여부
  hasEscaped: boolean; // 정문 탈출 성공 여부
  cooldowns: { [key: string]: number }; // 스킬 쿨다운 타이머 (초)
}

export type KeyColor = "RED" | "BLUE" | "YELLOW" | "GREEN" | "PURPLE";

export interface KeyItem {
  color: KeyColor;
  x: number;
  y: number;
  isHeld: boolean;
  heldBy: string | null; // playerId 또는 null
}

export interface LockDoor {
  color: KeyColor;
  x: number;
  y: number;
  isLocked: boolean;
  classroomName: string;
  buttonPressed: boolean;
}

export interface GameEventLog {
  id: string;
  timestamp: string;
  text: string;
  type: "system" | "danger" | "success" | "speech" | "skill";
}

export interface SoundIndicator {
  x: number;
  y: number;
  intensity: number; // 0~1
  duration: number; // 프레임 또는 ms
  color: string;
  id: string;
}

export interface Footprint {
  x: number;
  y: number;
  age: number; // 깎여 나갈 초 단위 타이머
}
