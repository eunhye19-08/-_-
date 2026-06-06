/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameEventLog } from "../types";

// 게임 중 돌발 상황에 따른 캐릭터 대사 생성 요청
export async function fetchGeminiDialogue(
  characterName: string,
  situation: string,
  team: "STUDENT" | "TEACHER"
): Promise<string> {
  try {
    const response = await fetch("/api/gemini/dialogue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ characterName, situation, team }),
    });

    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }

    const data = await response.json();
    return data.dialogue;
  } catch (err) {
    console.warn("Gemini API 대사 요청 실패, 대체 풀 사용:", err);
    // 피드백을 위한 예비 로컬 대사 대입
    return getFallbackDialogue(characterName, situation);
  }
}

// 게임 결과 요약 스토리 작문 요청
export async function fetchGeminiStory(
  isStudentVictory: boolean,
  escapedStudents: string[],
  capturedStudents: string[],
  gameTimeElapsed: string
): Promise<string> {
  try {
    const response = await fetch("/api/gemini/story", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isStudentVictory,
        escapedStudents,
        capturedStudents,
        gameTimeElapsed,
      }),
    });

    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }

    const data = await response.json();
    return data.story;
  } catch (err) {
    console.warn("Gemini API 소설 연출 요청 실패, 대체 텍스트 생성:", err);
    return getFallbackStory(isStudentVictory, escapedStudents, capturedStudents);
  }
}

// 로컬 대체 대사 풀 (API 오프라인 시 대비)
function getFallbackDialogue(characterName: string, situation: string): string {
  const fallbacks: { [chat: string]: string[] } = {
    "연시은_기절": [
      "귀찮게 하지 마라. 한 번만 더 오면 그땐 볼펜 진짜 깊게 박는다.",
      "움직이지 마십시오. 제법 아플 겁니다.",
      "수업 시간에 딴짓 마세요. 지금 복도 청소 시간 아닙니다."
    ],
    "박후민_기절": [
      "어디서 어깨를 밀고 들어오십니까! 저리 비켜요!",
      "안수호랑 시은이 건드리는 교사는 내가 머리부터 농구 바스켓에 꽂아준다!",
      "한 발짝만 더 오면 골대에 꽂듯이 빠르고 묵직하게 농구공 슛 꽂는다!"
    ],
    "금성제_기절": [
      "야, 눈 똑바로 안 떠? 생활지도 교사면 뭐 다 되는 줄 아냐? 비켜!",
      "하... 복도를 이렇게 막고 서 있으면 다 빠따 한 대씩 맞자는 소린가?",
      "이 학교에서 날 막을 수 있는 인간은 없다. 기어오르지 마."
    ],
    "안수호_기절": [
      "아 시은아 조심해! 선생님, 애들 괴롭히지 마시고 저랑 얘기하시죠!",
      "내가 있는 한 무사히 도망치게 둔다. 얘들아 뒤돌아보지 말고 뛰어!",
      "다칠 텐데요. 힘 조절이 안 돼서 미안해요!"
    ],
    "교사 A_체포": [
      "복도에서 뛰지 말라고 했지! 당장 생활지도실로 따라와!",
      "네 녀석 발소리가 온 학교에 쩌렁쩌렁 울리더구나. 잡았다!",
      "야간 자율학습 도망치는 녀석들은 예외 없이 벌점이다!"
    ],
    "교사 B_체포": [
      "미니맵 좌표에 딱 걸렸다! 내 감시망을 벗어날 수 있을 줄 알았느냐!",
      "어디 구석에 쥐새끼처럼 숨어 있나 했더니 여깄군. 자, 교무실 가자!",
      "잔머리 굴려봤자 소용없다. 학생부장 손바닥 안이야."
    ],
    "교사 C_체포": [
      "문을 아무리 열어봤자 이미 락을 걸어뒀지. 가차없이 검거 완료!",
      "걸릴 수밖에 없는 미로였다. 얌전히 반성문이나 쓰러 가자!",
      "학교 탈출 꿈도 야무지군. 벌점 폭탄에 봉사활동 추가다."
    ]
  };

  const key = `${characterName}_${situation}`;
  const list = fallbacks[key] || [
    `${characterName}: 여기서 무너지지 않는다! 반드시 학교를 빠져나가겠어.`,
    `${characterName}: 조심해! 근처에 인기척이 느껴진다.`
  ];
  return list[Math.floor(Math.random() * list.length)];
}

function getFallbackStory(
  isStudentVictory: boolean,
  escaped: string[],
  captured: string[]
): string {
  if (isStudentVictory) {
    return `칠흑 같은 야간 자율학습 시간, 철옹성 같던 학교 정문이 학생들의 집요한 연동 버튼 조작 끝에 마침내 '우우웅-' 소리를 내며 흔들리며 열렸다. 탈출 제한 시간의 초침 소리 흘러가는 정적 속에서, 연시은을 필두로 한 학생들은 교사들의 발소리 추격망을 뚫고 한 걸음씩 차가운 새벽 복도를 뛰었다. ${escaped.join(", ")} 등 학생의 과반수가 탈출에 극적으로 성공하여, 밤이 지나고 해방의 아침을 맞았다.`;
  } else {
    return `교장실과 행정실의 차가운 통제 장치는 오작동하지 않았다. 학생부 교사들의 철통같은 락다운 작전과 예리한 감시망 아래, 생활지도실 창살은 무거웠다. ${captured.join(", ")} 등 미처 탈출하지 못한 낙오자들이 붙잡혀 반성문 작성과 벌점 폭탄의 아픔을 맛보고 말았다. 불이 꺼지지 않는 학교 야간 자율학습의 밤은 결코 끝나지 않았다...`;
  }
}
