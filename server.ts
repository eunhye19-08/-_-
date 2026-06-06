/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Gemini SDK 지연 초기화 및 안전한 키 탐색
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

// API: 학교탈출 상황별 캐릭터 대사 인공지능 생성
app.post("/api/gemini/dialogue", async (req, res) => {
  const { characterName, situation, team } = req.body;

  if (!characterName || !situation) {
    return res.status(400).json({ error: "characterName and situation are required." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // API 키가 없으면 그냥 더미가 아니라 즉시 정상 응답으로 안전한 기본 메시지 전송
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
