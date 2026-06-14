/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { StudentRole, TeacherRole, CharacterInfo } from "../types";
import { Users, Shield, BookOpen, Clock, Play, Copy, UserPlus, LogOut, Award, Sparkles, User, UserCheck, Heart, AlertCircle } from "lucide-react";

export const STUDENT_CHARACTERS: { [key in StudentRole]: CharacterInfo } = {
  [StudentRole.YEON_SI_EUN]: {
    name: "연시은",
    avatar: "🎒",
    skillName: "볼펜 역습",
    skillDescription: "교사에게 붙잡힐 위기(매우 근접함) 시 작용하여, 날카로운 볼펜 공격으로 교사를 5초 동안 기절시키고 멀리 팅겨냅니다.",
    cooldown: 0,
    description: "은장고의 아웃사이더이자 독종. 정교하고 이성적인 계산 능력으로 상대를 무력화합니다.",
    quote: "귀찮게 굴지 마라. 내 계획에 오차는 없다."
  },
  [StudentRole.PARK_HU_MIN]: {
    name: "박후민",
    avatar: "🏀",
    skillName: "농구공 공격",
    skillDescription: "정면으로 묵직한 농구공을 강타하여 조준점에 있는 교사에게 즉시 던집니다. 교사를 6초 동안 기절시킵니다.",
    cooldown: 60,
    description: "은장고 자타공인 넘버원 파워하우스. 듬직하고 의리 넘치는 거구의 괴물 학생.",
    quote: "내 친구들이 나가는 문은 내가 지킨다! 다 비켜!"
  },
  [StudentRole.KEUM_SUNG_JE]: {
    name: "금성제",
    avatar: "🏏",
    skillName: "빠따 기습공격",
    skillDescription: "소지한 야구 배트를 사정없이 휘둘러 1.5칸 반경 내의 위험한 교사를 즉각 6초 동안 완전히 실신(기절)시킵니다.",
    cooldown: 0,
    description: "형신고의 폭군으로 통하는 미치광이 싸움꾼. 비정하고 예측 불가능한 아우라.",
    quote: "어디서 감히 어깨를 치고 가? 다 자빠뜨려 줄 테니까 드루와."
  },
  [StudentRole.AHN_SU_HO]: {
    name: "안수호",
    avatar: "✨",
    skillName: "수호천사",
    skillDescription: "생활지도실에 체포되어 감금된 동료 학생 1명을 원격 무선 제어로 즉시 탈옥시켜 구출합니다.",
    cooldown: 180,
    description: "엄청난 운동능력을 숨긴 밝고 정의로운 최고의 조력자. 친구를 위해 목숨도 거는 수호자.",
    quote: "걱정 마라 친구야, 내가 있는 한 너희들은 다 무사히 집에 간다!"
  }
};

export const TEACHER_CHARACTERS: { [key in TeacherRole]: CharacterInfo } = {
  [TeacherRole.TEACHER_A]: {
    name: "발소리 추적 교사",
    avatar: "👞",
    skillName: "발소리 추적",
    skillDescription: "15초 동안 사방 복도에 쩌렁쩌렁 울리는 학생들의 움직임 흔적(최근 3초 발자국)을 감지하고 미니맵에 역동적인 붉은 도트로 마킹합니다.",
    cooldown: 60,
    description: "원리원칙주의 학생부장. 복도에서 뛰거나 한밤중에 배회하는 학생의 발걸음을 기막히게 찾아내 잡아냅니다.",
    quote: "지조도 없는 녀석들! 복도에서 쾅쾅 뛰는 녀석 누구냐 당장 나와!"
  },
  [TeacherRole.TEACHER_B]: {
    name: "GPS 탐지 교사",
    avatar: "👁️",
    skillName: "학생 GPS 탐지",
    skillDescription: "비정상 보안 스캐너를 켜서 5초 동안 맵 전역의 모든 비탈출 학생들의 실시간 현재 위치를 붉은 레이더로 포착하여 미니맵에 스캔합니다.",
    cooldown: 60,
    description: "최신식 장비와 수사 방식을 선호하는 생활지도 교사. 철두철미한 분석가로 도망의 미로를 사전에 완벽히 차단합니다.",
    quote: "도망쳐봤자 CCTV 감시망 뒤에선 네가 몇 학년 몇 반인지 다 나온단다."
  },
  [TeacherRole.TEACHER_C]: {
    name: "임시 봉쇄 교사",
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
  currentUser: any;
  setCurrentUser: (user: any) => void;
  activeRoomCode: string;
  setActiveRoomCode: (code: string) => void;
  isLeader: boolean;
  setIsLeader: (leader: boolean) => void;
  lobbyPhase: "SELECT" | "ROOM_WAIT";
  setLobbyPhase: (phase: "SELECT" | "ROOM_WAIT") => void;
  lobbyMode: "SOLO" | "INVITE";
  setLobbyMode: (mode: "SOLO" | "INVITE") => void;
  players: any[]; // Polled from backend
}

export const MainLobby: React.FC<MainLobbyProps> = ({
  onStartGame,
  currentUser,
  setCurrentUser,
  activeRoomCode,
  setActiveRoomCode,
  isLeader,
  setIsLeader,
  lobbyPhase,
  setLobbyPhase,
  lobbyMode,
  setLobbyMode,
  players
}) => {
  // Auth Form State
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [authId, setAuthId] = useState<string>("");
  const [authPw, setAuthPw] = useState<string>("");
  const [authNick, setAuthNick] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authSuccess, setAuthSuccess] = useState<string>("");

  // Role Selections
  const [selStudent, setSelStudent] = useState<StudentRole>(StudentRole.YEON_SI_EUN);
  const [selTeacher, setSelTeacher] = useState<TeacherRole>(TeacherRole.TEACHER_A);

  // Settings
  const [teacherCount, setTeacherCount] = useState<number>(1);
  const [timeLimit, setTimeLimit] = useState<number>(300);

  // Joining Room State
  const [inputCode, setInputCode] = useState<string>("");
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [invitedNicknameInLobby, setInvitedNicknameInLobby] = useState<string>("");

  // AI bots in the wait room
  const [aiParticipants, setAiParticipants] = useState<{ name: string; ready: boolean; avatar: string }[]>([]);

  // Friend sidebar popover
  const [showFriendsPanel, setShowFriendsPanel] = useState<boolean>(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [addFriendInput, setAddFriendInput] = useState<string>("");
  const [friendActionStatus, setFriendActionStatus] = useState<string>("");

  // Target Profile Detail Popup Modal
  const [selectedProfileData, setSelectedProfileData] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Initialize basic code
  useEffect(() => {
    if (!activeRoomCode) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      setActiveRoomCode(`WEAK-${rand}`);
    }
  }, [activeRoomCode, setActiveRoomCode]);

  // Handle AI filling behavior in Solo mode
  useEffect(() => {
    if (lobbyPhase === "ROOM_WAIT") {
      if (lobbyMode === "SOLO") {
        const bots = [
          { name: "은장고박지성", ready: false, avatar: "🔥" },
          { name: "볼펜깎이인형", ready: false, avatar: "✏️" },
          { name: "수호단대장", ready: false, avatar: "🦁" },
          { name: "형신고빠따짱", ready: false, avatar: "⚡" },
          { name: "삼인조막둥이", ready: false, avatar: "🦊" }
        ];

        const timers: number[] = [];
        bots.forEach((b, idx) => {
          const t1 = window.setTimeout(() => {
            setAiParticipants((prev) => {
              if (prev.some((exist) => exist.name === b.name)) return prev;
              return [...prev, b];
            });
            const t2 = window.setTimeout(() => {
              setAiParticipants((prev) =>
                prev.map((item) => (item.name === b.name ? { ...item, ready: true } : item))
              );
            }, 1000);
            timers.push(t2);
          }, (idx + 1) * 600);
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

  // Load Friends List on Demand
  const loadFriends = async () => {
    if (!currentUser) return;
    try {
      const resp = await fetch(`/api/profile/friends/${currentUser.username}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setFriendsList(data.friends || []);
        }
      }
    } catch (err) {
      console.error("Failed to load friends:", err);
    }
  };

  useEffect(() => {
    if (currentUser && showFriendsPanel) {
      loadFriends();
    }
  }, [currentUser, showFriendsPanel]);

  // Auth: Submit Login or Register
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!authId.trim() || !authPw.trim()) {
      setAuthError("아이디와 비밀번호를 모두 입력하십시오.");
      return;
    }

    if (isRegisterMode && !authNick.trim()) {
      setAuthError("사용할 닉네임을 꼭 입력하십시오.");
      return;
    }

    const endpoint = isRegisterMode ? "/api/auth/register" : "/api/auth/login";
    const body = isRegisterMode
      ? { username: authId, password: authPw, nickname: authNick }
      : { username: authId, password: authPw };

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const contentType = resp.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!resp.ok) {
        let errMsg = "인증 처리 실패";
        if (isJson) {
          const data = await resp.json();
          errMsg = data.error || errMsg;
        } else {
          errMsg = `서버 연결 오류 (${resp.status}): 서버가 준비 중이거나 존재하지 않는 경로입니다. 잠시 후 다시 시도해보십시오.`;
        }
        setAuthError(errMsg);
        return;
      }

      if (!isJson) {
        setAuthError("서버 응답 오류 (JSON이 아닌 형식 수신): " + resp.statusText);
        return;
      }

      const data = await resp.json();
      if (data.success && data.profile) {
        setAuthSuccess(isRegisterMode ? "회원가입이 완료되었습니다! 로그인 정보로 로그인합니다." : "성공적으로 로그인되었습니다!");
        localStorage.setItem("weak_hero_user", JSON.stringify(data.profile));
        
        setTimeout(() => {
          setCurrentUser(data.profile);
          setAuthId("");
          setAuthPw("");
          setAuthNick("");
        }, 1000);
      }
    } catch (err: any) {
      setAuthError("서버와의 보안 교신 실패: " + err.message);
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    localStorage.removeItem("weak_hero_user");
    setCurrentUser(null);
    setLobbyPhase("SELECT");
    setActiveRoomCode("");
  };

  // Friend: Request Friend Connection
  const handleAddFriend = async (friendUsername: string) => {
    if (!currentUser) return;
    setFriendActionStatus("");
    try {
      const resp = await fetch("/api/profile/add_friend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          friendUsername: friendUsername
        })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setFriendActionStatus(data.message || "친구 신청 성공!");
        loadFriends();
        // Refresh currently viewed profile modal if open to change friend buttons
        if (selectedProfileData && selectedProfileData.username === friendUsername) {
          setSelectedProfileData((prev: any) => ({ ...prev, isFriend: true }));
        }
      } else {
        alert(data.error || "친구 추가 실패");
      }
    } catch (err) {
      console.error("Add friend failed:", err);
    }
  };

  // Profile: Look up on-demand Profile Details
  const viewMemberProfile = async (targetUserId: string, isBot: boolean, nicknamePlaceholder: string) => {
    setSelectedProfileData(null);
    setLoadingProfile(true);

    if (isBot) {
      // Mock static interesting stats for bots
      setTimeout(() => {
        const randWins = Math.floor(10 + Math.random() * 40);
        const randGames = randWins + Math.floor(5 + Math.random() * 30);
        setSelectedProfileData({
          username: targetUserId,
          nickname: nicknamePlaceholder,
          title: "은장고 상습탈출범",
          level: Math.floor(5 + Math.random() * 12),
          wins: randWins,
          escapes: randWins - Math.floor(Math.random() * 5),
          arrests: Math.floor(Math.random() * 10),
          games_played: randGames,
          isAI: true
        });
        setLoadingProfile(false);
      }, 300);
      return;
    }

    try {
      const resp = await fetch(`/api/profile/${targetUserId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.profile) {
          // Check if already friend
          const friendResp = await fetch(`/api/profile/friends/${currentUser.username}`);
          let isFriend = false;
          if (friendResp.ok) {
            const fData = await friendResp.json();
            isFriend = (fData.friends || []).some((f: any) => f.username === targetUserId);
          }

          setSelectedProfileData({
            ...data.profile,
            isAI: false,
            isFriend
          });
        }
      } else {
        // Fallback info if profile doesn't exist
        setSelectedProfileData({
          username: targetUserId,
          nickname: nicknamePlaceholder,
          title: "초보 모험가",
          level: 1,
          wins: 0,
          escapes: 0,
          arrests: 0,
          games_played: 1,
          isAI: false
        });
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Action: Create Room
  const handleCreateRoom = async () => {
    if (!currentUser) return;
    setIsLeader(true);

    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `WEAK-${rand}`;

    try {
      const resp = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          hostId: currentUser.username,
          hostNickname: currentUser.nickname,
          studentRole: selStudent,
          teacherRole: selTeacher,
          timeLimit,
          teacherCount,
          lobbyMode
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setActiveRoomCode(code);
          setLobbyPhase("ROOM_WAIT");
        }
      }
    } catch (err) {
      console.error("Room creation error:", err);
      // Fallback
      setActiveRoomCode(code);
      setLobbyPhase("ROOM_WAIT");
    }
  };

  // Action: Join Room
  const handleJoinRoom = async () => {
    if (!currentUser) return;
    if (!inputCode.trim()) {
      alert("접속할 초대 코드를 써 주십시오.");
      return;
    }

    const upperInput = inputCode.trim().toUpperCase();
    setIsLeader(false);

    try {
      const resp = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: upperInput,
          username: currentUser.username,
          nickname: currentUser.nickname,
          studentRole: selStudent,
          teacherRole: selTeacher
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "방 참가 실패");
        return;
      }

      if (data.success) {
        setActiveRoomCode(upperInput);
        setLobbyPhase("ROOM_WAIT");
        alert(`🔑 초대 코드 [${upperInput}] 방에 정상 진입했습니다!`);
      }
    } catch (err) {
      console.error("Room join error:", err);
      alert("방 입장 연동 오버플로우가 빌드되었습니다. 네트워크를 확인해 주세요.");
    }
  };

  // Action: Trigger Start Game
  const handleStartPlay = () => {
    if (!selStudent || !selTeacher) return;

    // Combine humans from the room stream with AI bots
    const combinedParticipants = [
      ...players.filter((p) => p.id !== currentUser.username).map((p) => ({
        name: p.nickname,
        ready: true,
        avatar: "👥"
      })),
      ...aiParticipants
    ];

    onStartGame({
      nickname: currentUser?.nickname || "연시은",
      studentRole: selStudent,
      teacherRole: selTeacher,
      teacherCount,
      timeLimit,
      participants: combinedParticipants
    });
  };

  // Render Login overlay if unauthenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0c0d10] text-[#ccd6f6] flex flex-col justify-center items-center p-6 relative select-none">
        {/* Glow ambient background assets */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 blur-[120px] rounded-full" />

        <div className="max-w-md w-full bg-[#15171d] border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600" />
          
          <div className="text-center mb-8">
            <span className="text-3xl font-bold tracking-widest text-red-500 font-sans italic">WEAK HERO</span>
            <h1 className="text-2xl font-black text-white mt-1 tracking-wider uppercase font-sans">봉쇄된 학교</h1>
            <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest mt-1">First-Person Cooperative Escape</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">사용자 아이디 (로그인 ID)</label>
              <input
                type="text"
                placeholder="영문, 숫자 혹은 이메일"
                value={authId}
                onChange={(e) => setAuthId(e.target.value)}
                maxLength={20}
                required
                className="w-full bg-[#0c0d10] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder-gray-800 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">보안 비밀번호 PASSWORD</label>
              <input
                type="password"
                placeholder="비밀번호"
                value={authPw}
                onChange={(e) => setAuthPw(e.target.value)}
                required
                className="w-full bg-[#0c0d10] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder-gray-800 font-sans"
              />
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-sans">게임 전용 닉네임 설정 NICKNAME</label>
                <input
                  type="text"
                  placeholder="웹툰 캐릭터 어울리는 이름으로"
                  value={authNick}
                  onChange={(e) => setAuthNick(e.target.value)}
                  maxLength={12}
                  required
                  className="w-full bg-[#0c0d10] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder-gray-800 font-sans"
                />
              </div>
            )}

            {authError && (
              <div className="bg-red-950/40 border border-red-500/20 p-3 rounded-lg text-xs text-red-400 font-semibold flex items-center gap-1.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="bg-green-950/40 border border-green-500/20 p-3 rounded-lg text-xs text-green-400 font-semibold">
                {authSuccess}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-red-900/20"
            >
              {isRegisterMode ? "회원 등록 승인" : "보안 로그인 액션"}
            </button>
          </form>

          <div className="border-t border-slate-800/60 mt-6 pt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError("");
                setAuthSuccess("");
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline transition-colors cursor-pointer"
            >
              {isRegisterMode ? "기존 아이디가 있습니다. 로그인하기" : "아직 계정이 없습니다. 신규 회원가입"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Win Rate Safely
  const winRate = currentUser?.games_played > 0
    ? Math.round((currentUser.wins / currentUser.games_played) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#ccd6f6] flex flex-col justify-between p-6 md:p-8 font-sans overflow-x-hidden select-none relative">
      
      {/* Top Banner Navigation bar detailing Profile Information */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-slate-800 pb-4 max-w-7xl mx-auto w-full relative z-20">
        <div className="flex items-center gap-3">
          <div className="text-red-500 shrink-0 font-sans italic font-black text-xl tracking-widest">WEAK HERO</div>
          <span className="text-gray-600 font-mono text-xs">|</span>
          <div className="text-sm font-semibold text-[#8892b0] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            대표 칭호 : <span className="text-emerald-400 font-black">{currentUser.title || "초보 탈출러"}</span>
          </div>
        </div>

        {/* Dynamic Multi-user Profile Overview panel */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
          <div className="flex items-center bg-[#15171d] border border-slate-800 rounded-xl px-4 py-2 text-xs gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-900 border border-blue-600 flex items-center justify-center text-[10px] font-black text-white">L{currentUser.level || 1}</span>
              <span className="font-bold text-white max-w-[120px] overflow-hidden text-ellipsis">{currentUser.nickname}</span>
              <span className="text-[10px] text-gray-500">님 (ID: {currentUser.username})</span>
            </div>
            
            <span className="text-gray-800 font-serif">|</span>

            <div className="flex gap-4 font-mono font-bold text-[10px]">
              <div>승률 <span className="text-blue-400 ml-1">{winRate}%</span></div>
              <div>탈출 <span className="text-green-400 ml-1">{currentUser.escapes || 0}회</span></div>
              <div>체포 <span className="text-red-400 ml-1">{currentUser.arrests || 0}회</span></div>
              <div>코인 <span className="text-yellow-400 ml-1">{currentUser.coins || 0}c</span></div>
            </div>
          </div>

          {/* Quick-links Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFriendsPanel(!showFriendsPanel)}
              className="px-3 py-2 bg-[#1b1c23] hover:bg-[#252732] border border-slate-800 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer relative"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>친구 목록</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="max-w-7xl mx-auto w-full flex-grow relative z-10 grid grid-cols-12 gap-6 md:gap-8">
        
        {/* LEFT COLUMN: FRIENDS SIDEBAR (Drawer Popover if active) */}
        {showFriendsPanel && (
          <div className="col-span-12 lg:col-span-3 bg-[#15171d] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative transition-all">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4 h-8">
                <span className="text-xs font-black tracking-widest text-indigo-400 flex items-center gap-1.5 font-sans">
                  <Users className="w-3.5 h-3.5" />
                  내 친구들목록 ({friendsList.length})
                </span>
                <button
                  onClick={() => setShowFriendsPanel(false)}
                  className="text-xs text-gray-500 hover:text-gray-300 font-bold"
                >
                  닫기
                </button>
              </div>

              {/* Add Friend Row */}
              <div className="mb-4">
                <p className="text-[9px] text-[#8892b0] mb-1 font-semibold">친구 추가하기 (ID 계정 이름 입력)</p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="친구 아이디 입력"
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    className="flex-grow bg-[#0c0d10] border border-slate-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (!addFriendInput.trim()) return;
                      handleAddFriend(addFriendInput.trim());
                      setAddFriendInput("");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 px-2 rounded-lg text-white font-bold transition-all cursor-pointer flex items-center text-xs"
                  >
                    추가
                  </button>
                </div>
                {friendActionStatus && <p className="text-[9px] text-[#4ea03e] mt-1 font-bold animate-pulse">{friendActionStatus}</p>}
              </div>

              {/* Friends list map */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {friendsList.length === 0 ? (
                  <div className="text-center py-8 text-gray-650 text-[10px] border border-dashed border-slate-850 rounded-xl leading-relaxed">
                    등록된 친구가 없습니다.<br />학우의 아이디를 검색해 추가해보세요!
                  </div>
                ) : (
                  friendsList.map((f, i) => (
                    <div
                      key={i}
                      onClick={() => viewMemberProfile(f.username, false, f.nickname)}
                      className="bg-[#0c0d10] hover:bg-[#1a1b24] border border-slate-850 hover:border-slate-800 p-2.5 rounded-xl cursor-pointer transition-all flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1 leading-none">
                            {f.nickname}
                          </div>
                          <span className="text-[9px] text-[#8892b0] mt-0.5 block leading-none">{f.title || "초보 탈출러"} (L{f.level || 1})</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-indigo-400 font-bold bg-indigo-950/20 border border-indigo-900/30 px-1.5 py-0.2 rounded font-sans">
                        프로필
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-slate-800/50 pt-4 text-center mt-4">
              <p className="text-[9px] text-gray-500 leading-normal">
                💡 친구 닉네임을 더블클릭하거나 프로필을 눌러 그들의 전적(승률, 탈출, 체포 칭호)을 정밀 정찰할 수 있습니다!
              </p>
            </div>
          </div>
        )}

        {/* MIDDLE COLUMN: MAIN CONFIG / LOBBY PREWait SCREEN */}
        <div className={`col-span-12 ${showFriendsPanel ? "lg:col-span-9" : "lg:col-span-12"}`}>
          
          {lobbyPhase === "SELECT" ? (
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Column: Character settings Preferences */}
              <div className="col-span-12 lg:col-span-7 space-y-6">
                
                {/* Preference Student card */}
                <div className="bg-[#15171d] border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
                  
                  <h2 className="text-base font-black text-white flex items-center gap-2 tracking-wide uppercase italic">
                    <span className="w-2.5 h-5 bg-blue-600 rounded"></span>
                    은장고 학생연맹 선호 캐릭터 지정 (탈출 팀)
                  </h2>
                  <p className="text-xs text-gray-450 mt-1 leading-relaxed">자신의 주 학생 전술을 골라주십시오. 게임 진입 후 학생 역할 배정 시 이 지망을 우선적으로 적용합니다.</p>

                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {Object.entries(STUDENT_CHARACTERS).map(([role, info]) => {
                      const isSel = (selStudent === role);
                      return (
                        <button
                          key={role}
                          onClick={() => setSelStudent(role as StudentRole)}
                          className={`relative border-2 rounded-2xl p-3 flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-[1.03] outline-none ${
                            isSel
                              ? "bg-blue-950/20 border-blue-500 ring-4 ring-blue-500/10"
                              : "bg-[#0c0d10] border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span className="text-3xl filter drop-shadow">{info.avatar}</span>
                          <span className="text-xs font-black text-white mt-2 leading-none">{info.name}</span>
                          <span className="text-[8px] bg-blue-900/30 text-blue-400 px-1.5 py-0.2 rounded mt-1.5 font-bold whitespace-nowrap">{info.skillName}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Character stat specs details */}
                  <div className="bg-[#0c0d10] border border-slate-800/80 rounded-2xl p-4 mt-4 text-xs">
                    <div className="flex items-center gap-1.5 font-black text-white">
                      <span>{STUDENT_CHARACTERS[selStudent].avatar}</span>
                      <span>{STUDENT_CHARACTERS[selStudent].name} 핵심 전술 요강</span>
                    </div>
                    <p className="text-slate-400 text-[11px] italic mt-1 bg-slate-900/20 border-l-2 border-slate-800 pl-2">
                       "{STUDENT_CHARACTERS[selStudent].quote}"
                    </p>
                    <div className="grid grid-cols-12 gap-4 mt-3 pt-3 border-t border-slate-850">
                      <div className="col-span-12 md:col-span-4">
                        <span className="block text-[10px] text-gray-500 uppercase font-mono font-bold tracking-wider">특기 능력명</span>
                        <span className="text-blue-400 font-bold text-[11px] mt-0.5 block">{STUDENT_CHARACTERS[selStudent].skillName}</span>
                      </div>
                      <div className="col-span-12 md:col-span-8">
                        <span className="block text-[10px] text-gray-500 uppercase font-mono font-bold tracking-wider">특기 상세 효능</span>
                        <p className="text-[10px] text-gray-400 leading-normal mt-0.5">{STUDENT_CHARACTERS[selStudent].skillDescription}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preference Teacher Card */}
                <div className="bg-[#15171d] border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full" />
                  
                  <h2 className="text-base font-black text-white flex items-center gap-2 tracking-wide uppercase italic">
                    <span className="w-2.5 h-5 bg-red-600 rounded"></span>
                    학생부 교사 사냥단 대리 역할 지정 (추격 팀)
                  </h2>
                  <p className="text-xs text-gray-450 mt-1 leading-relaxed">만약 추격 주임교사 팀으로 최종 배정될 것을 대비하여 선호 전술 무장을 준비해주십시오.</p>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {Object.entries(TEACHER_CHARACTERS).map(([role, info]) => {
                      const isSel = (selTeacher === role);
                      return (
                        <button
                          key={role}
                          onClick={() => setSelTeacher(role as TeacherRole)}
                          className={`relative border-2 rounded-2xl p-3 flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-[1.03] outline-none ${
                            isSel
                              ? "bg-red-950/20 border-red-500 ring-4 ring-red-500/10"
                              : "bg-[#0c0d10] border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span className="text-3xl filter drop-shadow">{info.avatar}</span>
                          <span className="text-xs font-black text-white mt-2 leading-none whitespace-nowrap">{info.name.replace("교사", "")}</span>
                          <span className="text-[8px] bg-red-900/30 text-red-500 px-1.5 py-0.2 rounded mt-1.5 font-bold whitespace-nowrap">{info.skillName}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Teacher spec info details */}
                  <div className="bg-[#0c0d10] border border-slate-800/80 rounded-2xl p-4 mt-4 text-xs">
                    <div className="flex items-center gap-1.5 font-black text-white">
                      <span>{TEACHER_CHARACTERS[selTeacher].avatar}</span>
                      <span>{TEACHER_CHARACTERS[selTeacher].name} 순찰 기강지침</span>
                    </div>
                    <p className="text-slate-400 text-[11px] italic mt-1 bg-slate-900/20 border-l-2 border-slate-800 pl-2">
                       "{TEACHER_CHARACTERS[selTeacher].quote}"
                    </p>
                    <div className="grid grid-cols-12 gap-4 mt-3 pt-3 border-t border-slate-850">
                      <div className="col-span-12 md:col-span-4">
                        <span className="block text-[10px] text-gray-500 uppercase font-mono font-bold tracking-wider">주임 기술명</span>
                        <span className="text-red-400 font-bold text-[11px] mt-0.5 block">{TEACHER_CHARACTERS[selTeacher].skillName}</span>
                      </div>
                      <div className="col-span-12 md:col-span-8">
                        <span className="block text-[10px] text-gray-500 uppercase font-mono font-bold tracking-wider">포착 기동 전술능력</span>
                        <p className="text-[10px] text-gray-400 leading-normal mt-0.5">{TEACHER_CHARACTERS[selTeacher].skillDescription}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Room hosting and join-room action inputs */}
              <div className="col-span-12 lg:col-span-5 space-y-6">
                
                {/* Create Room Block */}
                <div className="bg-[#15171d] border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <span className="text-xs font-mono font-black text-blue-500 tracking-wider">HOST NEW LOBBY</span>
                  <h3 className="text-lg font-black text-white mt-1 tracking-wider uppercase font-sans">신규 학교 통제방 개설</h3>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">지휘 방장이 되어 커스텀 락다운 탈출 방을 생성합니다. 친구들을 초대하여 모이거나 AI를 투입해 즐기세요!</p>

                  <div className="space-y-4 mt-4">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-gray-400 mb-1">
                        <span>👮 학생 주임교사 가용 명수</span>
                        <span className="text-blue-400 font-bold font-sans">{teacherCount}명 배율</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setTeacherCount(num)}
                            className={`py-2 text-xs font-black rounded-lg transition-all border cursor-pointer outline-none ${
                              teacherCount === num
                                ? "bg-blue-600/10 border-blue-500 text-blue-400 font-bold"
                                : "bg-transparent border-slate-850 text-gray-500 hover:text-gray-400"
                            }`}
                          >
                            교사 {num}인조 배정
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-gray-400 mb-1">
                        <span>⏱️ 락다운 학교 제한 시간</span>
                        <span className="text-blue-400 font-bold font-sans">{Math.floor(timeLimit / 60)}분 설정</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[180, 300, 480].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setTimeLimit(sec)}
                            className={`py-2 text-xs font-black rounded-lg transition-all border cursor-pointer outline-none ${
                              timeLimit === sec
                                ? "bg-blue-600/10 border-blue-500 text-blue-400 font-bold"
                                : "bg-transparent border-slate-850 text-gray-500 hover:text-gray-400"
                            }`}
                          >
                            {sec / 60}분 제한
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleCreateRoom}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-900/10"
                    >
                      방 개설 완료 후 대기실 진입
                    </button>
                  </div>
                </div>

                {/* Join Room by Invitation Code */}
                <div className="bg-[#15171d] border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <span className="text-xs font-mono font-black text-indigo-400 tracking-wider">JOIN BY CODE</span>
                  <h3 className="text-lg font-black text-white mt-1 tracking-wider uppercase font-sans">초대 코드로 빠른 침투</h3>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">노트북이나 타 기기에서 발급한 4자리 영숫자 코드를 기입하면 해당 멀티플레이 세션에 기어(합류)합니다.</p>

                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-[9px] font-mono font-black text-gray-400 mb-1 uppercase">참가 코드 4자리 (WEAK-XXXX 등)</label>
                      <input
                        type="text"
                        placeholder="예시: WEAK-4589"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="w-full bg-[#0c0d10] border border-slate-800 rounded-xl px-4 py-2.5 text-center font-mono font-bold tracking-widest text-[#2563eb] placeholder-gray-800 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    </div>

                    <button
                      onClick={handleJoinRoom}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      입력된 코드로 침투 개시 !
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            
            // ROOM_WAIT VIEW (Waiting Room Layout)
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Block: Matchmaking controls Settings Summary */}
              <div className="col-span-12 md:col-span-6 bg-[#15171d] border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-slate-800 mb-4 h-8 flex justify-between items-center">
                    <h2 className="text-sm font-black text-white flex items-center gap-1.5 uppercase italic">
                      <Shield className="w-4 h-4 text-red-500" />
                      락다운 탈출 보안 설정 요람
                    </h2>
                    <span className="text-[10px] bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-black font-mono">
                      {isLeader ? "HOST 권한" : "GUEST 모니터링"}
                    </span>
                  </div>

                  {/* Settings specs */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-[#0c0d10] border border-slate-850 p-3 rounded-xl text-xs">
                      <span className="text-gray-400">교사 사냥단 배율 수치</span>
                      <span className="font-bold text-white font-sans">{teacherCount}명 배치</span>
                    </div>

                    <div className="flex justify-between items-center bg-[#0c0d10] border border-slate-850 p-3 rounded-xl text-xs">
                      <span className="text-gray-400">탈출 폭파 제한 시간</span>
                      <span className="font-bold text-white font-sans">{Math.floor(timeLimit / 60)}분 (00초)</span>
                    </div>

                    <div className="flex justify-between items-center bg-[#0c0d10] border border-slate-850 p-3 rounded-xl text-xs">
                      <span className="text-gray-400">방장 주소 코드</span>
                      <span className="font-bold text-blue-400 font-mono tracking-widest">{activeRoomCode}</span>
                    </div>

                    {/* Mission Overview briefing */}
                    <div className="bg-[#1c1f26] border border-slate-800 rounded-xl p-4 text-[11px] leading-relaxed relative">
                      <div className="text-amber-500 font-black mb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        학교 기강 특별 지시사항 요람
                      </div>
                      - 학생들은 맵 곳곳에 유실된 5가지 주파수 카드키(빨강, 파랑, 노랑, 초록, 보라)를 주워 같은 색 자물쇠가 걸린 격실문을 해방하십시오.<br />
                      - 격실 해방 후 벽면에 붙어 있는 비화 버튼을 켜면 잠긴 정문 락다운 정화 수치(100%)가 깎여나가 대정문 도주로가 활성화됩니다.<br />
                      - 교사는 소지한 위치탐지 기술을 적재적소 시전하여 도망치려는 학생들을 포획 후 생활지도실에 강제 벌점 감금하십시오!
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 mt-6 flex justify-between gap-3 items-center">
                  <button
                    onClick={() => {
                      setLobbyPhase("SELECT");
                      setActiveRoomCode("");
                    }}
                    className="w-1/3 h-12 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    대기방 퇴출
                  </button>

                  {isLeader && (
                    <button
                      onClick={handleStartPlay}
                      className="w-2/3 h-12 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wider rounded-xl border-b-4 border-red-900 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-900/30"
                    >
                      <Play className="w-4 h-4" />
                      게임 시작 (역할 비밀 배정)
                    </button>
                  )}
                </div>
              </div>

              {/* Right Block: Squad Waiting Room (Connected entities) */}
              <div className="col-span-12 md:col-span-6 bg-[#15171d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-slate-800 mb-4 h-8 flex justify-between items-center">
                    <h2 className="text-sm font-black text-white flex items-center gap-1.5 uppercase italic">
                      <Users className="w-4 h-4 text-indigo-400" />
                      스쿼드 전술 대기실 ({1 + players.filter(p => p.id !== currentUser.username && !p.isAI).length + aiParticipants.length}/6인)
                    </h2>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>

                  {/* Mode select buttons (Host only) */}
                  {isLeader && (
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#0c0d10] border border-slate-850 rounded-xl mb-4 text-xs font-bold text-center">
                      <button
                        onClick={() => {
                          setLobbyMode("SOLO");
                          alert("혼자하기 모드: 빠른 시작을 위해 AI 조력 학생들이 대기실에 가득 채워집니다.");
                        }}
                        className={`py-2 rounded-lg transition-all cursor-pointer ${
                          lobbyMode === "SOLO"
                            ? "bg-blue-600 border border-blue-800 text-white"
                            : "bg-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        🤖 혼자하기 (AI와 동료)
                      </button>
                      <button
                        onClick={() => {
                          setLobbyMode("INVITE");
                          setAiParticipants([]);
                          alert("사람 초대하기 모드: 노트북 방에 친구가 초대코드로 입장할 때까지 실시간 전파 수신합니다.");
                        }}
                        className={`py-2 rounded-lg transition-all cursor-pointer ${
                          lobbyMode === "INVITE"
                            ? "bg-indigo-600 border border-indigo-800 text-white"
                            : "bg-transparent text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        👥 사람 초대하기
                      </button>
                    </div>
                  )}

                  {/* Room code copier drawer action */}
                  <div className="bg-[#1c1f26] border border-slate-800 rounded-xl p-4 mb-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500 tracking-wider">
                      <span>🔑 친구 초대용 침투코드</span>
                      {copiedNotification && <span className="text-green-400 font-bold animate-pulse">복사 성공!</span>}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-grow bg-[#0c0d10] border border-slate-800 rounded-lg px-3 py-2 text-[#2563eb] font-mono font-black text-center text-sm tracking-widest leading-none flex items-center justify-center">
                        {activeRoomCode}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeRoomCode);
                          setCopiedNotification(true);
                          setTimeout(() => setCopiedNotification(false), 2000);
                        }}
                        className="px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                        복사
                      </button>
                    </div>

                    {isLeader && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-800/80">
                        <span className="text-[9px] text-[#8892b0] flex items-center gap-1">
                          <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                          대기실 유입 가상 친구 즉치 소환:
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="예시: 골목대장박종철"
                            value={invitedNicknameInLobby}
                            onChange={(e) => setInvitedNicknameInLobby(e.target.value)}
                            className="flex-grow bg-[#0c0d10] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => {
                              if (!invitedNicknameInLobby.trim()) return;
                              if (aiParticipants.length >= 5) {
                                alert("방 내부 정원이 가득 찼습니다!");
                                return;
                              }
                              const entry = { name: invitedNicknameInLobby.trim(), ready: true, avatar: "👥" };
                              setAiParticipants((prev) => [...prev, entry]);
                              setInvitedNicknameInLobby("");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white cursor-pointer transition-all"
                          >
                            즉시 난입
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connected participant cards flow container */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    
                    {/* 1. HOST Player card (Local self player card) */}
                    <div
                      onClick={() => viewMemberProfile(currentUser.username, false, currentUser.nickname)}
                      className="bg-[#1c1f26] border-2 border-blue-600 ring-4 ring-blue-600/10 rounded-xl p-3 flex justify-between items-center relative overflow-hidden cursor-pointer"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                      <div className="flex items-center gap-3">
                        <span className="text-xl">⭐</span>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1">
                            {currentUser.nickname} (나)
                            <span className="text-[8px] bg-blue-900/40 text-blue-300 border border-blue-800/20 px-1 py-0.2 rounded font-sans">
                              {isLeader ? "방장" : "대기부원"}
                            </span>
                          </div>
                          <span className="text-[9px] text-[#2563eb] mt-0.5 block leading-none font-semibold">
                            지망 - 학: {STUDENT_CHARACTERS[selStudent].name} | 교: {TEACHER_CHARACTERS[selTeacher].name.replace("교사", "")}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] border border-blue-900 text-blue-400 bg-blue-950/20 px-2 py-0.8 rounded font-black font-mono">
                        READY
                      </span>
                    </div>

                    {/* 2. Synced Genuine Guest Human connection cards */}
                    {players
                      .filter((p) => p.id !== currentUser.username)
                      .map((guest, idx) => (
                        <div
                          key={`guest_${idx}`}
                          onClick={() => viewMemberProfile(guest.id, false, guest.nickname)}
                          className="bg-[#1c1f26] border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex justify-between items-center cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">👤</span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                {guest.nickname}
                                <span className="text-[8px] bg-slate-800 text-[#8892b0] border border-slate-700 px-1.5 py-0.2 rounded font-sans">
                                  HUMAN
                                </span>
                              </div>
                              <span className="text-[9px] text-gray-500 mt-0.5 block leading-none">실시간 연동중인 학우</span>
                            </div>
                          </div>
                          <span className="text-[9px] border border-emerald-950 text-emerald-400 bg-emerald-950/20 px-2 py-0.8 rounded font-black font-mono">
                            READY
                          </span>
                        </div>
                      ))}

                    {/* 3. Simulated AI/Virtual Bots connected cards */}
                    {aiParticipants.map((bot, idx) => (
                      <div
                        key={`bot_${idx}`}
                        onClick={() => viewMemberProfile(`mock_bot_${idx}`, true, bot.name)}
                        className="bg-[#1c1f26] border border-slate-800 hover:border-slate-705 rounded-xl p-3 flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{bot.avatar}</span>
                          <div>
                            <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                              {bot.name}
                              <span className="text-[8px] bg-slate-850 text-gray-400 px-1 rounded">BOT</span>
                            </div>
                            <span className="text-[9px] text-gray-500 mt-0.5 block leading-none">동작 배리언트 탑재</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {bot.ready ? (
                            <span className="text-[9px] border border-emerald-900 text-emerald-400 bg-emerald-950/20 px-2 py-0.8 rounded font-bold font-mono">
                              READY
                            </span>
                          ) : (
                            <span className="text-[9px] border border-slate-800 text-gray-500 bg-slate-900/20 px-2 py-0.8 rounded font-mono animate-pulse">
                              JOINING..
                            </span>
                          )}

                          {isLeader && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // Avoid opening profile popup when clicking kick
                                setAiParticipants((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-[9px] bg-red-950/50 hover:bg-red-950 text-red-400 px-1.5 py-0.8 rounded border border-red-900/30 transition-all font-bold"
                            >
                              KICK
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                  </div>
                </div>

                <div className="border-t border-slate-850 pt-3 mt-4 text-center">
                  <p className="text-[9px] text-[#8892b0] leading-normal font-medium">
                     💡 대기실 명단 내의 카드를 클릭하시면 해당 사용자의 **닉네임, 승률, 탈출 횟수, 체포 횟수, 대표 칭호**를 확인하고 즉시 **친구추가**를 의뢰할 수 있습니다!
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Target Member Profile detail card popup overlays */}
      {selectedProfileData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-6 select-none animate-fadeIn">
          <div className="max-w-sm w-full bg-[#15171d] border-2 border-[#2563eb]/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#2563eb]" />
            
            <div className="text-center mb-5">
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#2563eb] uppercase bg-blue-900/20 border border-blue-950 px-2 py-0.5 rounded-full inline-block">
                STUDENT COMBAT HISTORY
              </span>
              <div className="text-3xl mt-3">👤</div>
              <h2 className="text-xl font-black text-white mt-2 tracking-wide font-sans">{selectedProfileData.nickname}</h2>
              <span className="text-xs text-emerald-450 font-bold bg-[#1c1f26] border border-slate-800 px-3 py-1 rounded-full mt-1.5 inline-block">
                🎖️ {selectedProfileData.title || "초보 탈출러"}
              </span>
            </div>

            <div className="space-y-2.5 my-4 bg-[#0c0d10] border border-slate-850 rounded-2xl p-4 font-mono font-bold text-xs text-slate-300">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-gray-500 font-sans font-semibold">프로필 등급 레벨</span>
                <span className="text-blue-400">Level {selectedProfileData.level || 1}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-gray-500 font-sans font-semibold">전적 종합 승률</span>
                <span className="text-blue-400">
                  {selectedProfileData.games_played > 0
                    ? Math.round((selectedProfileData.wins / selectedProfileData.games_played) * 100)
                    : 0} % ({selectedProfileData.wins || 0}승 / {selectedProfileData.games_played || 0}경기)
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <span className="text-gray-500 font-sans font-semibold">정문 탈출 성공 회수</span>
                <span className="text-green-400 font-black">{selectedProfileData.escapes || 0} 회</span>
              </div>
              <div className="flex justify-between items-center pb-0">
                <span className="text-gray-500 font-sans font-semibold">학생 사설체포 회수</span>
                <span className="text-red-400 font-black">{selectedProfileData.arrests || 0} 회</span>
              </div>
            </div>

            {/* Friends linkage controls */}
            <div className="flex flex-col gap-2 mt-5">
              {selectedProfileData.isAI ? (
                <div className="text-center py-2 text-[10px] text-gray-550 italic font-medium bg-slate-900/20 border border-slate-850 rounded-xl">
                  이 참가자는 은장고 가상 AI 기동체입니다.
                </div>
              ) : selectedProfileData.username === currentUser.username ? (
                <div className="text-center py-2 text-[10px] text-blue-400 font-semibold bg-blue-950/20 border border-blue-900/30 rounded-xl">
                  자신의 게임 전적 요람입니다.
                </div>
              ) : selectedProfileData.isFriend ? (
                <div className="py-2.5 bg-green-950/20 border border-green-500/20 rounded-xl text-center text-xs text-green-400 font-black flex items-center justify-center gap-1.5">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>이 회원과 이미 오랜 친구입니다</span>
                </div>
              ) : (
                <button
                  onClick={() => handleAddFriend(selectedProfileData.username)}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <UserPlus className="w-4 h-4" />
                  이 학우 귀환 친구추가 신청하기
                </button>
              )}

              <button
                onClick={() => setSelectedProfileData(null)}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-gray-400 text-xs font-semibold rounded-xl mt-1 transition-all cursor-pointer"
              >
                닫 기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer Section */}
      <footer className="mt-8 flex flex-col md:flex-row justify-between items-center w-full text-[10px] text-gray-500 border-t border-slate-800 pt-4 max-w-7xl mx-auto z-10 relative">
        <div className="flex gap-6 mb-2 md:mb-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-gray-500 uppercase font-mono">Server Status: Online</span>
          </div>
          <span className="text-[#2563eb] font-bold">PLAYERS WATCHING: 1,480</span>
        </div>
        <div>
          &copy; 2026 NAVER WEBTOON / Weak Hero: School Escape Concept UI
        </div>
      </footer>
    </div>
  );
};
