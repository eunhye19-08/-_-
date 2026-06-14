/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { Player, KeyItem, LockDoor, KeyColor, GamePhase, GameEventLog } from "../types";
import { MAP_WIDTH, MAP_HEIGHT, SCHOOL_MAP, CLASSROOMS, castRay, getDistance, checkCollision } from "../utils/map";
import { Shield, Sparkles, Navigation, RotateCcw, HelpCircle, Footprints, MessageSquare, LogOut, Zap } from "lucide-react";
import { STUDENT_CHARACTERS, TEACHER_CHARACTERS } from "./MainLobby";

interface FirstPersonCanvasProps {
  player: Player;
  players: Player[];
  keys: KeyItem[];
  doors: LockDoor[];
  onMove: (x: number, y: number, angle: number) => void;
  onInteract: () => void;
  onUseSkill: () => void;
  activeFootprints: { [playerId: string]: { x: number; y: number; age: number }[] };
  teachersScanActive: boolean; // 교사 B 위치 탐지 레이더 활성 여부
  phase: GamePhase;
  readyCountdown: number;
  stunnedTeachers: React.MutableRefObject<{ [playerId: string]: number }>;
  eventLogs: GameEventLog[];
  timeLeft: number;
  gateOpenCountdown: number | null;
  onExit?: () => void; // 나오기 콜백 추가
}

export const FirstPersonCanvas: React.FC<FirstPersonCanvasProps> = ({
  player,
  players,
  keys,
  doors,
  onMove,
  onInteract,
  onUseSkill,
  activeFootprints,
  teachersScanActive,
  phase,
  readyCountdown,
  stunnedTeachers,
  eventLogs,
  timeLeft,
  gateOpenCountdown,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  // 로컬 키 임력 상태 추적
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);

  // 조작 가이드 오버레이 토글
  const [showGuide, setShowGuide] = useState(true);

  // 마우스 드래그를 이용한 뷰포트 상/하/좌/우 회전 상태
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const cameraPitch = useRef(0); // 상하 고글 틸트 (-120 ~ 120)

  // 캐릭터 이미지 프리로더 자원 딕셔너리
  const charImages = useRef<{ [key: string]: HTMLImageElement }>({});

  // Props 최신값 실시간 연동 레퍼런스 (렌더 스레드 끊김 / 인풋 렉 제거 및 60fps 무지연 렌더링용)
  const playerRef = useRef(player);
  const playersRef = useRef(players);
  const keysRef = useRef(keys);
  const doorsRef = useRef(doors);
  const activeFootprintsRef = useRef(activeFootprints);
  const teachersScanActiveRef = useRef(teachersScanActive);
  const phaseRef = useRef(phase);
  const eventLogsRef = useRef(eventLogs);

  const onMoveRef = useRef(onMove);
  const onInteractRef = useRef(onInteract);
  const onUseSkillRef = useRef(onUseSkill);

  useEffect(() => {
    playerRef.current = player;
    playersRef.current = players;
    keysRef.current = keys;
    doorsRef.current = doors;
    activeFootprintsRef.current = activeFootprints;
    teachersScanActiveRef.current = teachersScanActive;
    phaseRef.current = phase;
    eventLogsRef.current = eventLogs;

    onMoveRef.current = onMove;
    onInteractRef.current = onInteract;
    onUseSkillRef.current = onUseSkill;
  }, [player, players, keys, doors, activeFootprints, teachersScanActive, phase, eventLogs, onMove, onInteract, onUseSkill]);

  // 로컬 무지연 무장애 회전/좌표 캐시 (인풋 랙 제어 및 부드러운 화면 제공)
  const localX = useRef(player.x);
  const localY = useRef(player.y);
  const localAngle = useRef(player.angle);
  const lastSentTime = useRef(0);
  const lastPlayerPositions = useRef<{ [id: string]: { x: number; y: number } }>({});

  useEffect(() => {
    localX.current = player.x;
    localY.current = player.y;
    localAngle.current = player.angle;
    lastPlayerPositions.current = {};
  }, [player.id, phase]);

  const throttledSendMove = (x: number, y: number, angle: number) => {
    const now = performance.now();
    if (now - lastSentTime.current > 33) { // 약 30Hz 브리핑 동기화
      onMoveRef.current(x, y, angle);
      lastSentTime.current = now;
    }
  };

  useEffect(() => {
    const roles = ["연시은", "안수호", "박후민", "금성제", "고현탁"];
    roles.forEach((role) => {
      const img = new Image();
      img.onload = () => {
        charImages.current[role] = img;
      };
      img.src = `/${role}.png`;

      // Fallback alternatives
      const imgAlt = new Image();
      imgAlt.onload = () => {
        charImages.current[role] = imgAlt;
      };
      imgAlt.src = `/assets/${role}.png`;
    });
  }, []);

  // 키보드 리스너 등록
  useEffect(() => {
    const normalizeKey = (keyString: string): string => {
      const k = keyString.toLowerCase();
      if (k === "ㅈ" || k === "ㅉ") return "w";
      if (k === "ㄴ") return "s";
      if (k === "ㅁ") return "a";
      if (k === "ㅇ") return "d";
      if (k === "ㄷ") return "e";
      if (k === "ㄹ") return "f";
      return k;
    };

    const getUnifiedKey = (e: KeyboardEvent): string => {
      const code = e.code;
      if (code === "ShiftLeft" || code === "ShiftRight") return "shift";
      if (code === "KeyW" || code === "ArrowUp") return "w";
      if (code === "KeyS" || code === "ArrowDown") return "s";
      if (code === "KeyA") return "a";
      if (code === "KeyD") return "d";
      if (code === "KeyE") return "e";
      if (code === "KeyF") return "f";
      if (code === "ArrowLeft") return "arrowleft";
      if (code === "ArrowRight") return "arrowright";
      
      const rawK = e.key.toLowerCase();
      if (rawK === "shift") return "shift";
      return normalizeKey(rawK);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const k = getUnifiedKey(e);
      keysPressed.current[k] = true;
      if (k === "w") keysPressed.current["arrowup"] = true;
      if (k === "s") keysPressed.current["arrowdown"] = true;

      const currPlayer = playerRef.current;
      // 상호작용 단축키 E (수동 작동 목적)
      if (k === "e" && !currPlayer.isCaptured && !currPlayer.hasEscaped) {
        onInteractRef.current();
      }
      // 스킬 단축키 F
      if (k === "f" && !currPlayer.isCaptured && !currPlayer.hasEscaped) {
        onUseSkillRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = getUnifiedKey(e);
      keysPressed.current[k] = false;
      if (k === "w") keysPressed.current["arrowup"] = false;
      if (k === "s") keysPressed.current["arrowdown"] = false;
      onMoveRef.current(localX.current, localY.current, localAngle.current);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 프레임 이동 처리 루프
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000; // 초 단위 델타타임
      lastTime = now;

      const currPlayer = playerRef.current;

      if (!currPlayer.isCaptured && !currPlayer.hasEscaped) {
        let moveSpeed = 4.2 * dt; // 초당 4.2타일 속도
        let rotSpeed = 3.0 * dt;  // 초당 3.0라디안 회전 속도

        let moved = false;
        let nextX = localX.current;
        let nextY = localY.current;
        let nextAngle = localAngle.current;

        // Shift 키가 함께 눌렸으면 A/D는 스트레이프(옆걸음질)를 수행하고, Shift가 없으면 A/D는 시선 회전을 수행합니다!
        const isShiftPressed = keysPressed.current["shift"];
        let dx = 0;
        let dy = 0;

        if (keysPressed.current["arrowleft"]) {
          nextAngle -= rotSpeed;
          moved = true;
        }
        if (keysPressed.current["arrowright"]) {
          nextAngle += rotSpeed;
          moved = true;
        }
        if (keysPressed.current["a"]) {
          if (isShiftPressed) {
            // 좌측 슬라이드 이동 (스트레이프)
            dx += Math.cos(localAngle.current - Math.PI / 2) * moveSpeed;
            dy += Math.sin(localAngle.current - Math.PI / 2) * moveSpeed;
          } else {
            // 왼쪽 시선 회전
            nextAngle -= rotSpeed;
          }
          moved = true;
        }
        if (keysPressed.current["d"]) {
          if (isShiftPressed) {
            // 우측 슬라이드 이동 (스트레이프)
            dx += Math.cos(localAngle.current + Math.PI / 2) * moveSpeed;
            dy += Math.sin(localAngle.current + Math.PI / 2) * moveSpeed;
          } else {
            // 오른쪽 시선 회전
            nextAngle += rotSpeed;
          }
          moved = true;
        }

        // 전진/후진 (W, S)
        if (keysPressed.current["w"] || keysPressed.current["arrowup"]) {
          dx += Math.cos(localAngle.current) * moveSpeed;
          dy += Math.sin(localAngle.current) * moveSpeed;
          moved = true;
        }
        if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) {
          dx -= Math.cos(localAngle.current) * moveSpeed;
          dy -= Math.sin(localAngle.current) * moveSpeed;
          moved = true;
        }

        if (moved) {
          // 정규문 잠금 상태 맵핑
          const lockedDoorsState: { [key: string]: boolean } = {};
          const currDoors = doorsRef.current;
          currDoors.forEach((d) => {
            lockedDoorsState[d.color] = d.isLocked;
          });

          // 정문 오픈 상태
          const allButtonsPressed = currDoors.every((d) => d.buttonPressed);

          // 충돌 계산 (6선 슬라이딩 연산 대행)
          const colResult = checkCollision(
            localX.current,
            localY.current,
            localX.current + dx,
            localY.current + dy,
            lockedDoorsState,
            allButtonsPressed
          );

          localX.current = colResult.x;
          localY.current = colResult.y;
          localAngle.current = nextAngle;

          throttledSendMove(colResult.x, colResult.y, nextAngle);
        }
      }

      // 상호작용 프롬프트 실시간 검출
      checkInteractPrompt();

      // 드로잉 호출
      render3D();
      renderMinimap();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 플레이어 앞의 수집 가능/동작 가능한 타일 검사하여 프롬프트 변경
  const checkInteractPrompt = () => {
    const currPlayer = playerRef.current;
    const currPlayers = playersRef.current;
    const currKeys = keysRef.current;
    const currDoors = doorsRef.current;
    const currPhase = phaseRef.current;

    if (currPlayer.isCaptured) {
      setInteractPrompt("👮 체포되어 생활지도실에 갇혔습니다! 친구가 오기를 기다리세요.");
      return;
    }
    if (currPlayer.hasEscaped) {
      setInteractPrompt("🎉 정문을 무사히 통과해 탈출에 성공했습니다! 다른 학우들을 응원하십시오.");
      return;
    }

    // 1. 교사 플레이어 전용: 주변 of 학생 봇 수동 체포 감지 보강
    if (currPlayer.team === "TEACHER" && currPhase === GamePhase.PLAYING) {
      for (const other of currPlayers) {
        if (other.team === "STUDENT" && !other.isCaptured && !other.hasEscaped) {
          if (getDistance(localX.current, localY.current, other.x, other.y) < 1.45) {
            setInteractPrompt(`🚨 [E] 접촉 체포: ${other.nickname} 연행 봉쇄하기!`);
            return;
          }
        }
      }
    }

    // 2. 열쇠 수집 범위 조사
    for (const key of currKeys) {
      if (!key.isHeld && getDistance(localX.current, localY.current, key.x, key.y) < 1.2) {
        setInteractPrompt(`[E] 누름: ${key.color} 열쇠 획득`);
        return;
      }
    }

    // 3. 잠긴 교실 자물쇠 해제 조사
    for (const d of currDoors) {
      if (d.isLocked && getDistance(localX.current, localY.current, d.x, d.y) < 1.5) {
        // 플레이어가 해당 문과 같은 색상의 열쇠를 쥐고 있는지?
        const heldKey = currKeys.find((k) => k.isHeld && k.heldBy === currPlayer.id && k.color === d.color);
        if (heldKey) {
          setInteractPrompt(`[E] 누름: ${d.classroomName} 자물쇠 해제`);
          return;
        } else {
          setInteractPrompt(`🔒 ${d.classroomName} 자물쇠: [${d.color} 열쇠]가 필요합니다.`);
          return;
        }
      }
    }

    // 4. 자물쇠 방 버튼 작동 조사
    for (const d of currDoors) {
      if (!d.isLocked && !d.buttonPressed) {
        const clsInfo = CLASSROOMS.find((v) => v.color === d.color);
        if (clsInfo && getDistance(localX.current, localY.current, clsInfo.buttonX, clsInfo.buttonY) < 1.4) {
          setInteractPrompt(`[E] 누름: ${d.color} 제어 버튼 작동`);
          return;
        }
      }
    }

    // 5. 구출하기 조사 (다른 사람이 감금되어 있는 경우)
    if (currPlayer.team === "STUDENT") {
      for (const other of currPlayers) {
        if (other.id !== currPlayer.id && other.isCaptured && getDistance(localX.current, localY.current, other.x, other.y) < 1.5) {
          setInteractPrompt(`[E] 길게 누름: ${other.nickname} 구출하기`);
          return;
        }
      }
    }

    setInteractPrompt(null);
  };

  // 1인칭 수동 컨트롤 버튼 헬퍼
  const handleVirtualMovement = (dir: "F" | "B" | "L" | "R" | "I" | "S") => {
    if (player.isCaptured || player.hasEscaped) return;

    let nextX = localX.current;
    let nextY = localY.current;
    let nextAngle = localAngle.current;
    const step = 0.5;

    if (dir === "L") {
      nextAngle -= 0.35;
    } else if (dir === "R") {
      nextAngle += 0.35;
    } else {
      let dx = 0;
      let dy = 0;
      if (dir === "F") {
        dx = Math.cos(localAngle.current) * step;
        dy = Math.sin(localAngle.current) * step;
      } else if (dir === "B") {
        dx = -Math.cos(localAngle.current) * step;
        dy = -Math.sin(localAngle.current) * step;
      }

      const lockedDoorsState: { [key: string]: boolean } = {};
      doors.forEach((d) => {
        lockedDoorsState[d.color] = d.isLocked;
      });
      const colResult = checkCollision(
        localX.current,
        localY.current,
        localX.current + dx,
        localY.current + dy,
        lockedDoorsState,
        doors.every((d) => d.buttonPressed)
      );
      nextX = colResult.x;
      nextY = colResult.y;
    }

    localX.current = nextX;
    localY.current = nextY;
    localAngle.current = nextAngle;
    onMove(nextX, nextY, nextAngle);
  };

  // ==========================================
  // RAYCASTER 3D CANVAS RENDERING
  // ==========================================
  const render3D = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const horizonY = h / 2 + cameraPitch.current;

    // 1. 하늘/천장 (깊고 몽환적인 학교 야간 복도 천장 느낌)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, "#080e1a"); // 아주 옅은 자정색
    skyGrad.addColorStop(1, "#1e293b"); // 슬레이트 색상
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, Math.max(0, horizonY));

    // 2. 바닥 (클래식한 한국 고등학교 마룻바닥 느낌)
    const floorGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    floorGrad.addColorStop(0, "#2c251e"); // 짙은 목재 브라운
    floorGrad.addColorStop(1, "#120e0a"); // 아주 어두운 밤나무색
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, Math.max(0, horizonY), w, Math.max(0, h - horizonY));

    // [데코레이션] 천장 원근선(아쿠스틱 타일화) 그리기
    ctx.strokeStyle = "rgba(71, 85, 105, 0.2)";
    ctx.lineWidth = 1;
    for (let lx = -w; lx <= w * 2; lx += w / 10) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(w / 2, horizonY);
      ctx.stroke();
    }

    // [데코레이션] 바닥 원근 마룻바닥 줄눈 및 격자선 그리기
    ctx.strokeStyle = "rgba(100, 80, 60, 0.22)";
    for (let lx = -w; lx <= w * 2; lx += w / 8) {
      ctx.beginPath();
      ctx.moveTo(lx, h);
      ctx.lineTo(w / 2, horizonY);
      ctx.stroke();
    }
    // 바닥 가로 마개선 (멀어질수록 촘촘히)
    for (let ty = horizonY; ty < h; ty += (h - ty) / 6.5 + 1.2) {
      ctx.strokeStyle = "rgba(80, 60, 40, 0.15)";
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(w, ty);
      ctx.stroke();
    }

    // [데코레이션] 천장 형광등 원근감 있게 그리기 (일인칭 학교 스런 매력포인트)
    const lightGlowLevels = [4, 3, 2, 1];
    lightGlowLevels.forEach((depth) => {
      const scale = Math.pow(0.5, depth);
      const lightW = 28 * scale;
      const lightH = 4 * scale;
      const lightY = horizonY * (1 - scale * 0.7);
      
      ctx.fillStyle = "rgba(254, 252, 232, 0.95)"; // 환한 백색등
      ctx.fillRect(w / 2 - lightW / 2, lightY, lightW, lightH);
      
      // 형광등 자체의 번지는 소프트 글로우 빛무리 연출
      const radGlow = ctx.createRadialGradient(w / 2, lightY + lightH / 2, 1, w / 2, lightY + lightH / 2, 12 * scale);
      radGlow.addColorStop(0, "rgba(253, 224, 71, 0.4)");
      radGlow.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = radGlow;
      ctx.fillRect(w / 2 - 20 * scale, lightY - 10 * scale, 40 * scale, 20 * scale);
    });

    const currDoors = doorsRef.current;
    const currKeys = keysRef.current;
    const currPlayers = playersRef.current;

    // 문 잠금 상태 해시
    const doorLockMap: { [key: string]: boolean } = {};
    currDoors.forEach((d) => (doorLockMap[d.color] = d.isLocked));

    const allButtonsPressed = currDoors.every((d) => d.buttonPressed);

    // 깊이 버퍼 (스프라이트가 벽 뒤에 가려지도록)
    const depthBuffer: number[] = new Array(w).fill(Infinity);

    // 3. 레이캐스팅 벽 렌더링
    const fov = Math.PI / 3; // 60도 FOV
    const rayCount = w; // 가로 픽셀당 1개 레이

    for (let x = 0; x < rayCount; x++) {
      const rayAngle = localAngle.current - fov / 2 + (x / rayCount) * fov;
      const ray = castRay(localX.current, localY.current, rayAngle, doorLockMap, allButtonsPressed);

      // 왜각 보정 (어안 렌더 왜곡 방지)
      const correctedDist = ray.distance * Math.cos(rayAngle - localAngle.current);
      depthBuffer[x] = correctedDist;

      // 벽 높이 계산
      const wallHeight = Math.min(h * 1.5, (h / correctedDist) * 1.25);

      // 드로잉 범위 리프
      const drawStart = Math.max(0, horizonY - wallHeight / 2);
      const drawEnd = Math.min(h - 1, horizonY + wallHeight / 2);

      // 벽 색상 배정 - 교착 해결 및 시인성 극대화를 위해 기존보다 한결 밝은 도장 적용!
      let baseColor = "#cbd5e1"; // 일반 벽 (밝은 슬레이트)

      if (ray.wallType === 1) {
        baseColor = "#94a3b8"; // 외각 시멘트 콘크리트 벽 (밀도 있는 회색)
      } else if (ray.wallType === 2) {
        baseColor = "#cbd5e1"; // 학교 내부 교실 벽 (샌드/베이지 투톤 배당용 기저)
      } else if (ray.wallType === 5 && ray.colorFlag) {
        // 잠긴 교실 칼라 문 벽인 경우!
        switch (ray.colorFlag) {
          case "RED": baseColor = "#ef4444"; break;
          case "BLUE": baseColor = "#3b82f6"; break;
          case "YELLOW": baseColor = "#eab308"; break;
          case "GREEN": baseColor = "#10b981"; break;
          case "PURPLE": baseColor = "#a855f7"; break;
        }
      } else if (ray.wallType === 3) {
        baseColor = "#dc2626"; // 정문 출구 타겟
      }

      // 측면 벽 명암 효과 (입체감 유도)
      if (ray.side) {
        // 음영 적용
        ctx.fillStyle = pSBC(-0.2, baseColor) || baseColor;
      } else {
        ctx.fillStyle = baseColor;
      }

      // 벽 종선 긋기
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);

      // [학교 전경 디테일 A: 교실 내부가 비쳐보이는 복도 하이라이트 유리창문]
      if (ray.wallType === 2 && ray.wallX > 0.35 && ray.wallX < 0.65) {
        const winTop = drawStart + (drawEnd - drawStart) * 0.18;
        const winBottom = drawStart + (drawEnd - drawStart) * 0.5;
        
        ctx.fillStyle = "rgba(6, 182, 212, 0.48)"; // 빛나는 민트색 교직창문
        ctx.fillRect(x, winTop, 1, winBottom - winTop);

        // 창살 격자 프레임
        if (ray.wallX < 0.37 || ray.wallX > 0.63 || Math.abs(ray.wallX - 0.5) < 0.015) {
          ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
          ctx.fillRect(x, winTop, 1, winBottom - winTop);
        }
      }

      // [학교 전경 디테일 B: 2층 투톤 도장 페인트 라인 및 나무 몰딩]
      const woodMoldY = drawStart + (drawEnd - drawStart) * 0.62;
      const wallLowerY = drawStart + (drawEnd - drawStart) * 0.64;
      
      // 하단부 카키/목재 보드 도장
      ctx.fillStyle = "rgba(51, 65, 85, 0.3)"; 
      ctx.fillRect(x, wallLowerY, 1, drawEnd - wallLowerY);

      // 목재 가이드 몰딩 얇은 선 그리기
      ctx.fillStyle = "#78350f"; // 나무색 가이드라인
      ctx.fillRect(x, woodMoldY, 1, Math.max(1, (drawEnd - drawStart) * 0.02));

      // 벽 타일 세로 보더라인 (공간감 표현)
      if (ray.wallX < 0.015 || ray.wallX > 0.985) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
      }
    }

    // 4. 3D 스프라이트 개체 그리기 (열쇠, 자물쇠 상자, 버튼, 교사, 학생 봇들)
    interface SpriteObj {
      x: number;
      y: number;
      emoji: string;
      label: string;
      color: string;
      subText?: string;
      sizeMult: number;
    }

    const sprites: SpriteObj[] = [];

    // 바닥 열쇠 스프라이트 추가
    currKeys.forEach((key) => {
      if (!key.isHeld) {
        sprites.push({
          x: key.x,
          y: key.y,
          emoji: "🔑",
          label: `${key.color} 열쇠`,
          color: key.color === "YELLOW" ? "#facc15" : key.color.toLowerCase(),
          sizeMult: 0.6,
        });
      }
    });

    // 교실 자물쇠 상자 & 내부 가동 버튼 추가
    currDoors.forEach((d) => {
      const clsInfo = CLASSROOMS.find((cl) => cl.color === d.color);
      if (clsInfo) {
        if (d.isLocked) {
          // 자물쇠 상자 스프라이트
          sprites.push({
            x: d.x,
            y: d.y,
            emoji: "🔒",
            label: `${d.classroomName} 자물쇠`,
            color: "#ef4444",
            sizeMult: 0.8,
          });
        } else {
          // 열린 경우 내부에 버튼 스프라이트
          sprites.push({
            x: clsInfo.buttonX,
            y: clsInfo.buttonY,
            emoji: d.buttonPressed ? "🟢" : "🔴",
            label: `${d.classroomName} 제어기`,
            subText: d.buttonPressed ? "기동완료" : "작동대기",
            color: d.buttonPressed ? "#10b981" : "#f59e0b",
            sizeMult: 0.7,
          });
        }
      }
    });

    // 둥근 사각형 그리기 헬퍼 함수
    const drawRoundRect = (
      c: CanvasRenderingContext2D,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
      rad: number
    ) => {
      let r = rad;
      if (rw < 2 * r) r = rw / 2;
      if (rh < 2 * r) r = rh / 2;
      c.beginPath();
      c.moveTo(rx + r, ry);
      c.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
      c.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
      c.arcTo(rx, ry + rh, rx, ry, r);
      c.arcTo(rx, ry, rx + rw, ry, r);
      c.closePath();
    };

    const draw3DHumanCharacter = (
      c: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      cw: number,
      ch: number,
      roleName: string,
      team: string,
      isStun: boolean,
      isCaptured: boolean,
      a: number,
      isMoving: boolean = false,
      charImg?: HTMLImageElement | null,
      facingDir: string = "FRONT"
    ) => {
      c.save();
      c.translate(cx, cy);

      const swingSpeed = isMoving ? 0.015 : 0.0025;
      const swingAmplitude = isMoving ? 0.45 : 0.04;
      const swingAngle = Math.sin(Date.now() * swingSpeed) * swingAmplitude;

      // 3D 입체 상자 그리기 헬퍼
      const drawRobloxBox = (
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        w: number, h: number,
        d: number, // 3D 입체 두께
        baseColor: string,
        faceImg?: HTMLImageElement | null
      ) => {
        // Front face
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, w, h);

        // Right side face (음영)
        ctx.fillStyle = pSBC(-0.25, baseColor) || baseColor;
        ctx.beginPath();
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w + d, y - d * 0.4);
        ctx.lineTo(x + w + d, y + h - d * 0.4);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();

        // Top face (하이라이트)
        ctx.fillStyle = pSBC(0.18, baseColor) || baseColor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + d, y - d * 0.4);
        ctx.lineTo(x + w + d, y - d * 0.4);
        ctx.lineTo(x + w, y);
        ctx.closePath();
        ctx.fill();

        // 머리 얼굴 부분에 사용자가 올린 오리지널 사진 실사 텍스처 투사! (FRONT 일 때만 머리 전면에 텍스처 투사)
        if (facingDir === "FRONT" && faceImg && faceImg.complete && faceImg.width > 0) {
          ctx.save();
          // 원본 사진을 회전하거나 변형하지 않고, 박스 전면에 딱 맞게 드로잉!
          ctx.drawImage(faceImg, x + 1.5, y + 1.5, w - 3, h - 3);
          ctx.restore();
        }
      };

      // 1. 크기 규격 기정
      let jacketColor = team === "TEACHER" ? "#1e293b" : "#064e3b"; // 은장고 그린자켓 수트
      if (isCaptured) jacketColor = "#475569"; // 슬레팅

      const torsoW = cw * 0.36;
      const torsoH = ch * 0.38;
      const torsoX = -torsoW / 2;
      const torsoY = -ch * 0.12;
      const torsoD = cw * 0.12;

      const headW = cw * 0.22;
      const headH = cw * 0.22;
      const headX = -headW / 2;
      const headY = torsoY - headH * 0.95;
      const headD = cw * 0.12;

      const armW = cw * 0.10;
      const armH = torsoH * 0.9;
      const armD = cw * 0.06;

      const legW = torsoW * 0.42;
      const legH = ch * 0.25;
      const legD = cw * 0.08;

      // 2. 다리 하의 렌더 (상호 반비례 스윙 동작 제공)
      // (A) 왼쪽 다리
      c.save();
      c.translate(torsoX + torsoW * 0.24, torsoY + torsoH);
      c.rotate(swingAngle * 1.3);
      drawRobloxBox(c, -legW / 2, 0, legW, legH, legD, "#475569"); // 회색 슬랙스 하의
      drawRobloxBox(c, -legW / 2, legH, legW * 1.1, legH * 0.16, legD, "#0f172a"); // 슈즈 단화
      c.restore();

      // (B) 오른쪽 다리
      c.save();
      c.translate(torsoX + torsoW * 0.76, torsoY + torsoH);
      c.rotate(-swingAngle * 1.3);
      drawRobloxBox(c, -legW / 2, 0, legW, legH, legD, "#475569");
      drawRobloxBox(c, -legW / 2, legH, legW * 1.1, legH * 0.16, legD, "#0f172a");
      c.restore();

      // 3. 바디 교복 상의 (Uniform Blazer 3D 블록)
      drawRobloxBox(c, torsoX, torsoY, torsoW, torsoH, torsoD, jacketColor);

      // 교복 셔츠 V존 및 넥타이 붉은색 데코레이션 (FRONT 일 때만 그림)
      if (facingDir === "FRONT") {
        c.fillStyle = "#f8fafc";
        c.beginPath();
        c.moveTo(torsoX + torsoW * 0.35, torsoY);
        c.lineTo(torsoX + torsoW * 0.65, torsoY);
        c.lineTo(torsoX + torsoW * 0.5, torsoY + torsoH * 0.25);
        c.closePath();
        c.fill();

        c.fillStyle = team === "TEACHER" ? "#ef4444" : "#c2410c";
        c.fillRect(torsoX + torsoW * 0.46, torsoY, torsoW * 0.08, torsoH * 0.4);
      }

      // 4. 관절형 양팔 렌더 (앞뒤 교차 스윙)
      // (A) 왼쪽 팔 블록
      c.save();
      c.translate(torsoX - armW * 0.15, torsoY + armH * 0.08);
      c.rotate(-swingAngle * 1.4);
      drawRobloxBox(c, -armW / 2, 0, armW, armH, armD, jacketColor);
      drawRobloxBox(c, -armW / 2, armH, armW, armH * 0.15, armD, "#fdba74"); // 손목 스킨톤
      c.restore();

      // (B) 오른쪽 팔 블록
      c.save();
      c.translate(torsoX + torsoW + armW * 0.15, torsoY + armH * 0.08);
      c.rotate(swingAngle * 1.4);
      drawRobloxBox(c, -armW / 2, 0, armW, armH, armD, jacketColor);
      drawRobloxBox(c, -armW / 2, armH, armW, armH * 0.15, armD, "#fdba74");
      c.restore();

      // 5. 머리 상자 렌더 (원형 초상화 텍스처 삽입 가능)
      c.save();
      c.translate(0, headY + headH / 2);
      if (isCaptured || isStun) {
        c.rotate(0.18 + Math.sin(Date.now() * 0.003) * 0.05);
      } else {
        c.rotate(swingAngle * 0.18);
      }
      
      // 기저 머리 렌더링. 사용자가 올린 오리지널 이미지가 있을 경우 변형/왜곡/머리 덮개 없이 원본 그대로 노출, 없을 경우에만 레고/로블록스형 블록머리로 폴백.
      if (charImg && charImg.complete && charImg.width > 0 && facingDir === "FRONT") {
        c.drawImage(charImg, -headW / 2, -headH / 2, headW, headH);
      } else {
        drawRobloxBox(c, -headW / 2, -headH / 2, headW, headH, headD, "#fdba74");

        // 캐릭터 고유 헤어 블록 & 귀여운 액세서리 3D블록 장식
        let hairColor = "#475569";
        if (roleName === "연시은") hairColor = "#334155";
        else if (roleName === "박후민") hairColor = "#78350f";
        else if (roleName === "안수호") hairColor = "#eab308";
        else if (roleName === "금성제") hairColor = "#dc2626";
        else if (roleName === "고현탁") hairColor = "#1e293b";
        else if (team === "TEACHER") hairColor = "#0f172a";

        if (facingDir === "FRONT") {
          // 앞머리 과 옆머리 복스화
          drawRobloxBox(c, -headW * 0.53, -headH * 0.62, headW * 1.06, headH * 0.20, headD * 1.1, hairColor);
          drawRobloxBox(c, -headW * 0.55, -headH * 0.45, headW * 0.15, headH * 0.70, headD * 1.05, hairColor);
          drawRobloxBox(c, headW * 0.40, -headH * 0.45, headW * 0.15, headH * 0.70, headD * 1.05, hairColor);

          // 안경 등 세부 기믹
          if (roleName === "연시은" || team === "TEACHER") {
            c.strokeStyle = "rgba(255, 255, 255, 0.9)";
            c.lineWidth = 1.8;
            c.beginPath();
            c.arc(-headW * 0.22, 0, headW * 0.18, 0, 2 * Math.PI);
            c.arc(headW * 0.22, 0, headW * 0.18, 0, 2 * Math.PI);
            c.stroke();
          }
        } else if (facingDir === "BACK") {
          // 뒷부분 머리: 뒷머리가 머리통을 거의 다 덮음!
          drawRobloxBox(c, -headW * 0.55, -headH * 0.65, headW * 1.1, headH * 1.25, headD * 1.15, hairColor);
        } else {
          // SIDE profile (LEFT or RIGHT): 옆면 머리
          drawRobloxBox(c, -headW * 0.55, -headH * 0.65, headW * 0.8, headH * 1.2, headD * 1.15, hairColor);
          drawRobloxBox(c, -headW * 0.1, -headH * 0.1, headW * 0.2, headH * 0.4, headD * 1.1, "#fdba74");
        }
      }

      // 엔젤 안수호 소박한 입체 헤일로(광배 링) 장치
      if (roleName === "안수호") {
        c.strokeStyle = "rgba(253, 224, 71, 0.95)";
        c.lineWidth = 2.5;
        c.save();
        c.translate(0, -headH * 0.85);
        c.scale(1.2, 0.35);
        c.beginPath();
        c.arc(0, 0, headW * 0.45, 0, 2 * Math.PI);
        if (typeof (c as any).shadowColor !== "undefined") {
          (c as any).shadowColor = "rgba(253, 224, 71, 0.8)";
          (c as any).shadowBlur = 6;
        }
        c.stroke();
        c.restore();
      }
      c.restore();

      // 6. 무기 / 시그니처 아이템 복스 레이어 추가
      if (roleName === "금성제") {
        c.save();
        c.translate(torsoX + torsoW + armW * 0.15, torsoY + armH * 0.8);
        c.rotate(0.4 + swingAngle * 0.1);
        // 대표 쇠빠따 (황금 배트) 그리기
        drawRobloxBox(c, -3, 0, 6, armH * 0.95, 4, "#d97706");
        c.restore();
      } else if (roleName === "박후민") {
        c.save();
        c.translate(0, torsoY + torsoH * 0.4);
        c.strokeStyle = "rgba(249, 115, 22, 0.55)";
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 0, torsoW * 0.68, 0, 2 * Math.PI);
        c.stroke();
        c.restore();
      }

      c.restore();
    };

    // 다른 학우 및 쫓아오는 교사 봇 스프라이트
    currPlayers.forEach((p) => {
      if (p.id === player.id) return; // 자신 제외
      if (p.hasEscaped) return; // 탈출자 제외

      const isStun = stunnedTeachers && stunnedTeachers.current && Date.now() < (stunnedTeachers.current[p.id] || 0);

      // 캐릭터 움직임 추적 (이전 좌표와 비교)
      const prevPos = lastPlayerPositions.current[p.id];
      const isMoving = prevPos ? (Math.abs(p.x - prevPos.x) > 0.005 || Math.abs(p.y - prevPos.y) > 0.005) : false;
      lastPlayerPositions.current[p.id] = { x: p.x, y: p.y };

      // 캐릭터 웹툰 전비 테마에 걸맞은 입체 아바타 페어링
      let customEmoji = p.team === "TEACHER" ? "👮" : "🎒";
      if (p.role === "박후민") customEmoji = "🏀🧟";
      else if (p.role === "연시은") customEmoji = "✏️🧑‍🏫";
      else if (p.role === "안수호") customEmoji = "👼✨";
      else if (p.role === "금성제") customEmoji = "⚡🥊";
      else if (p.role === "고현탁") customEmoji = "🔥🤜";
      else if (p.team === "TEACHER") {
        customEmoji = isStun ? "💫😵" : "👮🕶️";
      }

      sprites.push({
        x: p.x,
        y: p.y,
        emoji: p.isCaptured ? "⛓️😭" : customEmoji,
        label: p.nickname,
        subText: p.isCaptured
          ? "🚨 생활지도실 감금"
          : isStun
          ? "💫 기절 상태 (행동불가)"
          : p.team === "TEACHER"
          ? `[교사] ${p.role}`
          : `[학생] ${p.role}`,
        color: p.team === "TEACHER" ? "#fc8181" : "#63b3ed",
        sizeMult: p.team === "TEACHER" ? 1.3 : 1.05,
        role: p.role as string,
        team: p.team as string,
        isStunned: isStun as boolean,
        isPlayer: true,
        isMoving: isMoving,
      } as any);
    });

    // 스프라이트 렌더 순서 정렬하기 (원근 거리에 근거해 뒤에서 부더 앞으로)
    const sortedSprites = sprites
      .map((spr) => {
        const dx = spr.x - localX.current;
        const dy = spr.y - localY.current;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { ...spr, dx, dy, dist };
      })
      .sort((a, b) => b.dist - a.dist);

    sortedSprites.forEach((spr) => {
      // 거리가 너무 가깝거나 뒤에 있는 경우 필터
      if (spr.dist < 0.2) return;

      // 플레이어 각도 기준으로 상대 각 계산
      let spriteAngle = Math.atan2(spr.dy, spr.dx) - localAngle.current;
      // 각도 노말라이즈
      spriteAngle = Math.atan2(Math.sin(spriteAngle), Math.cos(spriteAngle));

      // 정사영 부드러운 벽 가림 보정 깊이 계산
      const correctedSprDist = spr.dist * Math.cos(spriteAngle);

      // 화면 내부(FOV 60도 안)에 속했는지 체크
      if (Math.abs(spriteAngle) < fov * 0.9) {
        // 스크린 자이로 가로 위치
        const spriteScreenX = Math.floor(
          (w / 2) * (1 + Math.tan(spriteAngle) / Math.tan(fov / 2))
        );

        // 스크린상의 드로잉 크기
        const spriteSize = Math.floor((h / spr.dist) * 1.35 * spr.sizeMult);
        const spriteScreenY = horizonY; // 피치 이동성 대응!

        const isPlayerSprite = (spr as any).isPlayer;

        if (isPlayerSprite) {
          // 캐릭터 메타 추출
          const isTeacher = (spr as any).team === "TEACHER";
          const hasStun = (spr as any).isStunned;
          const isCapt = spr.emoji.includes("⛓️") || (spr.subText && spr.subText.includes("감금"));
          const charImg = charImages.current[(spr as any).role || ""];

          const boxWidth = Math.floor(spriteSize * 1.5);
          const boxHeight = Math.floor(spriteSize * 1.9);

          // 깊이 버퍼 대조 (중앙 중심 대략적 검사 후 완전 가려지면 드로잉 자체 스킵!)
          if (spriteScreenX >= 0 && spriteScreenX < w) {
            // 중심 뿐만이 아니라 약간 좌우 마진을 두어 벽 통과 잔여 픽셀 완벽 가림
            const checkX1 = Math.max(0, spriteScreenX - 5);
            const checkX2 = Math.min(w - 1, spriteScreenX + 5);
            if (depthBuffer[spriteScreenX] < correctedSprDist && depthBuffer[checkX1] < correctedSprDist && depthBuffer[checkX2] < correctedSprDist) {
              return; // 전면 벽에 완벽하게 차폐된 경우 렌더링 스킵!
            }
          }

          // 바닥 오오라 링은 지면 접지감을 위해 본 캔버스에 즉각 드로잉
          const ringW = spriteSize * 0.95;
          const ringH = spriteSize * 0.28;
          const floorY = spriteScreenY + spriteSize * 0.38;

          ctx.save();
          // 바닥 링도 횡스크롤 깊이 버퍼에 맞춰 차폐
          let ringColor = "rgba(59, 130, 246, ";
          if (isTeacher) {
            ringColor = hasStun ? "rgba(234, 179, 8, " : "rgba(239, 68, 68, ";
          } else if (isCapt) {
            ringColor = "rgba(148, 163, 184, ";
          }
          
          ctx.beginPath();
          ctx.ellipse(spriteScreenX, floorY, ringW / 2, ringH / 2, 0, 0, 2 * Math.PI);
          ctx.fillStyle = `${ringColor}0.25)`;
          ctx.fill();
          ctx.lineWidth = Math.max(1.8, 5.0 / spr.dist);
          ctx.strokeStyle = `${ringColor}0.9)`;
          ctx.stroke();
          ctx.restore();

          // 1. 오프스크린 캔버스를 생성해 정밀 픽셀-바이-픽셀 횡적 종선 클리핑 수행!
          const offCanvas = document.createElement("canvas");
          offCanvas.width = boxWidth;
          offCanvas.height = boxHeight;
          const oCtx = offCanvas.getContext("2d");
          if (!oCtx) return;

          const cx = boxWidth / 2;
          const cy = boxHeight * 0.58;

          // 상대적 각도에 입각해 뒤/앞/옆모습 3차원 투사면 선정!
          let relAngle = (spr as any).angle - Math.atan2(spr.dy, spr.dx);
          relAngle = Math.atan2(Math.sin(relAngle), Math.cos(relAngle));
          
          let facingDir: 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' = 'FRONT';
          const absAngle = Math.abs(relAngle);
          if (absAngle < Math.PI / 4) {
            facingDir = 'BACK'; // 후면 투사
          } else if (absAngle > 3 * Math.PI / 4) {
            facingDir = 'FRONT'; // 전면 투사
          } else if (relAngle > 0) {
            facingDir = 'RIGHT'; // 우측면
          } else {
            facingDir = 'LEFT'; // 좌측면
          }

          // 오프스크린에 3D 캐릭터 소환
          draw3DHumanCharacter(
            oCtx,
            cx,
            cy,
            spriteSize,
            spriteSize,
            (spr as any).role || "",
            (spr as any).team || "",
            hasStun,
            isCapt,
            1.0,
            (spr as any).isMoving,
            charImg,
            facingDir
          );

          // 오프스크린에 명찰 배치 그리기
          oCtx.save();
          oCtx.textAlign = "center";
          oCtx.textBaseline = "middle";

          const tagY = cy - spriteSize * 0.65;
          const labelFontSize = Math.max(9, Math.min(13, 130 / spr.dist));
          oCtx.font = `bold ${labelFontSize}px sans-serif`;

          const nicknameText = spr.label;
          const textWidth = oCtx.measureText(nicknameText).width;

          // 명찰 뒷면 배경 투명 슬레이트 카드
          oCtx.fillStyle = "rgba(15, 23, 42, 0.78)";
          oCtx.beginPath();
          drawRoundRect(oCtx, cx - textWidth / 2 - 6, tagY - labelFontSize * 0.8, textWidth + 12, labelFontSize * 1.5, 4);
          oCtx.fill();

          // 소속별 전력 글감 페인팅
          oCtx.fillStyle = isTeacher
            ? hasStun ? "#f59e0b" : "#ef4444" 
            : isCapt ? "#94a3b8" : "#3b82f6";
          oCtx.fillText(nicknameText, cx, tagY - labelFontSize * 0.1);

          // 직함 하단 태그 (예: [학생] 연시은 / [교사] 금성제)
          const subTextFontSize = labelFontSize * 0.8;
          oCtx.font = `bold ${subTextFontSize}px sans-serif`;
          oCtx.fillStyle = isTeacher ? "#fca5a5" : "#93c5fd";
          oCtx.fillText(spr.subText || "", cx, tagY + labelFontSize * 0.95);

          // 기절 / 체포 전용 뱃지 플로팅
          if (hasStun || isCapt) {
            oCtx.font = `${labelFontSize * 1.5}px sans-serif`;
            oCtx.fillText(hasStun ? "💫" : "⛓️", cx, tagY - labelFontSize * 1.6);
          }
          oCtx.restore();

          // 2. 메인 캔버스에 복사할 화면 위치 구상
          const targetScreenX = spriteScreenX - boxWidth / 2;
          const targetScreenY = spriteScreenY - boxHeight * 0.58;

          // 완전 가림 검증에 의거한 종선 드로잉!
          for (let col = 0; col < boxWidth; col++) {
            const stripeX = Math.floor(targetScreenX + col);
            if (stripeX >= 0 && stripeX < w) {
              // 오프스크린의 세로줄이 벽 깊이보다 앞쪽에 있는 경우에만 메인 캔버스에 카피 전송!
              if (depthBuffer[stripeX] >= correctedSprDist - 0.1) {
                ctx.drawImage(
                  offCanvas,
                  col,
                  0,
                  1,
                  boxHeight,
                  stripeX,
                  targetScreenY,
                  1,
                  boxHeight
                );
              }
            }
          }
        } else {
          // 비플레이어 아이템 스프라이트 (열쇠, 자물쇠 상자, 버튼)
          // 가로 3개 지점 깊이 간이 테스트를 통한 빠른 벽차단 처리!
          let isCovered = false;
          const testCols = [spriteScreenX - 4, spriteScreenX, spriteScreenX + 4];
          let visibleHits = 0;
          testCols.forEach((tc) => {
            if (tc >= 0 && tc < w) {
              if (depthBuffer[tc] >= correctedSprDist - 0.05) visibleHits++;
            }
          });
          if (visibleHits === 0) return; // 벽 뒤에 존재하므로 생략

          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const emojiSize = Math.max(16, Math.min(80, 200 / spr.dist));
          ctx.font = `${emojiSize}px sans-serif`;
          ctx.fillText(spr.emoji, spriteScreenX, spriteScreenY);

          // 상단 명칭 달기
          ctx.fillStyle = spr.color || "white";
          ctx.font = `bold ${Math.max(7, Math.min(10.5, 95 / spr.dist))}px sans-serif`;
          
          // 검은 그림자 글자수 배어
          ctx.save();
          ctx.fillStyle = "black";
          ctx.fillText(spr.label, spriteScreenX + 1, spriteScreenY - emojiSize * 0.6 + 1);
          ctx.restore();

          ctx.fillText(spr.label, spriteScreenX, spriteScreenY - emojiSize * 0.6);

          if (spr.subText) {
            ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
            ctx.font = `600 ${Math.max(6, Math.min(8.5, 80 / spr.dist))}px sans-serif`;
            ctx.fillText(spr.subText, spriteScreenX, spriteScreenY + emojiSize * 0.6);
          }
          ctx.restore();
        }
      }
    });

    // 으스스한 어두운 안개 효과 연계 (렌더링 마지막에 전반 다크 마스크 씌우기)
    ctx.fillStyle = "rgba(4, 3, 10, 0.04)"; // 야간 어둠 밀폐감
    ctx.fillRect(0, 0, w, h);

    // 정문오픈 카운트가 있을 때 적색 비상경보 펄스 점액 연출
    const allOn = doors.every((d) => d.buttonPressed);
    if (allOn) {
      const pulse = Math.abs(Math.sin(performance.now() / 250)) * 0.12;
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.fillRect(0, 0, w, h);
    }
  };

  // ==========================================
  // REAL-TIME MINIMAP RENDERING (2D)
  // ==========================================
  const renderMinimap = () => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cellW = w / MAP_WIDTH;
    const cellH = h / MAP_HEIGHT;

    // 1. 미니맵 배경 그리드 그리기
    for (let r = 0; r < MAP_HEIGHT; r++) {
      for (let c = 0; c < MAP_WIDTH; c++) {
        const cell = SCHOOL_MAP[r][c];
        const screenX = c * cellW;
        const screenY = r * cellH;

        if (cell === 1) {
          ctx.fillStyle = "#1e293b"; // 단단한 외벽 (진회색)
        } else if (cell === 2) {
          ctx.fillStyle = "#334155"; // 교실 구획 벽 (회색)
        } else if (cell === 3) {
          // 탈출 정문 타일
          ctx.fillStyle = "#ef4444"; // 붉은 정문 탈출 광구
        } else if (cell === 4) {
          ctx.fillStyle = "#022c22"; // 생활지도실 (다크그린)
        } else if (cell === 5) {
          // 자물쇠 문 후보 영역
          const matchedClass = CLASSROOMS.find((cl) => cl.doorX === c && cl.doorY === r);
          if (matchedClass) {
            const isLock = doors.find((v) => v.color === matchedClass.color)?.isLocked;
            ctx.fillStyle = isLock ? "#dc2626" : "rgba(30, 41, 59, 0.1)"; // 잠겼으면 빨강, 열렸으면 복도색
          } else {
            ctx.fillStyle = "#1e293b";
          }
        } else {
          ctx.fillStyle = "#090d16"; // 복도 바닥 (매우 어두운 네이비)
        }

        ctx.fillRect(screenX, screenY, cellW, cellH);

        // 그리드 보더라인
        ctx.strokeStyle = "rgba(255,255,255,0.02)";
        ctx.strokeRect(screenX, screenY, cellW, cellH);
      }
    }

    // 생활지도실(Discipline Room) 영역 '지도실' 텍스트 표기
    ctx.font = "bold 7px sans-serif";
    ctx.fillStyle = "#34d399";
    ctx.fillText("지도실", 1.8 * cellW, 2.3 * cellH);

    // 각 교실 명칭 약자 미니맵 배정
    CLASSROOMS.forEach((cl) => {
      ctx.fillStyle = "#64748b";
      ctx.font = "6px font-serif";
      ctx.fillText(cl.name.split("(")[0], cl.buttonX * cellW - 6, cl.buttonY * cellH + 2);
    });

    // 2. 바닥 열쇠들 미니맵 표시 (학생일 때 또는 교사 발소리 모드일 때)
    keys.forEach((key) => {
      if (!key.isHeld) {
        let keyColorHex = "#991b1b";
        switch (key.color) {
          case "RED": keyColorHex = "#ef4444"; break;
          case "BLUE": keyColorHex = "#3b82f6"; break;
          case "YELLOW": keyColorHex = "#eab308"; break;
          case "GREEN": keyColorHex = "#10b981"; break;
          case "PURPLE": keyColorHex = "#a855f7"; break;
        }
        ctx.fillStyle = keyColorHex;
        ctx.beginPath();
        ctx.arc(key.x * cellW, key.y * cellH, 3.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });

    // 3. 교사 A 발소리 추적 흔적(Footprints) 그리기
    Object.entries(activeFootprints).forEach(([playerId, rawList]) => {
      const fList = rawList as { x: number; y: number; age: number }[];
      fList.forEach((foot) => {
        const opacity = Math.max(0.1, foot.age / 15);
        ctx.fillStyle = `rgba(239, 68, 68, ${opacity})`;
        ctx.beginPath();
        ctx.arc(foot.x * cellW, foot.y * cellH, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

    // 4. 플레이어 구슬 지도 표시
    players.forEach((p) => {
      if (p.hasEscaped) return; // 탈출자 제외

      const isSelf = p.id === player.id;
      const xVal = isSelf ? localX.current : p.x;
      const yVal = isSelf ? localY.current : p.y;
      const angleVal = isSelf ? localAngle.current : p.angle;

      const screenX = xVal * cellW;
      const screenY = yVal * cellH;

      // 그리기 제한 여부: 플레이어가 학생일 때 교사 위치는 레이더가 켜졌거나 닿기 직전 거리에만 보여야 함!
      let shouldDraw = false;

      if (isSelf) {
        shouldDraw = true;
      } else if (player.team === "TEACHER") {
        // 교사는 학생들의 위치를 항상 보거나, 감금된 애들을 봄
        shouldDraw = true;
      } else {
        // 플레이어가 학생인 경우
        if (p.team === "STUDENT") {
          shouldDraw = true; // 동료 학생끼리는 원래 위치를 공유함 (무선 협동)
        } else {
          // 적(교사)의 위치:
          // 1) 교사 레이더(GPS 탐지)가 활성화되었을 때!
          // 2) 플레이어 반경 4칸 이내로 교사가 가까워졌을 때 (심장 박동 반경)
          const distToTeacher = getDistance(localX.current, localY.current, p.x, p.y);
          if (teachersScanActive || distToTeacher < 4.0) {
            shouldDraw = true;
          }
        }
      }

      if (shouldDraw) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, isSelf ? 4.5 : 3.5, 0, 2 * Math.PI);

        if (p.team === "TEACHER") {
          ctx.fillStyle = "#ef4444"; // 교사 빨강
        } else {
          ctx.fillStyle = p.isCaptured ? "#4b5563" : isSelf ? "#3b82f6" : "#60a5fa"; // 자신 파랑, 아군 하늘색
        }
        ctx.fill();

        // 외각 격발 링
        ctx.strokeStyle = isSelf ? "white" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isSelf ? 1.5 : 0.8;
        ctx.stroke();

        if (isSelf) {
          // 마주하는 전방 시야 방향 시계바늘 그리기
          ctx.strokeStyle = "white";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(
            screenX + Math.cos(angleVal) * 8,
            screenY + Math.sin(angleVal) * 8
          );
          ctx.stroke();

          // 전방 1인칭 부채꼴 시야각 광선 빔 그리기
          ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.arc(
            screenX,
            screenY,
            24,
            angleVal - Math.PI / 6,
            angleVal + Math.PI / 6
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    });
  };

  return (
    <div className="w-full h-full min-h-[500px] flex-grow flex flex-col bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative justify-center items-center select-none">
      
      {/* 극적 일원화 탑바 HUD 오버레이 */}
      <div className="absolute top-4 left-4 right-4 z-35 flex flex-col sm:flex-row justify-between items-center bg-[#07090e]/92 backdrop-blur-md border border-slate-800/90 rounded-xl px-4 py-2.5 shadow-xl gap-2 pointer-events-auto">
        {/* 타이틀 및 나오기 */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black tracking-widest text-red-500 font-sans italic uppercase">
            🏫 WEAK HERO ESCAPE
          </span>
          {onExit && (
            <button
              id="canvas-exit-lobby-btn"
              type="button"
              onClick={onExit}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-mono text-[9px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="로비로 퇴각"
            >
              <LogOut className="w-3 h-3" />
              나오기
            </button>
          )}
        </div>

        {/* 교문 봉쇄 해제 상태 (Lockdown buttons list) */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            교문 봉쇄 해제 상태:
          </span>
          <div className="flex items-center gap-1.5">
            {doors.map((d) => {
              let badgeStyle = "bg-red-950/40 text-red-400 border-red-900/60";
              let lightIndicator = "○";
              if (d.buttonPressed) {
                badgeStyle = "bg-green-950/80 text-green-400 border-green-800 animate-pulse";
                lightIndicator = "●";
              } else if (!d.isLocked) {
                badgeStyle = "bg-blue-950/50 text-blue-400 border-blue-900";
                lightIndicator = "🔓";
              }
              
              let dotEmoji = "🟥";
              if (d.color === "BLUE") dotEmoji = "🟦";
              else if (d.color === "YELLOW") dotEmoji = "🟨";
              else if (d.color === "GREEN") dotEmoji = "🟩";
              else if (d.color === "PURPLE") dotEmoji = "🟪";

              return (
                <div
                  key={d.color}
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 cursor-help ${badgeStyle}`}
                  title={`${d.classroomName}: ${d.isLocked ? "잠겨있음" : d.buttonPressed ? "버튼 연동 완료 (활성)" : "열림(버튼 대기)"}`}
                >
                  <span>{dotEmoji}</span>
                  <span className="text-[8px]">{d.classroomName}</span>
                  <span className="text-[7px]">{lightIndicator}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 타이머 및 정문개방 표식 */}
        <div className="flex items-center gap-3 font-mono">
          {phase === "READY_TIME" ? (
            <div className="bg-red-950/80 border border-red-800 px-3 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
              <span className="text-[10px] font-sans font-bold text-red-400">
                ⚠️ 교사 이동대기: <strong>{readyCountdown}초</strong>
              </span>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-850 px-3 py-1 rounded-lg flex items-center gap-1.5 font-mono">
              <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                ⏳ 탈출 시간: <strong>{Math.floor(timeLeft / 60)}분 {timeLeft % 60}초</strong>
              </span>
            </div>
          )}
          {gateOpenCountdown !== null && (
            <div className="bg-amber-950/90 border border-amber-800 px-3 py-1 rounded-lg text-[10px] font-black text-amber-300 animate-bounce">
              🚪 정문개방: {gateOpenCountdown}s
            </div>
          )}
        </div>
      </div>

      {/* 능력 버튼 (Skill slot activation HUD) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-35 flex flex-col items-center pointer-events-auto select-none">
        <button
          id="hud-skill-slot"
          type="button"
          onClick={() => {
            onUseSkill();
          }}
          disabled={(player.cooldowns["MAIN"] || 0) > 0 || player.isCaptured || player.hasEscaped}
          className={`px-4 py-1.5 border rounded-xl flex flex-col items-center gap-0.5 shadow-2xl transition duration-150 active:scale-95 cursor-pointer max-w-[200px] text-center ${
            (player.cooldowns["MAIN"] || 0) > 0
              ? "bg-slate-900/90 border-slate-800 text-slate-500"
              : "bg-blue-950/90 hover:bg-blue-900/90 border-blue-600 text-blue-200 shadow-[0_0_15px_rgba(29,78,216,0.5)] animate-pulse"
          }`}
        >
          <div className="flex items-center gap-1">
            <Zap className={`w-3.5 h-3.5 ${(player.cooldowns["MAIN"] || 0) > 0 ? "text-slate-500" : "text-amber-400"}`} />
            <span className="text-[9px] uppercase font-mono font-black tracking-widest whitespace-nowrap">
              능력 사용 단축키 [F]
            </span>
          </div>
          <span className="text-[10px] font-sans font-bold whitespace-nowrap overflow-hidden text-ellipsis w-40 text-slate-200">
            {player.role === "연시은" ? "볼펜 역습 (보디가드)" : 
             player.role === "박후민" ? "불도저 일격 (넉코)" : 
             player.role === "금성제" ? "쇠파이프 기습 (패닉)" : 
             player.role === "안수호" ? "즉각 구출 (수호방패)" : 
             player.team === "TEACHER" ? "락다운 기믹 작동" : "고유 전술"}
          </span>
          {(player.cooldowns["MAIN"] || 0) > 0 ? (
            <span className="text-[8px] font-mono text-slate-400">
              ⏱️ 대기시간: {player.cooldowns["MAIN"]}초
            </span>
          ) : (
            <span className="text-[8px] font-mono text-blue-400 font-bold">
              ⚡ READY (F키 / 클릭)
            </span>
          )}
        </button>
      </div>

      <canvas
            id="fpp-canvas-3d"
            ref={canvasRef}
            width={960}
            height={600}
            className="w-full h-auto aspect-[3/2] block bg-black cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              isDragging.current = true;
              lastMouseX.current = e.clientX;
              lastMouseY.current = e.clientY;
            }}
            onMouseMove={(e) => {
              if (!isDragging.current || player.isCaptured || player.hasEscaped) return;
              const deltaX = e.clientX - lastMouseX.current;
              const deltaY = e.clientY - lastMouseY.current;
              lastMouseX.current = e.clientX;
              lastMouseY.current = e.clientY;

              const sensitivity = 0.005;
              const nextAngle = localAngle.current + deltaX * sensitivity;
              cameraPitch.current = Math.max(-150, Math.min(150, cameraPitch.current - deltaY * 0.9));

              localAngle.current = nextAngle;
              throttledSendMove(localX.current, localY.current, nextAngle);
            }}
            onMouseUp={() => {
              isDragging.current = false;
              onMoveRef.current(localX.current, localY.current, localAngle.current);
            }}
            onMouseLeave={() => {
              isDragging.current = false;
              onMoveRef.current(localX.current, localY.current, localAngle.current);
            }}
          />

          {/* 우측 하단 컴팩트 실시간 복도 레이더 미니맵 */}
          <div className="absolute bottom-4 right-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex flex-col justify-center items-center shadow-2xl pointer-events-auto select-none gap-1 sm:bottom-6 sm:right-6">
            <span className="text-[8px] font-mono text-slate-400 font-bold tracking-wider uppercase">
              🧭 실시간 레이더
            </span>
            <canvas
              id="minimap-canvas"
              ref={minimapRef}
              width={100}
              height={100}
              className="bg-black/90 border border-slate-800 rounded shadow block"
            />
            {player.team === "STUDENT" && (
              <span className="text-[7px] text-slate-500 scale-90 whitespace-nowrap">
                🔴교사 접근 경보 작동
              </span>
            )}
          </div>

          {/* 좌측 하단 버추얼 십자패드 컨트롤러 */}
          <div className="absolute bottom-4 left-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-2 flex flex-col justify-center items-center shadow-2xl pointer-events-auto select-none sm:bottom-6 sm:left-6">
            {/* 십자키 레이아웃 */}
            <div className="grid grid-cols-3 gap-1 justify-center items-center">
              <div />
              <button
                id="joystick-up"
                type="button"
                onClick={() => handleVirtualMovement("F")}
                className="w-7 h-7 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white active:scale-95 rounded flex items-center justify-center font-bold text-[10px]"
                title="전진"
              >
                ▲
              </button>
              <div />

              <button
                id="joystick-left"
                type="button"
                onClick={() => handleVirtualMovement("L")}
                className="w-7 h-7 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white active:scale-95 rounded flex items-center justify-center font-bold text-[10px]"
                title="좌회전"
              >
                ◀
              </button>
              <button
                id="joystick-down"
                type="button"
                onClick={() => handleVirtualMovement("B")}
                className="w-7 h-7 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white active:scale-95 rounded flex items-center justify-center font-bold text-[10px]"
                title="후진"
              >
                ▼
              </button>
              <button
                id="joystick-right"
                type="button"
                onClick={() => handleVirtualMovement("R")}
                className="w-7 h-7 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white active:scale-95 rounded flex items-center justify-center font-bold text-[10px]"
                title="우회전"
              >
                ▶
              </button>
            </div>
          </div>

          {/* 조작 가이드 HUD Overlay */}
          <div className="absolute top-[76px] left-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 max-w-[240px] shadow-lg pointer-events-auto select-none font-sans text-left transition-all duration-300">
            <div className="flex items-center gap-1.5 border-b border-slate-850 border-slate-800 pb-1.5 mb-1.5 justify-between">
              <span className="text-[10px] font-bold text-blue-400 font-mono tracking-wider uppercase flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5" />
                ⌨️ CONTROLS
              </span>
              <button 
                onClick={() => setShowGuide(!showGuide)}
                className="text-[9px] hover:text-white text-slate-500 font-mono uppercase bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition"
              >
                {showGuide ? "HIDE" : "SHOW"}
              </button>
            </div>
            {showGuide ? (
              <div className="space-y-1.5 text-[10px] text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">이동 조작</span>
                  <kbd className="bg-slate-900 border border-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono text-[9px] font-bold">W S A D</kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">시선 회전</span>
                  <span className="bg-slate-900 border border-slate-800 text-slate-300 px-1 py-0.5 rounded font-mono text-[9px]">드래그 / 클릭</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">상호작용</span>
                  <kbd className="bg-slate-900 border border-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold text-amber-400">E 키</kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">고유 능력</span>
                  <kbd className="bg-slate-900 border border-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold text-blue-400">F 키</kbd>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 font-mono">
                <kbd className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">W,S,A,D</kbd> 이동 | <kbd className="bg-slate-900 px-1 py-0.5 rounded text-amber-400">E</kbd> 행동
              </p>
            )}
          </div>

          {/* 실시간 채팅 및 뉴스피드 HUD Overlay */}
          <div className="absolute top-[76px] right-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 w-64 sm:w-72 shadow-lg pointer-events-auto select-none flex flex-col max-h-40 md:max-h-48 text-left transition-all duration-300">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="text-[10px] font-bold text-green-400 font-mono tracking-wider uppercase flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-green-400" />
                💬 CHAT & EVENT LOG
              </span>
              <span className="text-[8px] font-mono text-slate-500 uppercase bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                AI SYNC
              </span>
            </div>
            
            <div className="overflow-y-auto space-y-1.5 flex-grow pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-track]:bg-transparent">
              {eventLogs.slice().reverse().map((log) => {
                let typeColor = "text-slate-300";
                let prefix = "•";

                if (log.type === "danger") {
                  typeColor = "text-red-400 font-semibold";
                  prefix = "🚨";
                } else if (log.type === "success") {
                  typeColor = "text-emerald-400 font-semibold";
                  prefix = "🎉";
                } else if (log.type === "speech") {
                  typeColor = "text-yellow-300 italic font-medium";
                  prefix = "💬";
                } else if (log.type === "skill") {
                  typeColor = "text-indigo-400 font-semibold";
                  prefix = "⚡";
                }

                return (
                  <div key={log.id} className="text-[10px] leading-relaxed flex items-start gap-1">
                    <span className="flex-shrink-0">{prefix}</span>
                    <span className={typeColor}>{log.text}</span>
                  </div>
                );
              })}

              {eventLogs.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-slate-500 text-[10px] py-4 font-sans">
                  <span>사건 발생 시 실시간 연동 대사가 출력됩니다.</span>
                </div>
              )}
            </div>
          </div>

          {/* READY_TIME 오버레이 - 교사팀일 때만 화면 잠금 오버레이 출력 (학생은 즉시 잠금해제 및 이동 탐색 가능) */}
          {phase === GamePhase.READY_TIME && player.team === "TEACHER" && (
            <div className="absolute inset-0 bg-[#0c0d10]/95 backdrop-blur-md flex flex-col justify-center items-center text-center p-6 border-4 border-slate-900 animate-fade-in z-25 select-none">
              <div className="p-3.5 rounded-full bg-slate-900/80 mb-3 border border-slate-800 flex items-center justify-center shadow-lg animate-pulse">
                {player.team === "STUDENT" ? (
                  <span className="text-4xl">🎒</span>
                ) : (
                  <span className="text-4xl">👞</span>
                )}
              </div>
              
              <p className="text-[9px] font-mono font-bold tracking-widest text-[#2563eb] mb-0.5">YOUR ASSIGNED ROLE</p>
              
              <h3 className="text-xl font-black italic tracking-wide text-white uppercase">
                {player.team === "STUDENT" ? (
                  <span>학생 팀 - <span className="text-blue-500">{player.name}</span></span>
                ) : (
                  <span>교사 팀 - <span className="text-red-500">{player.name}</span></span>
                )}
              </h3>

              <div className="h-[1px] w-28 bg-gradient-to-r from-transparent via-blue-500 to-transparent my-2.5"></div>

              {player.team === "STUDENT" ? (
                <div className="max-w-md space-y-1">
                  <p className="text-[11px] text-blue-400 font-bold animate-pulse">
                    "교사들이 방 문을 봉쇄하고 행동 개시하기 전까지 30초가 주어졌습니다!"
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed max-w-sm">
                    지금 바로 학교 구석구석을 돌아다니며 <span className="text-pink-500 font-semibold font-mono">5개 색깔의 열쇠 🔑</span>와 제어실에 숨겨진 발전기 제어 장치를 찾으세요! 복도는 이미 훤히 열려 있습니다.
                  </p>
                  <div className="mt-2.5 p-2 bg-blue-950/20 border border-blue-900/30 rounded-lg text-[9px] text-blue-300">
                    💡 <strong>즉시 이동 가능:</strong> 키보드 WASD 또는 가상 스틱으로 지금 학교 스카이라인을 배회하십시오!
                  </div>
                </div>
              ) : (
                <div className="max-w-md space-y-1">
                  <p className="text-[11px] text-red-500 font-bold animate-bounce">
                    "🚨 교사 패널티 대기실에 억류 상태입니다! ({readyCountdown}초 대기 필요)"
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed max-w-sm">
                    학생들에게 30초의 선진입 유예 시간을 줍니다. 교사는 학교 전체 지도를 분석하며 소탕 작전을 구상하세요. 대기 시간 만료 시 즉시 추적 장치를 활성화하십시오.
                  </p>
                  <div className="mt-2.5 p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-[9px] text-red-300">
                    ⚠️ <strong>이동 봉쇄:</strong> 준비 제한 시간이 종료될 때까지 움직일 수 없으니 신중히 계획하세요!
                  </div>
                </div>
              )}

              <div className="mt-3.5 font-mono text-[10px] bg-slate-900/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
                인게임 작전 개시까지: <strong className="text-yellow-500 font-bold text-xs animate-pulse">{readyCountdown}초</strong>
              </div>
            </div>
          )}

          {/* 인게임 상태 긴급 알림 배너 */}
          {interactPrompt && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-red-500/50 px-4 py-2.5 rounded-full text-xs font-semibold text-white tracking-wide shadow-xl flex items-center gap-2 animate-bounce">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              {interactPrompt}
            </div>
          )}

          {/* 만약 기절/체포되었을 때 적색 반투명 오버레이 */}
          {player.isCaptured && (
            <div className="absolute inset-0 bg-red-950/40 border-4 border-red-950 backdrop-blur-[1px] flex flex-col justify-center items-center text-center">
              <span className="text-4xl animate-bounce">🚨</span>
              <p className="text-white font-mono font-bold text-lg mt-2 drop-shadow-md text-shadow-red animate-pulse">생활지도실 감금 상태</p>
              <p className="text-slate-400 text-xs px-8 mt-1 max-w-sm">
                교사에게 붙잡혔습니다. 동료 학생이 생활지도실 문 앞으로 다가와 구해줄 때까지 움직일 수 없습니다!
              </p>
            </div>
          )}

          {player.hasEscaped && (
            <div className="absolute inset-0 bg-emerald-950/40 border-4 border-emerald-950 backdrop-blur-[1px] flex flex-col justify-center items-center text-center">
              <span className="text-4xl animate-bounce">🏃💨</span>
              <p className="text-emerald-400 font-mono font-bold text-lg mt-2 drop-shadow-md">학교 탈출 성공!</p>
              <p className="text-slate-400 text-xs px-8 mt-1">
                정문을 통과해 자유를 찾았습니다. 살아남은 동료 학생들이 모두 나올 수 있게 응원해주세요.
              </p>
            </div>
          )}
    </div>
  );
};

// ==========================================
// pSBC (Programmatic Style Butter Color) 헬퍼
// 소스의 색상의 명도를 변경해 음영 렌더링을 제공함
// ==========================================
function pSBC(p: number, c0: string, c1?: string, l?: boolean): string | null {
  let r: any, g: any, b: any, P: any, f: any, t: any, h: any, i = parseInt, m = Math.round, a: any = typeof (c1) == "string";
  if (typeof (p) != "number" || p < -1 || p > 1 || typeof (c0) != "string" || (c0[0] != 'r' && c0[0] != '#') || (c1 && !a)) return null;
  h = c0.length > 9, h = a ? (c1!.length > 9 ? true : c1![0] == "r" ? false : h) : h, f = pSBC.pSBCr(c0), P = p < 0, t = c1 ? pSBC.pSBCr(c1) : P ? { r: 0, g: 0, b: 0, a: -1 } : { r: 255, g: 255, b: 255, a: -1 }, p = P ? p * -1 : p, P = 1 - p;
  if (!f || !t) return null;
  if (l) r = m(P * f.r + p * t.r), g = m(P * f.g + p * t.g), b = m(P * f.b + p * t.b);
  else r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5), g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5), b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5);
  a = f.a, t = t.a, f = a >= 0 || t >= 0, a = f ? (a < 0 ? t : t < 0 ? a : a * P + t * p) : 0;
  if (h) return "rgb" + (f ? "a(" : "(") + r + "," + g + "," + b + (f ? "," + m(a * 1000) / 1000 : "") + ")";
  else return "#" + (16777216 + r * 65536 + g * 256 + b).toString(16).slice(1);
}

pSBC.pSBCr = (d: string) => {
  let l = d.length, r = { r: 0, g: 0, b: 0, a: -1 };
  if (l > 9) {
    const val = d.split(",");
    const key = val[0].slice(val[0][3] == "a" ? 5 : 4);
    r.r = parseInt(key), r.g = parseInt(val[1]), r.b = parseInt(val[2]), r.a = parseFloat(val[3] || "");
    return r;
  }
  if (l == 4) return { r: parseInt(d[1] + d[1], 16), g: parseInt(d[2] + d[2], 16), b: parseInt(d[3] + d[3], 16), a: -1 };
  return { r: parseInt(d.slice(1, 3), 16), g: parseInt(d.slice(3, 5), 16), b: parseInt(d.slice(5, 7), 16), a: -1 };
};
