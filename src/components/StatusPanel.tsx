/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Player, KeyItem, LockDoor, GameEventLog } from "../types";
import { STUDENT_CHARACTERS, TEACHER_CHARACTERS } from "./MainLobby";
import { Clock, Shield, Key, CheckCircle, Flame, MessageSquare, Compass, Play } from "lucide-react";

interface StatusPanelProps {
  player: Player;
  players: Player[];
  keys: KeyItem[];
  doors: LockDoor[];
  eventLogs: GameEventLog[];
  timeLeft: number;
  gateOpenCountdown: number | null; // 정문오픈 후 60초 카운트다운
  onUseSkill: () => void;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  player,
  players,
  keys,
  doors,
  eventLogs,
  timeLeft,
  gateOpenCountdown,
  onUseSkill,
}) => {
  const isTeacher = player.team === "TEACHER";
  
  // 내 캐릭터 정보 검색
  const charInfo = isTeacher
    ? TEACHER_CHARACTERS[player.role as keyof typeof TEACHER_CHARACTERS]
    : STUDENT_CHARACTERS[player.role as keyof typeof STUDENT_CHARACTERS];

  const skillCooldown = player.cooldowns["MAIN"] || 0;

  // 전체 버튼 진행상황 계산
  const totalButtons = doors.length;
  const pressedButtons = doors.filter((d) => d.buttonPressed).length;
  const progressPercent = Math.min(100, Math.max(0, (pressedButtons / totalButtons) * 100));

  // 포맷 시간 도출 (예: 05:42)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      
      {/* 1. 좌측 (lg:col-span-6) : 내 소속 역할 정보 & 고유 능력 스킬창 */}
      <div className="lg:col-span-6 bg-[#15171d] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                isTeacher
                  ? "bg-red-950/40 border-red-900 text-red-400"
                  : "bg-blue-950/40 border-blue-900 text-blue-400"
              }`}>
                {isTeacher ? "태클 사냥단 (교사)" : "탈출 동맹 (학생)"}
              </span>
              <h3 className="text-xl font-black text-white mt-1.5 flex items-center gap-1.5 font-sans">
                <span className="text-2xl">{charInfo?.avatar}</span> 
                <span>{player.nickname}</span> 
                <span className="text-xs text-gray-500 font-mono">({player.role})</span>
              </h3>
            </div>
            {player.isCaptured && (
              <span className="text-[10px] bg-red-900 text-white font-mono font-bold px-2.5 py-1 rounded-md animate-pulse">
                CAPTURED
              </span>
            )}
            {player.hasEscaped && (
              <span className="text-[10px] bg-green-500 text-slate-950 font-bold px-2.5 py-1 rounded-md animate-bounce">
                ESCAPED
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-4 font-sans">
            {charInfo?.description}
          </p>

          <blockquote className="border-l-2 border-slate-700 pl-3 italic text-[11px] text-gray-500 mb-6 font-mono">
            &ldquo;{charInfo?.quote}&rdquo;
          </blockquote>
        </div>

        {/* 고유 스킬 활성 데크 */}
        {charInfo && (
          <div className="bg-[#1c1f26] border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2.5 border-b border-gray-800 pb-1.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">주요 능력 슬롯</span>
              {skillCooldown > 0 ? (
                <span className="text-xs text-red-400 font-mono font-bold animate-pulse">
                  RECHARGING {skillCooldown}S
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-950 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest text-[9px]">
                  Ready
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                id="skill-trigger-btn"
                disabled={skillCooldown > 0 || player.isCaptured || player.hasEscaped}
                onClick={onUseSkill}
                className={`w-14 h-14 rounded-xl flex flex-col justify-center items-center font-mono border transition-all duration-300 flex-shrink-0 relative overflow-hidden ${
                  skillCooldown > 0 || player.isCaptured || player.hasEscaped
                    ? "bg-[#15171d] border-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 border-blue-900 text-white hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.25)] active:scale-95 cursor-pointer"
                }`}
              >
                <span className="text-xl filter drop-shadow">{charInfo.avatar}</span>
                <span className="text-[8px] font-bold mt-0.5 font-sans">[단축 F]</span>
                
                {skillCooldown > 0 && charInfo.cooldown > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black/80 transition-all duration-1000"
                    style={{ height: `${(skillCooldown / charInfo.cooldown) * 100}%` }}
                  />
                )}
              </button>

              <div className="text-left">
                <p className="text-xs font-bold text-white flex items-center gap-1">
                  {charInfo.skillName}
                  <span className="text-[9px] text-gray-500 font-normal">
                    (쿨타임: {charInfo.cooldown > 0 ? `${charInfo.cooldown}초` : "항시작동/무제한"})
                  </span>
                </p>
                <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                  {charInfo.skillDescription}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. 우측 (lg:col-span-6) : 학교 제어 장치 및 정문 기동 현황 */}
      <div className="lg:col-span-6 bg-[#15171d] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2.5 mb-4">
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-4.5 bg-red-655 bg-red-600 inline-block rounded-sm"></span>
              학교 봉쇄 해제 상태
            </h3>
            <span className="text-xs font-mono font-bold text-red-500">
              기동률 {progressPercent}%
            </span>
          </div>

          {/* 제어 진행 게이지 */}
          <div className="w-full bg-[#0c0d10] rounded-full h-2 mb-5 overflow-hidden border border-gray-800">
            <div
              className="bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 5가지 자물쇠 가동 상세 리스트 */}
          <div className="space-y-2.5">
            {doors.map((d) => {
              // 해당 색깔 열쇠의 소유 상태 확인
              const matchedKey = keys.find((k) => k.color === d.color);
              const keyOwner = matchedKey?.isHeld
                ? players.find((p) => p.id === matchedKey.heldBy)?.nickname || "동료"
                : null;

              let labelColor = "text-red-400";
              switch (d.color) {
                case "RED": labelColor = "text-red-500"; break;
                case "BLUE": labelColor = "text-blue-500"; break;
                case "YELLOW": labelColor = "text-yellow-500"; break;
                case "GREEN": labelColor = "text-green-500"; break;
                case "PURPLE": labelColor = "text-purple-500"; break;
              }

              return (
                <div key={d.color} className="flex justify-between items-center bg-[#1c1f26] py-2 px-3 border border-gray-800/60 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🔑</span>
                    <div>
                      <span className={`text-[11px] font-bold ${labelColor}`}>
                        {d.classroomName}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* 열쇠 보유 여부 */}
                    {matchedKey?.isHeld ? (
                      <span className="text-[8px] bg-indigo-950 text-indigo-300 border border-indigo-900/60 px-1.5 py-0.5 rounded font-bold">
                        {keyOwner} 소지
                      </span>
                    ) : (
                      <span className="text-[8px] bg-[#0c0d10] text-gray-500 border border-gray-800 px-1.5 py-0.5 rounded">
                        미발견
                      </span>
                    )}

                    {/* 자물쇠 해제 여부 */}
                    {d.isLocked ? (
                      <span className="text-[8px] bg-red-950 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded font-bold">
                        자물쇠 잠김
                      </span>
                    ) : (
                      <span className="text-[8px] bg-blue-950 text-blue-400 border border-blue-900/40 px-1.5 py-0.5 rounded font-bold">
                        자물쇠 해제
                      </span>
                    )}

                    {/* 버튼 기동 여부 */}
                    {d.buttonPressed ? (
                      <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded font-bold animate-pulse">
                        가동됨
                      </span>
                    ) : (
                      <span className="text-[8px] bg-[#0c0d10] text-gray-500 border border-gray-800 px-1.5 py-0.5 rounded">
                        대기
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단: 정문 비상 카운트 배너 및 실시간 시간 단축 패널 */}
        <div className="mt-4 flex flex-col gap-3">
          {gateOpenCountdown !== null && (
            <div className="bg-red-950/60 border border-red-600 text-white rounded-xl p-3 text-center animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <p className="text-[10px] font-mono font-bold tracking-widest text-red-400 mb-0.5">
                🚨 정문 오픈 완료! 최종 탈출 데드라인
              </p>
              <p className="text-base font-mono font-extrabold text-white">
                {gateOpenCountdown}초 후 완전 폐장!
              </p>
            </div>
          )}

          <div className="bg-[#0c0d10] border border-gray-800/80 rounded-xl p-3 flex justify-between items-center shadow-inner">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-600 animate-pulse" />
              남은 탈출 시한포탄
            </span>
            <span className="text-xl font-mono font-black text-red-500 text-shadow-red animate-pulse">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
