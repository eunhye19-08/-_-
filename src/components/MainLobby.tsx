/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { StudentRole, TeacherRole, CharacterInfo, GamePhase } from "../types";
import { Users, Shield, BookOpen, Clock, Play, Plus, Zap, AlertTriangle, Copy, UserPlus } from "lucide-react";

// 웹툰 리얼리티를 녹인 캐릭터 스펙
export const STUDENT_CHARACTERS: { [key in StudentRole]: CharacterInfo } = {
  [StudentRole.YEON_SI_EUN]: {
    name: "연시은",
    avatar: "🎒",
    skillName: "볼펜 역습",
    skillDescription: "교사에게 붙잡힐 위기(매우 근접함) 시 작용하여, 날카로운 볼펜 공격으로 교사를 5초 동안 기절시키고 멀리 팅겨냅니다.",
    cooldown: 0, // 패시브 형식/위기 시 오토 혹은 수동 즉시 발동
    description: "은장고의 아웃사이더이자 독종. 정교하고 이성적인 계산 능력으로 상대를 무력화합니다.",
    quote: "귀찮게 굴지 마라. 내 계획에 오차는 없다."
  },
  [StudentRole.PARK_HU_MIN]: {
    name: "박후민",
    avatar: "🏀",
    skillName: "농구공 공격",
    skillDescription: "정면으로 묵직한 농구공을 강타하여 조준점에 있는 교사에게 즉시 던집니다. 교사를 6초 동안 기절칩니다.",
    cooldown: 60,
    description: "은장고 자타공인 넘버원 파워하우스. 듬직하고 의리 넘치는 거구의 괴물 학생.",
    quote: "내 친구들이 나가는 문은 내가 지킨다! 다 비켜!"
  },
  [StudentRole.KEUM_SUNG_JE]: {
    name: "금성제",
    avatar: "🏏",
    skillName: "빠따 기습공격",
    skillDescription: "소지한 야구 배트를 사정없이 휘둘러 1.5칸 반경 내의 위험한 교사를 즉각 6초 동안 완전히 실신(기절)시킵니다.",
    cooldown: 0, // 위기 시 강력한 즉발공격
    description: "형신고의 폭군으로 통하는 미치광이 싸움꾼. 비정하고 예측 불가능한 아우라.",
    quote: "어디서 감히 어깨를 치고 가? 다 자빠뜨려 줄 테니까 드루와."
  },
  [StudentRole.AHN_SU_HO]: {
    name: "안수호",
    avatar: "✨",
    skillName: "수호천사",
    skillDescription: "생활지도실에 체포되어 감금된 동료 학생 1명을 원격 무선 제어로 즉시 탈옥시켜 구출합니다.",
    cooldown: 180, // 3분 쿨다운
    description: "엄청난 운동능력을 숨긴 밝고 정의로운 최고의 조력자. 친구를 위해 목숨도 거는 수호자.",
    quote: "걱정 마라 친구야, 내가 있는 한 너희들은 다 무사히 집에 간다!"
  }
};

export const TEACHER_CHARACTERS: { [key in TeacherRole]: CharacterInfo } = {
  [TeacherRole.TEACHER_A]: {
    name: "발소리 추적",
    avatar: "👞",
    skillName: "발소리 추적",
    skillDescription: "15초 동안 사방 복도에 쩌렁쩌렁 울리는 학생들의 움직임 흔적(최근 3초 발자국)을 감지하고 미니맵에 역동적인 붉은 도트로 마킹합니다.",
    cooldown: 60,
    description: "원리원칙주의 학생부장. 복도에서 뛰거나 한밤중에 배회하는 학생의 발걸음을 기막히게 찾아내 잡아냅니다.",
    quote: "지조도 없는 녀석들! 복도에서 쾅쾅 뛰는 녀석 누구냐 당장 나와!"
  },
  [TeacherRole.TEACHER_B]: {
    name: "학생 위치 탐지",
    avatar: "👁️",
    skillName: "학생 GPS 탐지",
    skillDescription: "비정상 보안 스캐너를 켜서 5초 동안 맵 전역의 모든 비탈출 학생들의 실시간 현재 위치를 붉은 레이더로 포착하여 미니맵에 스캔합니다.",
    cooldown: 60,
    description: "최신식 장비와 수사 방식을 선호하는 생활지도 교사. 철두철미한 분석가로 도망의 미로를 사전에 완벽히 차단합니다.",
    quote: "도망쳐봤자 CCTV 감시망 뒤에선 네가 몇 학년 몇 반인지 다 나온단다."
  },
  [TeacherRole.TEACHER_C]: {
    name: "문 잠그기",
    avatar: "🔒",
    skillName: "문 임시 봉쇄",
    skillDescription: "자신의 근접 범위 혹은 정면에 있는 교실 문 한 개를 15초 동안 강제 강철 서터로 잠가 버려 학생들의 진입 및 탈출 기동을 봉쇄합니다.",
    cooldown: 60,
    description: "성질 급하고 힘으로 해결하려는 체육 교사. 일단 걸렸다 하면 우악스런 속도로 쫓아와 기어이 문을 걸어 잠그고 퇴로를 박살 냅니다.",
    quote: "잔머리 굴릴 틈 없다! 아가들아, 지금 이 방은 내가 잠가뒀으니 반성문이나 대기해라."
  }
};

interface MainLobbyProps {
  onStartGame: (setup: {
    nickname: string;
    studentRole: StudentRole;
    teacherRole: TeacherRole;
    teacherCount: number;
    timeLimit: number;
    participants: { name: string; ready: boolean; avatar: string }[];
  }) => void;
}

export const MainLobby: React.FC<MainLobbyProps> = ({ onStartGame }) => {
  const [nickname, setNickname] = useState("");
  const [selStudent, setSelStudent] = useState<StudentRole | null>(null);
  const [selTeacher, setSelTeacher] = useState<TeacherRole | null>(null);

  // 로비 및 방 대기 단체 시뮬레이션
  const [lobbyPhase, setLobbyPhase] = useState<"SELECT" | "ROOM_WAIT">("SELECT");
  const [lobbyMode, setLobbyMode] = useState<"SOLO" | "INVITE">("SOLO");
  const [teacherCount, setTeacherCount] = useState<number>(1);
  const [timeLimit, setTimeLimit] = useState<number>(300); // 5분 (300초)

  // 방 초대 코드 및 참여 방식 제어
  const [roomCode, setRoomCode] = useState<string>("");
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>("");
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [invitedNicknameInLobby, setInvitedNicknameInLobby] = useState<string>("");

  // 실감나는 AI 친구들의 방 진입 시뮬레이션
  const [aiParticipants, setAiParticipants] = useState<{ name: string; ready: boolean; avatar: string }[]>([]);

  useEffect(() => {
    // 최초 구동 시 기본 수려한 방 코드 선셋
    const rand = Math.floor(1000 + Math.random() * 9000);
    setRoomCode(`WEAK-${rand}`);
  }, []);

  useEffect(() => {
    if (lobbyPhase === "ROOM_WAIT") {
      if (lobbyMode === "SOLO") {
        const names = [
          { name: "은장고박지성", ready: false, avatar: "🔥" },
          { name: "볼펜깎이인형", ready: false, avatar: "✏️" },
          { name: "수호단대장", ready: false, avatar: "🦁" },
          { name: "형신고빠따짱", ready: false, avatar: "⚡" },
          { name: "삼인조막둥이", ready: false, avatar: "🦊" }
        ];

        // 시간차 난입 연출
        const timers: number[] = [];
        names.forEach((p, idx) => {
          const t1 = window.setTimeout(() => {
            setAiParticipants((prev) => {
              if (prev.some((b) => b.name === p.name)) return prev;
              return [...prev, p];
            });
            const t2 = window.setTimeout(() => {
              setAiParticipants((prev) =>
                prev.map((item) => (item.name === p.name ? { ...item, ready: true } : item))
              );
            }, 1500);
            timers.push(t2);
          }, (idx + 1) * 800);
          timers.push(t1);
        });

        return () => {
          timers.forEach((t) => window.clearTimeout(t));
        };
      } else {
        setAiParticipants([]);
      }
    } else {
      setAiParticipants([]);
    }
  }, [lobbyPhase, lobbyMode]);

  const handleCreateRoomAction = () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해 주십시오!");
      return;
    }
    if (!selStudent) {
      alert("탈출을 위한 '학생 역할'을 필수로 하나 선택해 주세요!");
      return;
    }
    if (!selTeacher) {
      alert("배정 대비용 '교사 역할'을 필수로 하나 선택해 주세요!");
      return;
    }
    
    // 호스트 자격 생성
    setIsGuest(false);
    const rand = Math.floor(1000 + Math.random() * 9000);
    setRoomCode(`WEAK-${rand}`);
    setLobbyPhase("ROOM_WAIT");
  };

  const handleJoinByCodeAction = () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해 주십시오!");
      return;
    }
    if (!selStudent) {
      alert("탈출을 위한 '학생 역할'을 필수로 하나 선택해 주세요!");
      return;
    }
    if (!selTeacher) {
      alert("배정 대비용 '교사 역할'을 필수로 하나 선택해 주세요!");
      return;
    }
    if (!inputCode.trim()) {
      alert("참가할 4자리 이상의 방 초대 코밀를 입력하세요!");
      return;
    }

    // 손님 자격 참여
    setIsGuest(true);
    setRoomCode(inputCode.trim().toUpperCase());
    setLobbyPhase("ROOM_WAIT");
    alert(`🔑 초대 코드 [${inputCode.trim().toUpperCase()}] 방에 정상 접속되었습니다!`);
  };

  const handleStartPlay = () => {
    if (!selStudent || !selTeacher) return;
    onStartGame({
      nickname: nickname || "연온달",
      studentRole: selStudent,
      teacherRole: selTeacher,
      teacherCount,
      timeLimit,
      participants: aiParticipants,
    });
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] text-gray-200 flex flex-col justify-between p-6 md:p-8 font-sans overflow-x-hidden select-none">
      
      {/* Header Section */}
      <header className="flex justify-between items-end mb-6 border-b border-gray-800 pb-4 max-w-7xl mx-auto w-full">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            약한영웅 <span className="text-red-600">: 학교 탈출</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Night School Lockdown &bull; First Person Co-op Escape</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 bg-[#1a1c22] p-2 rounded-lg border border-gray-700">
          <span className="text-[10px] text-gray-550 text-gray-500 uppercase font-bold px-2">Role Status</span>
          <span className="text-xs font-mono text-blue-400 font-bold">
            {selStudent ? STUDENT_CHARACTERS[selStudent].name : "미선택"} / {selTeacher ? TEACHER_CHARACTERS[selTeacher].name : "미선택"}
          </span>
        </div>
      </header>

      {/* 역할 선택지 & 닉네임 생성 단계 */}
      {lobbyPhase === "SELECT" ? (
        <div className="max-w-7xl mx-auto w-full flex-grow grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Student Selection Grid */}
          <div className="col-span-12 md:col-span-8 bg-[#15171d] rounded-2xl border border-gray-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2 text-white">
                  <span className="w-2 h-6 bg-blue-600"></span>
                  학생 역할 선택 <span className="text-xs text-gray-500 font-normal ml-2">(필수)</span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(STUDENT_CHARACTERS).map(([roleKey, char]) => {
                  const isSelected = selStudent === roleKey;
                  return (
                    <button
                      id={`student-btn-${roleKey}`}
                      key={roleKey}
                      type="button"
                      onClick={() => setSelStudent(roleKey as StudentRole)}
                      className={`text-left rounded-xl p-4 border transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? "bg-[#1c1f26] border-2 border-blue-600 ring-4 ring-blue-600/10"
                          : "bg-[#1c1f26] border-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <div className="w-full aspect-square bg-[#0c0d10] rounded-xl mb-3 overflow-hidden relative flex items-center justify-center">
                        <img 
                          src={`/${char.name}.png`} 
                          alt={char.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback");
                            if (fallback) {
                              (fallback as HTMLElement).classList.remove("hidden");
                              (fallback as HTMLElement).classList.add("block");
                            }
                          }}
                        />
                        <span className="avatar-fallback hidden text-4xl">{char.avatar}</span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-3">
                          <span className="text-sm font-black text-white drop-shadow-md">{char.name}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-blue-400 mb-1 uppercase font-bold">Ability: {char.skillName}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {char.skillDescription.split(".").slice(0, 1).join(".") + "."}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Teacher Selection Side */}
          <div className="col-span-12 md:col-span-4 bg-[#15171d] rounded-2xl border border-gray-800 p-6 flex flex-col">
            <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2 mb-6 text-white">
              <span className="w-2 h-6 bg-red-600"></span>
              교사 역할 선택 <span className="text-xs text-gray-500 font-normal ml-2">(배정 대비)</span>
            </h2>
            
            <div className="flex flex-col gap-3 flex-grow">
              {Object.entries(TEACHER_CHARACTERS).map(([roleKey, char]) => {
                const isSelected = selTeacher === roleKey;
                return (
                  <button
                    id={`teacher-btn-${roleKey}`}
                    key={roleKey}
                    type="button"
                    onClick={() => setSelTeacher(roleKey as TeacherRole)}
                    className={`flex items-center justify-between p-3 rounded-lg bg-[#1c1f26] border transition-all text-left cursor-pointer ${
                      isSelected
                        ? "border-red-600 ring-4 ring-red-600/15"
                        : "border-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-950/60 flex items-center justify-center text-red-500 font-bold border border-red-900 rounded-lg">
                        {char.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{char.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{char.skillName}</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${isSelected ? "border-red-600 bg-red-600" : "border-gray-700"}`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Settings Block */}
          <div className="col-span-12 md:col-span-4 bg-[#1c1f26] rounded-2xl border border-gray-800 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-800 pb-2">
                <Users className="w-4 h-4 text-blue-500" />
                LOBBY CREDENTIALS
              </h3>
              
              {/* Nickname */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-400 font-medium">플레이어 닉네임</span>
                <input
                  id="nickname-input"
                  type="text"
                  placeholder="예: 은장고탈출러"
                  maxLength={10}
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-[#15171d] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-xs font-semibold text-blue-400"
                />
              </div>

              {/* Join Code Input */}
              <div className="flex flex-col gap-1.5 border-t border-gray-800/60 pt-3">
                <span className="text-xs text-gray-400 font-medium">초대 코드로 참가하기 (선택)</span>
                <div className="flex gap-2">
                  <input
                    id="join-code-input"
                    type="text"
                    placeholder="예: WEAK-1234"
                    maxLength={10}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="flex-grow bg-[#15171d] border border-gray-800 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-xs font-mono"
                  />
                  <button
                    id="join-code-btn"
                    type="button"
                    onClick={handleJoinByCodeAction}
                    className="bg-[#2d313a] hover:bg-[#3b82f6] hover:text-white text-xs text-gray-300 font-bold px-3 py-2 rounded-xl border border-gray-700 transition-all cursor-pointer whitespace-nowrap"
                  >
                    코드 참가
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] mt-4 border-t border-gray-800/60 pt-3">
              <span className="text-gray-500 font-mono">STATUS</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                네트워크 대기 완료
              </span>
            </div>
          </div>

          {/* Mission Guide */}
          <div className="col-span-12 md:col-span-5 bg-[#1c1f26] rounded-2xl border border-gray-800 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-gray-400 font-bold uppercase mb-3 italic tracking-wider">Mission Protocol</h3>
              <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-400">
                <div className="space-y-1">
                  <p className="flex items-center gap-2"><span className="w-1 h-1 bg-red-500 rounded-full"></span> 5개의 색깔 열쇠 수집</p>
                  <p className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span> 자물쇠 해제 및 컴퓨터 전원 가동</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2"><span className="w-1 h-1 bg-green-500 rounded-full"></span> 정문 개방 후 1분 내 전원 탈출</p>
                  <p className="flex items-center gap-2"><span className="w-1 h-1 bg-white rounded-full"></span> 교사 체포 시 생활지도실 구금</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex gap-1 mb-2">
                 <div className="h-1 flex-grow bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
                 <div className="h-1 flex-grow bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                 <div className="h-1 flex-grow bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                 <div className="h-1 flex-grow bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.5)]"></div>
                 <div className="h-1 flex-grow bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.5)]"></div>
              </div>
              <p className="text-[9px] text-gray-650 text-gray-500 leading-none">* 열쇠를 쥔 채로 동일 색 자물쇠 문앞에 도착 시 자동 락해제됩니다.</p>
            </div>
          </div>

          {/* Start Button Area */}
          <div className="col-span-12 md:col-span-3 flex flex-col gap-3">
            <button
              id="create-room-btn"
              type="button"
              onClick={handleCreateRoomAction}
              disabled={!nickname.trim() || !selStudent || !selTeacher}
              className={`flex-grow text-white font-black text-xl uppercase tracking-tighter rounded-2xl border-b-4 transition-all flex flex-col items-center justify-center p-4 min-h-[100px] h-full group ${
                nickname.trim() && selStudent && selTeacher
                  ? "bg-red-600 hover:bg-red-700 border-red-950 cursor-pointer hover:scale-[1.02]"
                  : "bg-gray-800 text-gray-500 border-gray-950 cursor-not-allowed opacity-50"
              }`}
            >
              <span className="group-hover:scale-110 transition-transform">방 만들기</span>
              <span className="text-[9px] opacity-70 tracking-widest mt-1">CREATE SQUAD LOBBY</span>
            </button>
          </div>

        </div>
      ) : (
        /* ROOM WAIT : 방장 설정 및 참가자 확인 대기실 */
        <div className="max-w-7xl mx-auto w-full flex-grow grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Left Block: Lobby Settings */}
          <div className="col-span-12 md:col-span-6 bg-[#15171d] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            {isGuest && (
              <div className="absolute inset-0 bg-[#0c0d10]/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-4">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">⚠️ 방장 전용 관리 콘솔</span>
                <p className="text-[10px] text-gray-400 max-w-xs mt-1 leading-relaxed">
                  방 설정 변경 자격은 호스트에게만 있습니다. 방장이 인게임 매칭 전장을 로드할 때까지 잠시 대기해 주십시오!
                </p>
              </div>
            )}
            
            <div>
              <div className="border-b border-gray-800 pb-3 mb-5">
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-900 font-mono font-bold px-2.5 py-1 rounded-md uppercase">
                  {isGuest ? "GUEST CONSOLE" : "Host Console"}
                </span>
                <h2 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  은장고 탈출 게임 설정
                </h2>
              </div>

              {/* 교사 수 제어 */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wider">
                  교사 수 배치
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((num) => {
                    const isSel = teacherCount === num;
                    return (
                      <button
                        id={`teacher-count-btn-${num}`}
                        key={num}
                        type="button"
                        onClick={() => !isGuest && setTeacherCount(num)}
                        disabled={isGuest}
                        className={`py-3 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSel
                            ? "bg-red-950/50 border-red-500 text-red-300 shadow"
                            : "bg-slate-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white"
                        }`}
                      >
                        {num}명
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-550 text-gray-500 mt-2 leading-relaxed">
                  * 참가 인원 중 교사 수만큼 무작위 배정되며, 나머지는 탈출을 위해 움직이는 학생팀이 됩니다.
                </p>
              </div>

              {/* 탈출 제한 시간 제어 */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex justify-between">
                  <span>탈출 제한 시간</span>
                  <span className="text-red-400 font-mono font-semibold">
                    {Math.floor(timeLimit / 60)}분 {timeLimit % 60 > 0 ? `${timeLimit % 60}초` : ""} ({timeLimit}초)
                  </span>
                </label>
                <input
                  id="time-limit-range"
                  type="range"
                  min={180}
                  max={600}
                  step={60}
                  value={timeLimit}
                  disabled={isGuest}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full accent-red-655 accent-red-600 bg-slate-950 cursor-pointer h-1.5 rounded-lg border-none"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                  <span>3분 (짧고 스릴있게)</span>
                  <span>10분 (정통 탐색)</span>
                </div>
              </div>

              <div className="bg-[#1c1f26] border border-gray-800 rounded-xl p-4 mb-4 text-[11px] text-gray-400 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold">인게임 승리 조건:</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-[10px]">
                    <li><strong className="text-blue-400">학생 팀</strong>: 자물쇠를 열고 버튼 5개 작동 후, 정문이 개방되면 1분 안에 절반 이상 정문으로 무사히 돌파하여 탈출</li>
                    <li><strong className="text-red-400">교사 팀</strong>: 제한 시간 종료까지 학생들을 추적 진압, 또는 학생 절반 미만이 탈출하도록 저지</li>
                   </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                id="back-room-btn"
                type="button"
                onClick={() => setLobbyPhase("SELECT")}
                className="w-1/3 h-12 bg-[#252830] border border-gray-700 hover:bg-[#2d313a] rounded-xl text-xs font-bold text-gray-400 cursor-pointer transition-all"
              >
                뒤로가기
              </button>
              
              {isGuest ? (
                <div className="w-2/3 h-12 bg-blue-950 border border-blue-800 text-blue-400 font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
                  방장의 게임 매칭 로드를 대기 중...
                </div>
              ) : (
                <button
                  id="start-match-btn"
                  type="button"
                  onClick={handleStartPlay}
                  className="w-2/3 h-12 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-tighter rounded-xl border-b-4 border-red-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                >
                  <Play className="w-4 h-4" />
                  게임 시작 (역할 랜덤 배정)
                </button>
              )}
            </div>
          </div>

          {/* Right Block: Squad Waiting Room */}
          <div className="col-span-12 md:col-span-6 bg-[#15171d] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-600"></span>
                  스쿼드 대기실 ({1 + aiParticipants.length}/6)
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-[#2563eb] font-bold font-mono">LIVE LOBBY MATCH</span>
                </div>
              </div>

              {/* 참여 모드 선택기 (방장 전용) */}
              {!isGuest && (
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#0c0d10] border border-gray-800 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLobbyMode("SOLO");
                      alert("혼자하기 모드: AI 동료들이 자동으로 대기실을 채웁니다.");
                    }}
                    className={`py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      lobbyMode === "SOLO"
                        ? "bg-blue-600 border border-blue-800 text-white shadow-md font-sans"
                        : "bg-transparent text-gray-500 hover:text-gray-300 font-sans"
                    }`}
                  >
                    🤖 혼자하기 (AI 동료와)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLobbyMode("INVITE");
                      setAiParticipants([]);
                      alert("사람 초대 모드: 초대 코드로 입장한 친구들만 맞이합니다.");
                    }}
                    className={`py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                      lobbyMode === "INVITE"
                        ? "bg-indigo-600 border border-indigo-800 text-white shadow-md font-sans"
                        : "bg-transparent text-gray-500 hover:text-gray-300 font-sans"
                    }`}
                  >
                    👥 사람 초대하기
                  </button>
                </div>
              )}

              {/* [친구 초대 기저 제어 패널] */}
              <div className="bg-[#1c1f26] border border-gray-800 rounded-xl p-4 mb-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span className="font-semibold flex items-center gap-1">
                    🔑 방 입장 초대 코드
                  </span>
                  {copiedNotification && <span className="text-green-400 font-bold animate-pulse">복사 완료!</span>}
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-grow bg-[#0c0d10] border border-gray-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-center text-sm tracking-widest text-blue-400">
                    {roomCode}
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(roomCode);
                      setCopiedNotification(true);
                      setTimeout(() => setCopiedNotification(false), 2000);
                    }}
                    className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    코드 복사
                  </button>
                </div>

                {!isGuest && (
                  <div className="flex flex-col gap-2 mt-1 border-t border-gray-800 pt-3">
                    <span className="text-[9px] text-gray-400 flex items-center gap-1 leading-relaxed">
                      <UserPlus className="w-3 h-3 text-indigo-400" />
                      여기에 친구 닉네임을 써서 무선 초대장 보내기 (코드 가상 유입):
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="예시: 연시은초대친구"
                        value={invitedNicknameInLobby}
                        onChange={(e) => setInvitedNicknameInLobby(e.target.value)}
                        className="flex-grow bg-[#14151b] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!invitedNicknameInLobby.trim()) return;
                          if (aiParticipants.length >= 5) {
                            alert("인원이 가득 찼습니다 (최대 6인)!");
                            return;
                          }
                          const newFriend = { name: invitedNicknameInLobby.trim(), ready: true, avatar: "👥" };
                          setAiParticipants((prev) => [...prev, newFriend]);
                          setInvitedNicknameInLobby("");
                        }}
                        className="px-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer whitespace-nowrap"
                      >
                        가상 친구 합류
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 참가자 리스트 */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 select-none">
                {/* 플레이어 자기 자신 */}
                <div className="bg-[#1c1f26] border-2 border-blue-600 ring-4 ring-blue-600/10 rounded-xl p-3 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⭐</span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        {nickname || "은장고탈출러"}
                        <span className="text-[9px] font-bold bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded">
                          {isGuest ? "중도멤버" : "방장"}
                        </span>
                      </div>
                      <div className="text-[9px] text-[#2563eb] mt-0.5 font-bold">
                        선호 - 학: {selStudent ? STUDENT_CHARACTERS[selStudent].name : "N/A"} | 교: {selTeacher ? TEACHER_CHARACTERS[selTeacher].name : "N/A"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] border border-blue-900 text-blue-400 bg-blue-950/30 px-2.5 py-1 rounded font-bold font-mono">
                    READY
                  </span>
                </div>

                {/* AI / 초대 친구 참가자 카드 */}
                {aiParticipants.map((bot, i) => (
                  <div
                    key={i}
                    className="bg-[#1c1f26] border border-gray-800 rounded-xl p-3 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{bot.avatar}</span>
                      <div>
                        <div className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                          {bot.name}
                          <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded-sm">
                            {bot.avatar === "👥" ? "FRIEND" : "AI BOT"}
                          </span>
                        </div>
                        <div className="text-[9px] text-gray-500 mt-0.5">
                          연대 동지 &bull; {bot.ready ? "정상 대기열 대기" : "대기열 전환 중"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {bot.ready ? (
                        <span className="text-[10px] border border-emerald-900 text-emerald-400 bg-emerald-950/20 px-2.5 py-1 rounded font-bold font-mono">
                          READY
                        </span>
                      ) : (
                        <span className="text-[10px] border border-gray-800 text-gray-500 bg-slate-900/40 px-2.5 py-1 rounded font-serif animate-pulse">
                          CONNECTING..
                        </span>
                      )}
                      
                      {!isGuest && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiParticipants((prev) => prev.filter((_, idx) => idx !== i));
                          }}
                          className="text-[9px] bg-red-950 hover:bg-red-900 border border-red-900/60 text-red-400 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold select-none hover:scale-105"
                        >
                          추방
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* 남은 자리 채워짐 공백 */}
                {aiParticipants.length < 5 && (
                  <div className="border border-dashed border-gray-800 rounded-xl p-4 flex justify-center items-center h-12 text-gray-600 text-[10px] font-mono">
                    초대 코드를 통해 합류할 실시간 대기 학우 탐색 중...
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 mt-3 text-center">
              <span className="text-[9px] text-gray-500 block leading-normal">
                💡 친구 초대 버튼을 누르면 해당 닉네임의 가상 친구가 이 대기실에 유입 합류됩니다.
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Footer Section */}
      <footer className="mt-8 flex flex-col md:flex-row justify-between items-center w-full text-[10px] text-gray-500 border-t border-gray-800 pt-4 max-w-7xl mx-auto">
        <div className="flex gap-6 mb-2 md:mb-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-gray-500 uppercase">Server: East-Asia-01 (18ms)</span>
          </div>
          <span className="text-[#2563eb] font-bold">PLAYERS WATCHING: 1,480</span>
        </div>
        <div className="text-gray-605">
          &copy; 2026 NAVER WEBTOON / Weak Hero: School Escape Concept UI
        </div>
      </footer>
    </div>
  );
};
