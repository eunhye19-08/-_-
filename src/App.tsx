/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  StudentRole,
  TeacherRole,
  GamePhase,
  Player,
  KeyItem,
  LockDoor,
  GameEventLog,
  KeyColor,
} from "./types";
import { MainLobby, STUDENT_CHARACTERS, TEACHER_CHARACTERS } from "./components/MainLobby";
import { FirstPersonCanvas } from "./components/FirstPersonCanvas";
import { StatusPanel } from "./components/StatusPanel";
import { SCHOOL_MAP, MAP_WIDTH, MAP_HEIGHT, CLASSROOMS, getDistance, checkCollision } from "./utils/map";
import { fetchGeminiDialogue, fetchGeminiStory } from "./utils/gemini";
import { Shield, Sparkles, LogOut, RotateCcw, Award, Users, Trash } from "lucide-react";

// 초기 상태 세팅 헬퍼들
const INITIAL_KEYS: KeyItem[] = [
  { color: "RED", x: 14, y: 13, isHeld: false, heldBy: null },
  { color: "BLUE", x: 1, y: 6, isHeld: false, heldBy: null },
  { color: "YELLOW", x: 10, y: 3, isHeld: false, heldBy: null },
  { color: "GREEN", x: 5, y: 13, isHeld: false, heldBy: null },
  { color: "PURPLE", x: 14, y: 2, isHeld: false, heldBy: null },
];

const INITIAL_DOORS: LockDoor[] = [
  { color: "RED", x: 2, y: 7, isLocked: true, classroomName: "1학년 1반(빨강)", buttonPressed: false },
  { color: "BLUE", x: 13, y: 7, isLocked: true, classroomName: "1학년 2반(파랑)", buttonPressed: false },
  { color: "YELLOW", x: 2, y: 11, isLocked: true, classroomName: "과학실(노랑)", buttonPressed: false },
  { color: "GREEN", x: 13, y: 11, isLocked: true, classroomName: "보건실(초록)", buttonPressed: false },
  { color: "PURPLE", x: 8, y: 5, isLocked: true, classroomName: "미술실(보라)", buttonPressed: false },
];

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOBBY);

  // 로비 사양 저장
  const [nickname, setNickname] = useState("은장고탈출러");
  const [prefStudent, setPrefStudent] = useState<StudentRole>(StudentRole.YEON_SI_EUN);
  const [prefTeacher, setPrefTeacher] = useState<TeacherRole>(TeacherRole.TEACHER_A);
  const [teacherCount, setTeacherCount] = useState<number>(1);
  const [timeLimit, setTimeLimit] = useState<number>(300);

  // 인게임 시뮬레이션용 데이터 스테이트
  const [players, setPlayers] = useState<Player[]>([]);
  const [keys, setKeys] = useState<KeyItem[]>(INITIAL_KEYS);
  const [doors, setDoors] = useState<LockDoor[]>(INITIAL_DOORS);
  const [eventLogs, setEventLogs] = useState<GameEventLog[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [gateOpenCountdown, setGateOpenCountdown] = useState<number | null>(null);

  // 기절 상태 교사들 추적 (교사ID -> 기절 풀릴 타임스탬프)
  const stunnedTeachers = useRef<{ [playerId: string]: number }>({});
  // 문을 잠가둔 상태 (색상 -> 잠금 풀릴 타임스탬프)
  const classroomShutters = useRef<{ [color: string]: number }>({});

  // 교사 A&B 능력 표적용
  const [activeFootprints, setActiveFootprints] = useState<{ [playerId: string]: { x: number; y: number; age: number }[] }>({});
  const [teachersScanActive, setTeachersScanActive] = useState<boolean>(false);

  // 엔딩 스토리 에필로그 출력용
  const [endingStory, setEndingStory] = useState<string>("");
  const [loadingEnding, setLoadingEnding] = useState<boolean>(false);

  // 화면 흔들림 효과 변수
  const [screenShake, setScreenShake] = useState(false);

  // ==========================================
  // LOG MANAGER
  // ==========================================
  const addLog = (text: string, type: "system" | "danger" | "success" | "speech" | "skill" = "system") => {
    const timeStr = new Date().toLocaleTimeString("ko-KR", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const newLog: GameEventLog = {
      id: Math.random().toString(),
      timestamp: timeStr,
      text,
      type,
    };
    setEventLogs((prev) => [newLog, ...prev.slice(0, 48)]);
  };

  // ==========================================
  // GAME RE-BOOT SETUP
  // ==========================================
  const handleStartSetup = (setup: {
    nickname: string;
    studentRole: StudentRole;
    teacherRole: TeacherRole;
    teacherCount: number;
    timeLimit: number;
    participants?: { name: string; ready: boolean; avatar: string }[];
  }) => {
    setNickname(setup.nickname);
    setPrefStudent(setup.studentRole);
    setPrefTeacher(setup.teacherRole);
    setTeacherCount(setup.teacherCount);
    setTimeLimit(setup.timeLimit);
    setTimeLeft(setup.timeLimit);

    setPhase(GamePhase.ROLE_ASSIGN);

    // 2초 뒤 역할 배정 루프 트리거
    setTimeout(() => {
      assignRoles(setup);
    }, 2000);
  };

  // 역할 랜덤 고배정
  const assignRoles = (setup: {
    nickname: string;
    studentRole: StudentRole;
    teacherRole: TeacherRole;
    teacherCount: number;
    timeLimit: number;
    participants?: { name: string; ready: boolean; avatar: string }[];
  }) => {
    // 6명 참가자 생성 (1 플레이어 + dynamic list of lobbied participants)
    const botPool = setup.participants && setup.participants.length > 0
      ? setup.participants.map((p, pIdx) => {
          const studentRoles = [StudentRole.YEON_SI_EUN, StudentRole.PARK_HU_MIN, StudentRole.KEUM_SUNG_JE, StudentRole.AHN_SU_HO];
          const teacherRoles = [TeacherRole.TEACHER_A, TeacherRole.TEACHER_B, TeacherRole.TEACHER_C];
          return {
            nickname: p.name,
            s: studentRoles[pIdx % studentRoles.length],
            t: teacherRoles[pIdx % teacherRoles.length]
          };
        })
      : [
          { nickname: "은장고박지성", s: StudentRole.YEON_SI_EUN, t: TeacherRole.TEACHER_B },
          { nickname: "볼펜깎이인형", s: StudentRole.YEON_SI_EUN, t: TeacherRole.TEACHER_A },
          { nickname: "수호단대장", s: StudentRole.AHN_SU_HO, t: TeacherRole.TEACHER_C },
          { nickname: "형신고빠따짱", s: StudentRole.KEUM_SUNG_JE, t: TeacherRole.TEACHER_A },
          { nickname: "삼인조막둥이", s: StudentRole.PARK_HU_MIN, t: TeacherRole.TEACHER_C },
        ];

    // 교사 배당 인덱스 무작위 추출
    const totalCount = 1 + botPool.length;
    const actualTeacherCount = Math.min(setup.teacherCount, Math.max(1, Math.floor(totalCount / 2)));
    const teacherIndices = new Set<number>();
    while (teacherIndices.size < actualTeacherCount) {
      teacherIndices.add(Math.floor(Math.random() * totalCount));
    }

    const initialPlayers: Player[] = [];

    // 플레이러 카드 생성
    const isPlayerTeacher = teacherIndices.has(0);
    initialPlayers.push({
      id: "player",
      nickname: setup.nickname,
      isHost: true,
      isAI: false,
      team: isPlayerTeacher ? "TEACHER" : "STUDENT",
      selectedStudentRole: setup.studentRole,
      selectedTeacherRole: setup.teacherRole,
      role: isPlayerTeacher ? setup.teacherRole : setup.studentRole,
      x: isPlayerTeacher ? 8.5 : 5.5, // 교사는 중앙, 학생은 다른 교실 근처 스폰
      y: isPlayerTeacher ? 8.5 : 12.5,
      angle: 0,
      speed: isPlayerTeacher ? 2.5 : 3.0,
      isCaptured: false,
      hasEscaped: false,
      cooldowns: {},
    });

    // 봇 카드 생성
    botPool.forEach((bot, bIdx) => {
      const idxInList = bIdx + 1;
      const isBotTeacher = teacherIndices.has(idxInList);

      initialPlayers.push({
        id: `bot_${idxInList}`,
        nickname: bot.nickname,
        isHost: false,
        isAI: true,
        team: isBotTeacher ? "TEACHER" : "STUDENT",
        selectedStudentRole: bot.s,
        selectedTeacherRole: bot.t,
        role: isBotTeacher ? bot.t : bot.s,
        // 무작위 거점 스폰 배치
        x: isBotTeacher ? 8.5 : 2.5 + Math.random() * 11,
        y: isBotTeacher ? 8.5 : 4.5 + Math.random() * 9,
        angle: Math.random() * Math.PI * 2,
        speed: isBotTeacher ? 2.4 : 2.8,
        isCaptured: false,
        hasEscaped: false,
        cooldowns: {},
      });
    });

    setPlayers(initialPlayers);
    setKeys(JSON.parse(JSON.stringify(INITIAL_KEYS))); // 깊은 카피 복작
    setDoors(JSON.parse(JSON.stringify(INITIAL_DOORS)));
    setEventLogs([]);
    stunnedTeachers.current = {};
    classroomShutters.current = {};
    setActiveFootprints({});
    setTeachersScanActive(false);
    setGateOpenCountdown(null);
    setEndingStory("");

    // 메인 오프닝 브리핑 로깅
    addLog("🏫 야간 자율학습 도중 갑작스런 학교 락다운 봉쇄 경고가 울렸습니다!", "danger");
    addLog("교사들은 야간 무단 도망 학생 단체 체포 작전을 개시했습니다.", "danger");
    addLog(`배정 결과: 플레이어 ${setup.nickname}님은 [${isPlayerTeacher ? "교사 팀" : "학생 팀"}] 입니다!`, "success");

    // 30초 대기(READY_TIME) 진입!
    setPhase(GamePhase.READY_TIME);
  };

  // ==========================================
  // READY_TIME & PLAYING GAME TIMERS
  // ==========================================
  const [readyCountdown, setReadyCountdown] = useState(30);

  useEffect(() => {
    if (phase === GamePhase.READY_TIME) {
      setReadyCountdown(30);
      addLog("⏱️ [준비정각 30초 시작] 교사는 30초 동안 대기 상태에 돌입합니다. 학생은 즉시 피신하세요!", "system");

      const readyTimer = setInterval(() => {
        setReadyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(readyTimer);
            setPhase(GamePhase.PLAYING);
            addLog("🔴 [30초 대기 완료] 교사가 행동을 시작합니다! 학교 수배령이 활성화되었습니다.", "danger");
            return 0;
          }
          if (prev === 20 || prev === 10 || prev === 5) {
            addLog(`준비 자율 대피 시간 ${prev}초 남음...`, "system");
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(readyTimer);
    }
  }, [phase]);

  // 플레이 게임 본 타이머 1초마다 실질 작동
  useEffect(() => {
    if (phase === GamePhase.PLAYING) {
      const mainTimer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(mainTimer);
            handleGameOver(false); // 시간 초과 -> 교사이김
            return 0;
          }

          // 1분 간격 브리핑 경보
          if (prev % 60 === 0 && prev > 0) {
            addLog(`⏱️ 학교 락다운 완전 폐쇄까지 남은 시간: ${prev / 60}분...`, "danger");
          }

          return prev - 1;
        });

        // 쿨다운 상태 차감
        setPlayers((prevPlayers) =>
          prevPlayers.map((p) => {
            const nextCD = { ...p.cooldowns };
            let hasChanged = false;
            Object.keys(nextCD).forEach((k) => {
              if (nextCD[k] > 0) {
                nextCD[k] -= 1;
                hasChanged = true;
              }
            });
            return hasChanged ? { ...p, cooldowns: nextCD } : p;
          })
        );

        // 교사 A 발소리 추적 정보 연령 감쇄
        setActiveFootprints((prev) => {
          const next: typeof prev = {};
          let changed = false;
          Object.entries(prev).forEach(([pId, rawList]) => {
            const list = rawList as { x: number; y: number; age: number }[];
            const upd = list
              .map((f) => ({ ...f, age: f.age - 1 }))
              .filter((f) => f.age > 0);
            if (upd.length > 0) {
              next[pId] = upd;
            }
            changed = true;
          });
          return changed ? next : prev;
        });
      }, 1000);

      return () => clearInterval(mainTimer);
    }
  }, [phase]);

  // 정문 오픈 시 60초 긴장 카운트다운 타이머
  useEffect(() => {
    if (phase === GamePhase.PLAYING && gateOpenCountdown !== null) {
      const gTimer = setInterval(() => {
        setGateOpenCountdown((prev) => {
          if (prev === null) {
            clearInterval(gTimer);
            return null;
          }
          if (prev <= 1) {
            clearInterval(gTimer);
            // 카운트다운 종료 -> 결과 정산
            checkFinalVictoryState();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(gTimer);
    }
  }, [phase, gateOpenCountdown, players]);

  // ==========================================
  // REAL-TIME AI BOTS BRAIN (행동 양식 루프)
  // ==========================================
  useEffect(() => {
    if (phase !== GamePhase.PLAYING && phase !== GamePhase.READY_TIME) return;

    const aiInterval = setInterval(() => {
      setPlayers((prevPlayers) => {
        // 플레이어 본인은 조작 제외
        const playerObj = prevPlayers.find((p) => p.id === "player")!;

        // 1. 발소리 흔적 가치 갱신 (교사 A 감지용, 교실/이동 시 발바닥 흔적 축적)
        prevPlayers.forEach((p) => {
          if (p.team === "STUDENT" && !p.isCaptured && !p.hasEscaped) {
            // 20% 확률로 현 위치 발자국 마킹
            if (Math.random() < 0.25) {
              setActiveFootprints((fprev) => {
                const list = fprev[p.id] || [];
                return {
                  ...fprev,
                  [p.id]: [...list.slice(-12), { x: p.x, y: p.y, age: 10 }],
                };
              });
            }
          }
        });

        const nextPlayers = prevPlayers.map((p) => {
          if (!p.isAI) return p; // 본인은 AI가 아님
          if (p.isCaptured || p.hasEscaped) return p; // 감금/탈출 상태는 지능행동 불가

          const isBotTeacher = p.team === "TEACHER";

          // 준비시간(READY_TIME) 일 때 교사봇은 강제 대기 작동
          if (phase === GamePhase.READY_TIME && isBotTeacher) {
            return p;
          }

          // 교사 기절 수치 체크
          const stunUntil = stunnedTeachers.current[p.id] || 0;
          if (isBotTeacher && Date.now() < stunUntil) {
            // 기절 중임: 가만히 서 있음
            return p;
          }

          let dx = 0;
          let dy = 0;
          let nextAngle = p.angle;

          // 공동 잠금 상태 사양
          const lockedDoorsMap: { [key: string]: boolean } = {};
          doors.forEach((d) => (lockedDoorsMap[d.color] = d.isLocked));
          const allButtonsOn = doors.every((d) => d.buttonPressed);

          // ----------------------------------------
          // A. 교사 AI 봇의 사냥 및 수색 행동 양식
          // ----------------------------------------
          if (isBotTeacher) {
            // 수색 타깃 탐색: 가장 가까운 잡히지 않은 학생
            let targetStudent: Player | null = null;
            let minDist = Infinity;

            prevPlayers.forEach((s) => {
              if (s.team === "STUDENT" && !s.isCaptured && !s.hasEscaped) {
                const d = getDistance(p.x, p.y, s.x, s.y);
                if (d < minDist) {
                  minDist = d;
                  targetStudent = s;
                }
              }
            });

            if (targetStudent && minDist < 6.0) {
              // 사거리에 포착됨: 학생 방향으로 타깃 추정 가속
              const target: Player = targetStudent;
              nextAngle = Math.atan2(target.y - p.y, target.x - p.x);
              dx = Math.cos(nextAngle) * p.speed * 0.12;
              dy = Math.sin(nextAngle) * p.speed * 0.12;

              // 체포 성립 타격 판정 (거리 0.95 이내 접촉!)
              if (minDist < 0.95) {
                // 잡기 발동: 해당 학생 생활지도실로 송환 및 감금!
                triggerArrest(p, target);
              }
            } else {
              // 타깃 유실 시 무주공산 무작위 순찰
              if (Math.random() < 0.08) {
                nextAngle += (Math.random() - 0.5) * 1.5;
              }
              dx = Math.cos(nextAngle) * p.speed * 0.06;
              dy = Math.sin(nextAngle) * p.speed * 0.06;
            }

            // 가끔 장애물 교착 대비 문 봉쇄(교사 C 특성일 때)
            if (p.role === TeacherRole.TEACHER_C && Math.random() < 0.02) {
              // 문 임시 봉쇄 발동 시뮬
              const nearDoor = doors.find((d) => d.isLocked && getDistance(p.x, p.y, d.x, d.y) < 2.0);
              if (nearDoor) {
                triggerTeacherCShutter(nearDoor.color);
              }
            }

          } else {
            // ----------------------------------------
            // B. 학생 AI 봇의 협동 탈출 행동 양식
            // ----------------------------------------
            // 1순위: 교사가 가까이 오면 소스라치게 반대 방향 도망 (비상 공포 기동)
            let scariestTeacher: Player | null = null;
            let teachDist = Infinity;

            prevPlayers.forEach((t) => {
              if (t.team === "TEACHER") {
                const isStunned = Date.now() < (stunnedTeachers.current[t.id] || 0);
                if (!isStunned) {
                  const d = getDistance(p.x, p.y, t.x, t.y);
                  if (d < teachDist) {
                    teachDist = d;
                    scariestTeacher = t;
                  }
                }
              }
            });

            if (scariestTeacher && teachDist < 3.2) {
              // 교사의 반대 벡터로 이동
              const teacher: Player = scariestTeacher;
              const escapeAngle = Math.atan2(p.y - teacher.y, p.x - teacher.x);
              nextAngle = escapeAngle;
              dx = Math.cos(nextAngle) * p.speed * 0.14;
              dy = Math.sin(nextAngle) * p.speed * 0.14;

              // 학생 고유 위기 저지용 기절 스킬 발동 무작위 시뮬레이터 (금성제, 박후민, 연시은)
              if (teachDist < 1.05 && Math.random() < 0.6) {
                triggerStudentCounterSkill(p, teacher);
              }
            } else {
              // 교사가 안전 반경일 때 협동 기동 전략
              // 만약 5개 제어 버튼이 모두 가동되었으면 정문(8.5, 14.5)으로 돌진!
              if (allButtonsOn) {
                const gateX = 8.5;
                const gateY = 14.5;
                const distToGate = getDistance(p.x, p.y, gateX, gateY);
                if (distToGate < 1.0) {
                  // 탈출 성공 처리!
                  p.hasEscaped = true;
                  addLog(`🎉 학생 봇 [${p.nickname}] 정문을 통과해 비장하게 탈출 성공!`, "success");
                } else {
                  nextAngle = Math.atan2(gateY - p.y, gateX - p.x);
                  dx = Math.cos(nextAngle) * p.speed * 0.1;
                  dy = Math.sin(nextAngle) * p.speed * 0.1;
                }
              } else {
                // 정문 오픈 전 미션 수행 루프:
                // 혹시 소지한 열쇠가 있다면 교실 자물쇠로 가거나, 아니면 바닥의 열쇠를 향해 수집하러 이동
                const myHeldKey = keys.find((k) => k.isHeld && k.heldBy === p.id);

                if (myHeldKey) {
                  // 색깔 자물쇠 교실 도달 무브
                  const matchDoor = doors.find((d) => d.color === myHeldKey.color && d.isLocked);
                  if (matchDoor) {
                    const dDist = getDistance(p.x, p.y, matchDoor.x, matchDoor.y);
                    if (dDist < 1.3) {
                      // 자물쇠 즉각 개방!
                      matchDoor.isLocked = false;
                      myHeldKey.isHeld = false;
                      myHeldKey.heldBy = null;
                      addLog(`🔓 학생 봇 [${p.nickname}]이 [${matchDoor.classroomName}] 자물쇠 해제!`, "success");
                    } else {
                      nextAngle = Math.atan2(matchDoor.y - p.y, matchDoor.x - p.x);
                      dx = Math.cos(nextAngle) * p.speed * 0.09;
                      dy = Math.sin(nextAngle) * p.speed * 0.09;
                    }
                  } else {
                    // 이미 따져 있는 문인데 버튼이 아직 안 눌려 있음
                    const matchedClass = CLASSROOMS.find((cl) => cl.color === myHeldKey.color);
                    const matchPressed = doors.find((d) => d.color === myHeldKey.color)?.buttonPressed;
                    if (matchedClass && !matchPressed) {
                      const btnDist = getDistance(p.x, p.y, matchedClass.buttonX, matchedClass.buttonY);
                      if (btnDist < 1.25) {
                        // 버튼 기동!
                        triggerButtonPress(matchedClass.color as KeyColor, p.nickname);
                      } else {
                        nextAngle = Math.atan2(matchedClass.buttonY - p.y, matchedClass.buttonX - p.x);
                        dx = Math.cos(nextAngle) * p.speed * 0.09;
                        dy = Math.sin(nextAngle) * p.speed * 0.09;
                      }
                    } else {
                      // 정처 없이 방황 무브
                      if (Math.random() < 0.1) nextAngle += (Math.random() - 0.5) * 2;
                      dx = Math.cos(nextAngle) * p.speed * 0.07;
                      dy = Math.sin(nextAngle) * p.speed * 0.07;
                    }
                  }
                } else {
                  // 열쇠가 없을 때: 맵의 수집되지 않은 안전한 바닥의 열쇠 가동 탐색
                  let nearestKey: KeyItem | null = null;
                  let keyDist = Infinity;
                  keys.forEach((key) => {
                    if (!key.isHeld) {
                      const d = getDistance(p.x, p.y, key.x, key.y);
                      if (d < keyDist) {
                        keyDist = d;
                        nearestKey = key;
                      }
                    }
                  });

                  if (nearestKey && keyDist < 7.0) {
                    const tk: KeyItem = nearestKey;
                    if (keyDist < 1.0) {
                      // 수취!
                      tk.isHeld = true;
                      tk.heldBy = p.id;
                      addLog(`🔑 학생 봇 [${p.nickname}]이 [${tk.color} 열쇠]를 획득했습니다!`, "success");
                    } else {
                      nextAngle = Math.atan2(tk.y - p.y, tk.x - p.x);
                      dx = Math.cos(nextAngle) * p.speed * 0.08;
                      dy = Math.sin(nextAngle) * p.speed * 0.08;
                    }
                  } else {
                    // 구출 협동 우선순위: 생활지도의 방에 누군가 갇혀 있고, 자신이 위험지역(교사 근처)이 아닐 때 소수 구출하러 이송!
                    const trappedStudent = prevPlayers.find((s) => s.team === "STUDENT" && s.isCaptured);
                    if (trappedStudent && Math.random() < 0.3) {
                      // 생활지도실 좌표(1.5, 1.5) 구변 무브
                      const lx = 1.5;
                      const ly = 1.5;
                      const lDist = getDistance(p.x, p.y, lx, ly);
                      if (lDist < 1.45) {
                        // 즉시 구출
                        freeCapturedStudent(trappedStudent, p.nickname);
                      } else {
                        nextAngle = Math.atan2(ly - p.y, lx - p.x);
                        dx = Math.cos(nextAngle) * p.speed * 0.08;
                        dy = Math.sin(nextAngle) * p.speed * 0.08;
                      }
                    } else {
                      // 자유 순회 탐색
                      if (Math.random() < 0.1) nextAngle += (Math.random() - 0.5) * 1.8;
                      dx = Math.cos(nextAngle) * p.speed * 0.07;
                      dy = Math.sin(nextAngle) * p.speed * 0.07;
                    }
                  }
                }
              }
            }

            // 안수호 원격 수호천사 스킬 시전 시뮬레이션 (3분 쿨다운)
            if (p.role === StudentRole.AHN_SU_HO && Math.random() < 0.01) {
              const trapped = prevPlayers.find((s) => s.team === "STUDENT" && s.isCaptured);
              const customSkillCD = p.cooldowns["MAIN"] || 0;
              if (trapped && customSkillCD === 0) {
                // 원격수호 천사!
                freeCapturedStudent(trapped, `${p.nickname} (수호천사 원격기동)`);
                p.cooldowns["MAIN"] = 180; // 3분 쿨다운 걸기
                addLog(`✨ 안수호 봇 [${p.nickname}] 수호천사 기동! 갇힌 동료를 무선 해제 구출했습니다!`, "skill");
              }
            }
          }

          // 벽 충돌 제약 연산
          const testX = p.x + dx;
          const testY = p.y + dy;

          const testLockedMap: { [key: string]: boolean } = {};
          doors.forEach((da) => (testLockedMap[da.color] = da.isLocked));

          const coll = checkCollision(testX, testY, testLockedMap, allButtonsOn);
          if (!coll.collided) {
            return {
              ...p,
              x: testX,
              y: testY,
              angle: nextAngle,
            };
          } else {
            // 다른 각도로 우회 시도
            return {
              ...p,
              angle: nextAngle + (Math.random() - 0.5) * 2,
            };
          }
        });

        return nextPlayers;
      });
    }, 110); // 110ms 마다 틱 진행

    return () => clearInterval(aiInterval);
  }, [phase, keys, doors]);

  // ==========================================
  // IN-GAME ACTION LOGIC HANDLERS
  // ==========================================

  // 1. 학생 체포 이벤트 발생기
  const triggerArrest = async (teacher: Player, student: Player) => {
    student.isCaptured = true;
    student.x = 1.5; // 생활지도실 내부 스폰
    student.y = 1.5;

    // 만약 주우기 한 열쇠가 있다면 방 바닥에 떨어뜨리기
    setKeys((prevKeys) =>
      prevKeys.map((k) =>
        k.heldBy === student.id ? { ...k, isHeld: false, heldBy: null, x: student.x + 0.5, y: student.y + 0.5 } : k
      )
    );

    addLog(`🚨 교사 [${teacher.nickname}(${teacher.role})]가  학생 [${student.nickname}] 체포! 생활지도실로 감금 수감`, "danger");

    // 제미니 인물 대사 연동
    const tLine = await fetchGeminiDialogue(teacher.role as string, "체포당함", "TEACHER");
    const sLine = await fetchGeminiDialogue(student.role as string, "체포당함", "STUDENT");

    addLog(`${teacher.nickname}(교사): "${tLine}"`, "speech");
    addLog(`${student.nickname}(학생): "${sLine}"`, "speech");

    // 만약 플레이어가 잡혔거나 다른 사람이 잡혀 게임 진행 상황 여부 확인
    checkFinalVictoryState();
  };

  // 2. 생활지도실 감금 학생 자유 구출기
  const freeCapturedStudent = (trapped: Player, rescuerNickname: string) => {
    trapped.isCaptured = false;
    // 자유 입구 스폰
    trapped.x = 4.5;
    trapped.y = 1.5;
    addLog(`✨ [${rescuerNickname}]가 생활지도실 문 앞에서 자물쇠를 풀고 [${trapped.nickname}] 구출 구명 성공!`, "success");
  };

  // 3. 학생 위기 역습 카운터 스킬 발동기
  const triggerStudentCounterSkill = async (student: Player, teacher: Player) => {
    const stunTimer = stunnedTeachers.current[teacher.id] || 0;
    if (Date.now() < stunTimer) return; // 이미 기절함

    let stunSec = 5;
    let actName = "볼펜 역습";

    if (student.role === StudentRole.YEON_SI_EUN) {
      stunSec = 5;
      actName = "볼펜 찌르기";
    } else if (student.role === StudentRole.PARK_HU_MIN) {
      stunSec = 6;
      actName = "농구공 스맥다운 강타";
    } else if (student.role === StudentRole.KEUM_SUNG_JE) {
      stunSec = 6;
      actName = "금성제 크럼블 빠따질";
    } else {
      return; 
    }

    // 쿨다운 등록
    const hasCDObj = student.cooldowns["MAIN"] || 0;
    if (hasCDObj > 0) return; // 아직 쿨다운 중

    // 스킬 발사! 교사 기절 작동
    stunnedTeachers.current[teacher.id] = Date.now() + stunSec * 1000;
    student.cooldowns["MAIN"] = 40; // 40초 쿨타늄 배정

    // 교사 뒤로 팅겨내기 수평 넉백
    const kbAngle = student.angle;
    const kbResult = checkCollision(teacher.x + Math.cos(kbAngle) * 2.0, teacher.y + Math.sin(kbAngle) * 2.0, {}, false);
    teacher.x = kbResult.x;
    teacher.y = kbResult.y;

    addLog(`⚡ 학생 [${student.nickname}]이 [${actName}] 스킬 기습 가동! 교사 [${teacher.nickname}] ${stunSec}초간 기절 넉백 시전!`, "skill");

    // 제미니 대사
    const speech = await fetchGeminiDialogue(student.role as string, "기절시키기", "STUDENT");
    addLog(`${student.nickname}(학생): "${speech}"`, "speech");
  };

  // 4. 교사 C 문 봉쇄 락다운
  const triggerTeacherCShutter = (color: string) => {
    const currentLock = classroomShutters.current[color] || 0;
    if (Date.now() < currentLock) return; // 이미 잠김

    classroomShutters.current[color] = Date.now() + 15000; // 15초 바인딩
    setDoors((prev) =>
      prev.map((d) => (d.color === color ? { ...d, isLocked: true } : d))
    );
    addLog(`🔒 교사 C의 권한으로 [${color}]색 교실의 원격 도어가 15초간 특수 폐쇄되었습니다!`, "danger");

    // 15초 복원 타이머
    setTimeout(() => {
      setDoors((prev) =>
        prev.map((d) => (d.color === color ? { ...d, isLocked: false } : d))
      );
      addLog(`⚙️ [${color}]색 교실 특수 폐쇄 셔터가 작동 한계로 인해 다시 해제되었습니다.`, "system");
    }, 15000);
  };

  // 5. 교실 내 컴퓨터 버튼 가동기
  const triggerButtonPress = (color: KeyColor, actorName: string) => {
    setDoors((prevDoors) => {
      const target = prevDoors.find((d) => d.color === color);
      if (target && !target.buttonPressed) {
        addLog(`🟢 [${actorName}] 등이 [${target.classroomName}] 제어기 전원 가동 버튼 작동 성공!`, "success");
        const next = prevDoors.map((d) => (d.color === color ? { ...d, buttonPressed: true } : d));

        // 5개 연동 가동 완료 조사
        const allOn = next.every((d) => d.buttonPressed);
        if (allOn) {
          // 정문 오픈 전율 연출!
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 2000);
          setGateOpenCountdown(60); // 60초 긴급 대정문 폭발 시간 개시
          addLog("📢 <정문 오픈> 락다운 제어장치 연동 버튼 5개 기동 확인! 학교 정문이 활짝 오픈되었습니다!", "success");
          addLog("🚨 [데드라인 카운트다운 60초 가동] 학생들은 60초 안에 하단 중앙 정문 타일로 도망쳐 탈출하십시오!", "danger");
        }

        return next;
      }
      return prevDoors;
    });
  };

  // ==========================================
  // PLAYER MOVEMENT & INTERACTIONS (USER)
  // ==========================================
  const handlePlayerMove = (x: number, y: number, angle: number) => {
    const pSelf = players.find((p) => p.id === "player");
    if (!pSelf) return;

    // 교적인 경우 READY_TIME 단체 봉쇄 대기 시간 중 이동 불허
    if (phase === GamePhase.READY_TIME && pSelf.team === "TEACHER") {
      return;
    }

    setPlayers((prev) => {
      const nextPlayers = prev.map((p) => (p.id === "player" ? { ...p, x, y, angle } : p));
      
      // 교사 플레이어(본인)이고 인게임 상황인 경우, 주변의 잡히지 않은 학생 봇 접촉(충돌) 시 즉각 체포 성립!
      if (pSelf.team === "TEACHER" && phase === GamePhase.PLAYING) {
        // 동시성 상태 변경을 위해 동기화
        const targetStudent = nextPlayers.find(
          (s) => s.team === "STUDENT" && !s.isCaptured && !s.hasEscaped && getDistance(x, y, s.x, s.y) < 0.98
        );
        if (targetStudent) {
          setTimeout(() => {
            triggerArrest(pSelf, targetStudent);
          }, 0);
        }
      }
      return nextPlayers;
    });
  };

  // 플레이어 상호작용 E 처리
  const handlePlayerInteract = async () => {
    const pSelf = players.find((p) => p.id === "player")!;
    if (pSelf.isCaptured || pSelf.hasEscaped) return;

    // 1. 바닥 열쇠 획득 시도
    for (const key of keys) {
      if (!key.isHeld && getDistance(pSelf.x, pSelf.y, key.x, key.y) < 1.25) {
        // 이미 다른 색 열쇠를 쥐고 있다면? 교체 방식을 간단히 Drop 처리하거나 여러 개 가용
        // 여기선 1번에 1개만 편리하게 수취하는 가이드라인 적용
        const myPrevKey = keys.find((k) => k.isHeld && k.heldBy === pSelf.id);
        if (myPrevKey) {
          myPrevKey.isHeld = false;
          myPrevKey.heldBy = null;
          myPrevKey.x = pSelf.x;
          myPrevKey.y = pSelf.y;
          addLog(`🎒 [가방 연동] 기존에 들고 있던 [${myPrevKey.color} 열쇠]를 바닥에 내려놓았습니다.`, "system");
        }

        setKeys((prev) =>
          prev.map((k) => (k.color === key.color ? { ...k, isHeld: true, heldBy: pSelf.id } : k))
        );
        addLog(`🔑 [${pSelf.nickname}] 플레이어가 [${key.color} 열쇠] 주워 소지 완료!`, "success");
        return;
      }
    }

    // 2. 잠긴 문 자물쇠 풀기 해제
    for (const d of doors) {
      if (d.isLocked && getDistance(pSelf.x, pSelf.y, d.x, d.y) < 1.5) {
        // 일치하는 색상 열쇠 확인
        const correctKey = keys.find((k) => k.color === d.color && k.isHeld && k.heldBy === pSelf.id);
        if (correctKey) {
          // 자물쇠 즉각 격파
          setDoors((prev) =>
            prev.map((item) => (item.color === d.color ? { ...item, isLocked: false } : item))
          );
          // 열쇠 소진 처리
          setKeys((prev) =>
            prev.map((k) => (k.color === d.color ? { ...k, isHeld: false, heldBy: null } : k))
          );
          addLog(`🔓 플레이어가 [${correctKey.color} 자물쇠]를 성공적으로 풀었습니다! 교실 내부 진입 가망.`, "success");
          return;
        } else {
          addLog(`❌ 잠겨 있습니다! 이 문을 열려면 [${d.color} 열쇠]가 긴급히 필요합니다!`, "danger");
          return;
        }
      }
    }

    // 3. 자물쇠 방 버튼 작동
    for (const d of doors) {
      if (!d.isLocked && !d.buttonPressed) {
        const clsInfo = CLASSROOMS.find((cl) => cl.color === d.color);
        if (clsInfo && getDistance(pSelf.x, pSelf.y, clsInfo.buttonX, clsInfo.buttonY) < 1.45) {
          triggerButtonPress(d.color, pSelf.nickname);
          return;
        }
      }
    }

    // 4. 잡힌 동료 구출하기
    for (const other of players) {
      if (other.id !== pSelf.id && other.isCaptured && getDistance(pSelf.x, pSelf.y, other.x, other.y) < 1.5) {
        freeCapturedStudent(other, pSelf.nickname);
        return;
      }
    }

    // 5. 교사 플레이어 수동 E 접근 체포
    if (pSelf.team === "TEACHER" && phase === GamePhase.PLAYING) {
      for (const other of players) {
        if (other.team === "STUDENT" && !other.isCaptured && !other.hasEscaped) {
          if (getDistance(pSelf.x, pSelf.y, other.x, other.y) < 1.45) {
            triggerArrest(pSelf, other);
            return;
          }
        }
      }
    }
  };

  // 플레이어 기술 시전 F 처리
  const handlePlayerUseSkill = async () => {
    const pSelf = players.find((p) => p.id === "player")!;
    if (pSelf.isCaptured || pSelf.hasEscaped) return;

    const myCD = pSelf.cooldowns["MAIN"] || 0;
    if (myCD > 0) {
      addLog(`⏱️ 아직 스킬 보강 쿨다운 중입니다! 다시 작동될 때까지 감내하십시오.`, "danger");
      return;
    }

    // ----------------------------------------
    // A. 학생 역할군 기술 작동
    // ----------------------------------------
    if (pSelf.team === "STUDENT") {
      if (pSelf.role === StudentRole.YEON_SI_EUN) {
        // 볼펜 대행 공격: 즉발 위기 저지용. 교사가 매우 가까운 근접 1.2칸 내에 있을 경우 기절
        const targetTeacher = players.find((p) => p.team === "TEACHER" && getDistance(pSelf.x, pSelf.y, p.x, p.y) < 1.5);
        if (targetTeacher) {
          triggerStudentCounterSkill(pSelf, targetTeacher);
        } else {
          addLog("✏️ [스킬 대기] 볼펜 공격을 시전할 타깃 교사가 너무 멀리 있습니다! (교사 1.5칸 이내 근접 시 가능)", "system");
        }
      } else if (pSelf.role === StudentRole.PARK_HU_MIN) {
        // 농구공 가로 일직선 투척: 조준선 방향 약 3.5칸 이내 교사 기절
        let found = false;
        players.forEach((t) => {
          if (t.team === "TEACHER") {
            const isStun = Date.now() < (stunnedTeachers.current[t.id] || 0);
            if (!isStun && getDistance(pSelf.x, pSelf.y, t.x, t.y) < 3.8) {
              triggerStudentCounterSkill(pSelf, t);
              found = true;
            }
          }
        });
        if (!found) {
          addLog("🏀 [조준 실패] 던진 농구공이 사방 복도 공중에 헛되이 튕겨나갔습니다. (사정거리 3.5칸 내 교사 없음)", "system");
        }
      } else if (pSelf.role === StudentRole.KEUM_SUNG_JE) {
        // 빠따 강공격: 근접 1.5칸 이내 즉발 실신
        const targetTeacher = players.find((p) => p.team === "TEACHER" && getDistance(pSelf.x, pSelf.y, p.x, p.y) < 1.6);
        if (targetTeacher) {
          triggerStudentCounterSkill(pSelf, targetTeacher);
        } else {
          addLog("🏏 [사거리 아웃] 휘두른 빠따 가로 세기가 허공을 가릅니다. (교사 1.6칸 이내 필요)", "system");
        }
      } else if (pSelf.role === StudentRole.AHN_SU_HO) {
        // 수호천사 기동: 갇힌 학생 중 무작위 1명 다른 타일 무선 자동 즉시 구출!
        const trapped = players.find((p) => p.team === "STUDENT" && p.isCaptured);
        if (trapped) {
          freeCapturedStudent(trapped, `${pSelf.nickname} (수호천사 원격기동)`);
          setPlayers((prev) =>
            prev.map((p) => (p.id === "player" ? { ...p, cooldowns: { ...p.cooldowns, MAIN: 180 } } : p))
          );
          addLog("✨ 안수호 수호천사 기동! 생활지도실 장치를 해킹해 갇혀 있던 동료를 완전 해방 구출했습니다!", "skill");
        } else {
          addLog("✨ [스킬 대기] 현재 검거당해 생활지도실 방에 갇혀 있는 아군 동료가 없습니다.", "system");
        }
      }
    } else {
      // ----------------------------------------
      // B. 교사 역할군 기술 작동
      // ----------------------------------------
      if (pSelf.role === TeacherRole.TEACHER_A) {
        // 발소리 마킹 추적 작동: 학생들 발자국 흔적 감쇄 연장
        setPlayers((prev) =>
          prev.map((p) => (p.id === "player" ? { ...p, cooldowns: { ...p.cooldowns, MAIN: 60 } } : p))
        );
        addLog("👞 교사 A 발소리 추적망 기동! 최근 은밀하게 통과한 학생들의 발소리 붉은 좌표가 미니맵에 노출됩니다.", "skill");
      } else if (pSelf.role === TeacherRole.TEACHER_B) {
        // GPS 학생 GPS 탐지 스캔 작동 (5초)
        setTeachersScanActive(true);
        setPlayers((prev) =>
          prev.map((p) => (p.id === "player" ? { ...p, cooldowns: { ...p.cooldowns, MAIN: 60 } } : p))
        );
        addLog("👁️ 교사 B 스마트 GPS 스캐너 작동! 5초 동안 숨어있는 전교생 비탈출자 실시간 위치 정보를 마킹합니다.", "skill");
        setTimeout(() => {
          setTeachersScanActive(false);
          addLog("👁️ GPS 레이더 스캔 신호가 장애물 및 전파 차단으로 차단 유실되었습니다.", "system");
        }, 5000);
      } else if (pSelf.role === TeacherRole.TEACHER_C) {
        // 바라보는 가장 가까운 자물쇠 방 문 15초 바인드 폐쇄
        const targetDoor = doors.find((d) => d.isLocked && getDistance(pSelf.x, pSelf.y, d.x, d.y) < 2.5);
        if (targetDoor) {
          triggerTeacherCShutter(targetDoor.color);
          setPlayers((prev) =>
            prev.map((p) => (p.id === "player" ? { ...p, cooldowns: { ...p.cooldowns, MAIN: 60 } } : p))
          );
        } else {
          addLog("🔒 [봉쇄 실패] 셔터를 작동할 2.5칸 이내의 유효한 잠긴 교실 도어가 없습니다.", "system");
        }
      }
    }
  };

  // ==========================================
  // WIN/LOSS DETERMINATION (최종 판단)
  // ==========================================
  const checkFinalVictoryState = () => {
    // 플레이가 기동 중일 때만
    if (phase !== GamePhase.PLAYING) return;

    setPlayers((currentPlayers) => {
      const studentPlayers = currentPlayers.filter((p) => p.team === "STUDENT");
      const totalStudents = studentPlayers.length;

      const escapedStudents = studentPlayers.filter((p) => p.hasEscaped);
      const capturedStudents = studentPlayers.filter((p) => p.isCaptured);

      // 탈출 목표 도출: 전체 학생 6명 중 과반수 (즉, 4명 이상 이거나 그 이하 비율)
      // 학생팀 중 총 탈출 완료 자 수 검출
      const halfLimit = Math.ceil(totalStudents / 2);

      // 만약 탈출한 애들이 절반 이상이 되었으면 즉시 "학생 승리"!
      if (escapedStudents.length >= halfLimit) {
        setTimeout(() => handleGameOver(true), 1500);
      }

      // 만약 미필적 고의로 살아남은 학생들 전원이 기절 감금되어 움직일 수 없거나 탈출할 수 없을 때 즉각 "교사 승리"!
      const activeStudentsCount = studentPlayers.filter((p) => !p.isCaptured && !p.hasEscaped).length;
      if (activeStudentsCount === 0 && escapedStudents.length < halfLimit) {
        setTimeout(() => handleGameOver(false), 1500);
      }

      return currentPlayers;
    });
  };

  // 한쪽의 승리 선언 및 제미니 피해/오버 스토리 창출
  const handleGameOver = async (isStudentVictory: boolean) => {
    setPhase(GamePhase.GAME_OVER);
    setLoadingEnding(true);

    const studentPlayers = players.filter((p) => p.team === "STUDENT");
    const escaped = studentPlayers.filter((p) => p.hasEscaped).map((p) => p.nickname);
    const captured = studentPlayers.filter((p) => p.isCaptured).map((p) => p.nickname);

    const elapsedSecs = timeLimit - timeLeft;
    const elapsedMinutes = Math.floor(elapsedSecs / 60);
    const elapsedRemaining = elapsedSecs % 60;
    const timeStr = `${elapsedMinutes}분 ${elapsedRemaining}초`;

    addLog(`📢 경기 종료! 최종 승자는 [${isStudentVictory ? "학생 연맹" : "교사 사냥단"}] 팀입니다!`, "system");

    // 제미니 최종 감명 결말 요약 스토리 생성 요청
    const story = await fetchGeminiStory(isStudentVictory, escaped, captured, timeStr);
    setEndingStory(story);
    setLoadingEnding(false);
  };

  return (
    <div className={`min-h-screen transition-all ${screenShake ? "animate-shake bg-red-950" : "bg-[#0c0d10]"}`}>
      
      {/* 1. 로비 화면 렌더 */}
      {phase === GamePhase.LOBBY && (
        <MainLobby onStartGame={handleStartSetup} />
      )}

      {/* 2. 대기 연출 화면 렌더 */}
      {phase === GamePhase.ROLE_ASSIGN && (
        <div className="min-h-screen bg-[#0c0d10] flex flex-col justify-center items-center text-center p-6 select-none font-sans">
          <div className="absolute inset-0 bg-red-950/10 blur-3xl rounded-full" />
          <span className="text-3xl animate-bounce">🎒👮⚡</span>
          <h2 className="text-2xl font-black text-white mt-6 tracking-widest uppercase italic">
            역할 비밀 배정 프로토콜
          </h2>
          <p className="text-gray-400 text-sm max-w-sm mt-2 leading-relaxed">
            은장고등학교 교우들의 닉네임을 수합 중입니다. 역할 룰렛을 굴려 '학생부 교사단' 또는 '은장교 학생팀' 역할을 부여합니다...
          </p>
          <div className="w-48 bg-[#15171d] border border-gray-800 rounded-full h-1.5 mt-8 overflow-hidden">
            <div className="bg-red-600 h-full w-[80%] animate-pulse" style={{ animationDuration: "1s" }} />
          </div>
        </div>
      )}

      {/* 3. 30초 대기 또는 PLAYING/GAME_OVER 인게임 스튜디오 */}
      {(phase === GamePhase.READY_TIME || phase === GamePhase.PLAYING || phase === GamePhase.GAME_OVER) && (
        <div className="min-h-screen bg-[#0c0d10] text-[#gray-200] p-4 md:p-6 flex flex-col justify-between select-none">
          
          {/* 인게임 상단바 */}
          <header className="flex flex-col sm:flex-row justify-between items-center bg-[#15171d] border border-gray-800 rounded-2xl px-6 py-4 shadow-lg mb-4">
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#ef4444] block">
                WEAK HERO : OUT OF SCHOOL
              </span>
              <h2 className="text-lg font-black text-white flex items-center justify-center sm:justify-start gap-1.5 mt-0.5 uppercase italic">
                약한영웅 : <span className="text-red-600">학교 탈출</span>
              </h2>
            </div>

            {/* 현재 제한/비상 가동 상태 바 표기 */}
            <div className="flex items-center gap-3 mt-3 sm:mt-0 font-mono">
              {phase === GamePhase.READY_TIME ? (
                <div className="bg-red-950/60 border border-red-900 px-4 py-2 rounded-xl text-center flex items-center gap-2 animate-pulse">
                  <span className="text-xs">⏱️</span>
                  <span className="text-[11px] font-bold text-red-400 font-sans">
                    교사 봉쇄 대기 시간: <strong>{readyCountdown}초</strong>
                  </span>
                </div>
              ) : (
                <div className="bg-[#1c1f26] border border-gray-800 px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-semibold text-gray-400">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                  실시간 서버 상태 동적 연동
                </div>
              )}

              <button
                id="quit-setup-btn"
                type="button"
                onClick={() => setPhase(GamePhase.LOBBY)}
                className="bg-[#252830] border border-gray-75 * border-gray-700 text-gray-400 hover:text-white font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1 cursor-pointer"
                title="로비로 퇴각"
              >
                <LogOut className="w-3.5 h-3.5" />
                나오기
              </button>
            </div>
          </header>

          {/* 메인 어플리케이션 인터페이스 (정면 FPP 카메라 + 제어 상태 판넬) */}
          {phase !== GamePhase.GAME_OVER ? (
            <div className="flex-grow flex flex-col gap-4">
              {/* 3D POV & Minimap 조종 모듈 */}
              <FirstPersonCanvas
                player={players.find((p) => p.id === "player")!}
                players={players}
                keys={keys}
                doors={doors}
                onMove={handlePlayerMove}
                onInteract={handlePlayerInteract}
                onUseSkill={handlePlayerUseSkill}
                activeFootprints={activeFootprints}
                teachersScanActive={teachersScanActive}
                phase={phase}
                readyCountdown={readyCountdown}
                stunnedTeachers={stunnedTeachers}
                eventLogs={eventLogs}
                timeLeft={timeLeft}
                gateOpenCountdown={gateOpenCountdown}
              />
            </div>
          ) : (
            /* GAME OVER 결과 요약 화면 렌더 */
            <div className="max-w-3xl mx-auto w-full bg-[#15171d] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex-grow flex flex-col justify-center items-center">
              
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0c0d10] via-[#15171d] to-red-950/20" />
              
              <div className="relative z-10 text-center w-full">
                
                {/* 트로피 / 딱지 명예 연출 */}
                <span className="text-6xl animate-bounce mb-4 block">🏆</span>
                
                <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">
                  {players.find((p) => p.id === "player")?.team === "STUDENT" &&
                  players.filter((p) => p.team === "STUDENT" && p.hasEscaped).length >=
                    Math.ceil(players.filter((p) => p.team === "STUDENT").length / 2)
                    ? "학생 연대 극적 승리 (Victory)!"
                    : "학생부 교사 사냥단 완승 (GameOver)!"}
                </h2>
                
                <p className="text-xs text-gray-500 font-mono tracking-widest mt-1.5 uppercase">
                  Weak Hero School Escape Finish Result
                </p>

                {/* 제미니 기동중 로딩 바 */}
                {loadingEnding ? (
                  <div className="bg-[#0c0d10] border border-gray-800 rounded-2xl p-6 my-6 text-center max-w-xl mx-auto flex flex-col justify-center items-center gap-3">
                    <span className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-mono">
                      Gemini가 이번 판의 소설풍 엔딩 에필로그를 극적으로 집필하는 중입니다...
                    </p>
                  </div>
                ) : (
                  /* 완료된 한 조각 문학적 결말 보고 */
                  <div className="bg-[#0c0d10] border border-gray-800/80 rounded-2xl p-5 my-6 text-left max-w-xl mx-auto text-xs text-gray-350 leading-relaxed font-sans shadow-lg">
                    <p className="text-[10px] text-red-500 font-mono font-bold uppercase mb-2">
                      ✏️ Gemini AI 에필로그 서장
                    </p>
                    {endingStory}
                  </div>
                )}

                {/* 세부 탈출/체포 검거 스쿼드 보고서 */}
                <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto border-t border-b border-gray-800 py-5 my-5 text-left text-xs font-mono">
                  <div>
                    <span className="text-[#2563eb] font-bold block mb-1">🏃 탈출 성공 학생구합</span>
                    {players.filter((p) => p.team === "STUDENT" && p.hasEscaped).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {players
                          .filter((p) => p.team === "STUDENT" && p.hasEscaped)
                          .map((p, ix) => (
                            <span key={ix} className="bg-blue-950/40 border border-blue-900/60 text-blue-400 text-[10px] px-2 py-0.5 rounded font-sans">
                              {p.nickname}({p.role})
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="text-gray-550 block mt-1 text-[11px] font-sans">탈출에 성공한 이가 없습니다 (전멸).</span>
                    )}
                  </div>

                  <div>
                    <span className="text-red-500 font-bold block mb-1">🚨 생활지도실에 갇힌 미탈출자</span>
                    {players.filter((p) => p.team === "STUDENT" && !p.hasEscaped).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {players
                          .filter((p) => p.team === "STUDENT" && !p.hasEscaped)
                          .map((p, ix) => (
                            <span key={ix} className="bg-red-950 border border-red-900/60 text-red-400 text-[10px] px-2 py-0.5 rounded font-sans">
                              {p.nickname}({p.isCaptured ? "체포감금" : "미탈출"})
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="text-gray-550 block mt-1 text-[11px] font-sans">모든 학생이 안전하게 탈출하였습니다!</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-6">
                  <button
                    id="quit-setup-lobby-btn"
                    type="button"
                    onClick={() => {
                      setPhase(GamePhase.LOBBY);
                    }}
                    className="bg-[#252830] border border-gray-700 text-gray-400 hover:text-white px-5 py-3 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    메인 홈으로
                  </button>
                  <button
                    id="re-match-btn"
                    type="button"
                    onClick={() => {
                      setPhase(GamePhase.ROLE_ASSIGN);
                      setTimeout(() => {
                        assignRoles({
                          nickname,
                          studentRole: prefStudent,
                          teacherRole: prefTeacher,
                          teacherCount,
                          timeLimit,
                        });
                      }, 2000);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white border border-red-900 px-6 py-3 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-[1.01]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    다시 한 판 하기
                  </button>
                </div>

              </div>

            </div>
          )}

          <footer className="text-center text-[10px] text-gray-600 font-mono mt-4 pt-3 border-t border-[#1c1f26]">
            Weak Hero School Escape Sim · Powered by Gemini Flash 3.5 & High Performance Raycaster Engine
          </footer>
        </div>
      )}

    </div>
  );
}
