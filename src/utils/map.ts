/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 16x16 학교 맵 그리드 정의
// 0: 복도/빈공간, 1: 외벽(해체불가), 2: 내벽, 3: 정문(탈출지점, 봉쇄상태였다가 가동시 개방), 4: 생활지도실(체포자 감금룸), 5: 잠긴 문
export const MAP_WIDTH = 16;
export const MAP_HEIGHT = 16;
export const TILE_SIZE = 64; // 가상의 타일 크기 (충돌 및 레이캐스팅용)

export const SCHOOL_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], // (1,1) 생활지도실 내부
  [1, 4, 4, 1, 0, 2, 2, 2, 2, 2, 2, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 0, 2, 0, 0, 0, 0, 2, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 2, 2, 2, 5, 2, 2, 0, 1, 1, 0, 1], // (8,5)에 보라색 교실 문 예정(5)
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 5, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 5, 0, 1], // (2,7) 빨간문, (13,7) 파란문
  [1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 5, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 5, 0, 1], // (2,11) 노란문, (13,11) 초록문
  [1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1], // (8,15) 하단 정문
];

// 각 교실 명칭 및 색상 매핑
export const CLASSROOMS = [
  { id: "class_red", name: "1학년 1반(빨강)", color: "RED", doorX: 2, doorY: 7, buttonX: 2, buttonY: 6, keyX: 14, keyY: 13 },
  { id: "class_blue", name: "1학년 2반(파랑)", color: "BLUE", doorX: 13, doorY: 7, buttonX: 13, buttonY: 6, keyX: 1, keyY: 6 },
  { id: "class_yellow", name: "과학실(노랑)", color: "YELLOW", doorX: 2, doorY: 11, buttonX: 2, buttonY: 12, keyX: 10, keyY: 3 },
  { id: "class_green", name: "보건실(초록)", color: "GREEN", doorX: 13, doorY: 11, buttonX: 13, buttonY: 12, keyX: 5, keyY: 13 },
  { id: "class_purple", name: "미술실(보라)", color: "PURPLE", doorX: 8, doorY: 5, buttonX: 8, buttonY: 3, keyX: 14, keyY: 2 }
];

export interface RayResult {
  distance: number;
  wallType: number;
  wallX: number; // 벽에서의 텍스처 오프셋 0~1
  side: boolean; // true면 Y축 방향 벽, false면 X축 방향 벽 (음영 표현용)
  colorFlag?: string; // 특정 교실 문 구별용 색상
}

export function castRay(
  playerX: number,
  playerY: number,
  rayAngle: number,
  lockedDoors: { [key: string]: boolean },
  gateUnlocked: boolean
): RayResult {
  // 레이 각도 노말라이즈 (-PI ~ PI)
  rayAngle = Math.atan2(Math.sin(rayAngle), Math.cos(rayAngle));

  // DDA (Digital Differential Analysis) 알고리즘
  let mapX = Math.floor(playerX);
  let mapY = Math.floor(playerY);

  let sideDistX = 0;
  let sideDistY = 0;

  const deltaDistX = Math.abs(1 / Math.cos(rayAngle));
  const deltaDistY = Math.abs(1 / Math.sin(rayAngle));
  let perpWallDist = 0;

  let stepX = 0;
  let stepY = 0;

  let hit = false;
  let side = false; // X축 벽, Y축 벽 구분

  if (Math.cos(rayAngle) < 0) {
    stepX = -1;
    sideDistX = (playerX - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1.0 - playerX) * deltaDistX;
  }

  if (Math.sin(rayAngle) < 0) {
    stepY = -1;
    sideDistY = (playerY - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1.0 - playerY) * deltaDistY;
  }

  let wallType = 0;
  let maxSteps = 40; // 최대 레이캐스팅 거리 경계
  let hitColor: string | undefined = undefined;

  while (!hit && maxSteps > 0) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = false;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = true;
    }

    maxSteps--;

    // 맵 경계 체크
    if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
      break;
    }

    const cell = SCHOOL_MAP[mapY][mapX];

    if (cell > 0) {
      // 특수 벽(문 등) 판단
      if (cell === 5) {
        // 자물쇠 있는 교실 문인지 체크
        const matchedClassroom = CLASSROOMS.find(
          (c) => c.doorX === mapX && c.doorY === mapY
        );
        if (matchedClassroom) {
          const isDoorLocked = lockedDoors[matchedClassroom.color];
          if (isDoorLocked) {
            hit = true;
            wallType = 5; // 잠긴 문 벽
            hitColor = matchedClassroom.color;
          }
        }
      } else if (cell === 3) {
        // 정문
        if (!gateUnlocked) {
          hit = true;
          wallType = 3; // 잠긴 정문
        }
      } else {
        hit = true;
        wallType = cell;
      }
    }
  }

  if (side) {
    perpWallDist = (mapY - playerY + (1 - stepY) / 2) / Math.sin(rayAngle);
  } else {
    perpWallDist = (mapX - playerX + (1 - stepX) / 2) / Math.cos(rayAngle);
  }

  // 벽 충돌 정확한 X 가로좌표 (자물쇠나 문 텍스처 맵핑용)
  let wallXValue = 0;
  if (!side) {
    wallXValue = playerY + perpWallDist * Math.sin(rayAngle);
  } else {
    wallXValue = playerX + perpWallDist * Math.cos(rayAngle);
  }
  wallXValue -= Math.floor(wallXValue);

  return {
    distance: Math.max(0.1, perpWallDist),
    wallType,
    wallX: wallXValue,
    side,
    colorFlag: hitColor
  };
}

// 충돌 감지 (W/S/A/D 이동 시 플레이어 벽 뚫기 방지 및 부드러운 벽 미끄러짐 구현)
export function checkCollision(
  p1: number,
  p2: number,
  p3: any,
  p4: any,
  p5?: any,
  p6?: boolean
): { x: number; y: number; collided: boolean } {
  let oldX: number;
  let oldY: number;
  let newX: number;
  let newY: number;
  let lockedDoors: { [key: string]: boolean };
  let gateUnlocked: boolean;
  const is6Args = typeof p5 !== "undefined";

  if (is6Args) {
    oldX = p1;
    oldY = p2;
    newX = p3;
    newY = p4;
    lockedDoors = p5 || {};
    gateUnlocked = !!p6;
  } else {
    // Legacy 4-parameter call: checkCollision(newX, newY, lockedDoors, gateUnlocked)
    oldX = p1;
    oldY = p2;
    newX = p1;
    newY = p2;
    lockedDoors = p3 || {};
    gateUnlocked = !!p4;
  }

  // 여유 마진 (플레이어 캐릭터의 물리 반경)
  const margin = 0.22;

  const isBlocked = (x: number, y: number): boolean => {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
      return true;
    }

    const cell = SCHOOL_MAP[gridY][gridX];
    if (cell > 0) {
      if (cell === 5) {
        // 문 잠금 체크
        const cls = CLASSROOMS.find((c) => c.doorX === gridX && c.doorY === gridY);
        if (cls && lockedDoors[cls.color]) {
          return true;
        }
      } else if (cell === 3) {
        // 정문봉쇄 체크
        if (!gateUnlocked) {
          return true;
        }
      } else {
        return true;
      }
    }
    return false;
  };

  const checkPointBlocked = (px: number, py: number): boolean => {
    return (
      isBlocked(px - margin, py - margin) ||
      isBlocked(px + margin, py - margin) ||
      isBlocked(px - margin, py + margin) ||
      isBlocked(px + margin, py + margin)
    );
  };

  if (!is6Args) {
    // 레거시 스냅핑 복귀 모드 (AI 넉백/추적용)
    const collided = checkPointBlocked(newX, newY);
    if (collided) {
      return { x: Math.floor(newX) + 0.5, y: Math.floor(newY) + 0.5, collided: true };
    }
    return { x: newX, y: newY, collided: false };
  }

  // 6선 신규 슬라이딩 알고리즘
  let finalX = oldX;
  let finalY = oldY;
  let collided = false;

  // 1. X축 단독 가상 이동 시뮬레이션
  if (!checkPointBlocked(newX, oldY)) {
    finalX = newX;
  } else {
    collided = true;
  }

  // 2. Y축 단독 가상 이동 시뮬레이션
  if (!checkPointBlocked(finalX, newY)) {
    finalY = newY;
  } else {
    collided = true;
  }

  return { x: finalX, y: finalY, collided };
}

// 두 지점 간의 거리 계산
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * 두 지점(x1, y1)과 (x2, y2) 사이에 벽이나 닫힌 문 등 충돌 장애물이 가로막고 있는지 실시간 검출합니다.
 * 이를 통해 벽 너머에 놓인 열쇠를 불법으로 획집하거나 자물쇠를 벽 뒤에서 여는 등의 버그를 원천 물리 무효화합니다.
 */
export function hasWallBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lockedDoors: { [key: string]: boolean } = {},
  gateUnlocked: boolean = false
): boolean {
  const dist = getDistance(x1, y1, x2, y2);
  if (dist < 0.1) return false;

  // 두 타겟 사이를 이은 선상에서 아주 촘촘하게 0.08 칸씩 전진 샘플링 검문 수행
  const steps = Math.ceil(dist / 0.08);
  const dx = (x2 - x1) / steps;
  const dy = (y2 - y1) / steps;

  const isWallTile = (x: number, y: number): boolean => {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
      return true;
    }

    const cell = SCHOOL_MAP[gridY][gridX];
    if (cell > 0) {
      if (cell === 5) {
        // 교실 잠긴 문
        const cls = CLASSROOMS.find((c) => c.doorX === gridX && c.doorY === gridY);
        if (cls && lockedDoors[cls.color]) {
          return true;
        }
      } else if (cell === 3) {
        // 봉쇄된 정문
        if (!gateUnlocked) {
          return true;
        }
      } else {
        return true; // 기타 내외벽 등 단단한 구조물 전체
      }
    }
    return false;
  };

  // 플레이어 자신 위치 바로 근처 및 목적지 바로 근처는 소폭 여유 마진 적용
  for (let i = 2; i < steps - 1; i++) {
    const cx = x1 + dx * i;
    const cy = y1 + dy * i;
    if (isWallTile(cx, cy)) {
      return true; // 선상에 격자 장애물이 하나라도 전치함!
    }
  }

  return false;
}
