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

// 충돌 감지 (W/S/A/D 이동 시 플레이어 벽 뚫기 방지)
export function checkCollision(
  newX: number,
  newY: number,
  lockedDoors: { [key: string]: boolean },
  gateUnlocked: boolean
): { x: number; y: number; collided: boolean } {
  // 여유 마진 (플레이어 크기)
  const margin = 0.22;
  const testPoints = [
    { x: newX - margin, y: newY - margin },
    { x: newX + margin, y: newY - margin },
    { x: newX - margin, y: newY + margin },
    { x: newX + margin, y: newY + margin },
  ];

  let collided = false;

  for (const pt of testPoints) {
    const gridX = Math.floor(pt.x);
    const gridY = Math.floor(pt.y);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
      collided = true;
      break;
    }

    const cell = SCHOOL_MAP[gridY][gridX];
    if (cell > 0) {
      if (cell === 5) {
        // 문 잠금 체크
        const cls = CLASSROOMS.find((c) => c.doorX === gridX && c.doorY === gridY);
        if (cls && lockedDoors[cls.color]) {
          collided = true;
          break;
        }
      } else if (cell === 3) {
        // 정문봉쇄 체크
        if (!gateUnlocked) {
          collided = true;
          break;
        }
      } else {
        collided = true;
        break;
      }
    }
  }

  if (collided) {
    return { x: Math.floor(newX) + 0.5, y: Math.floor(newY) + 0.5, collided: true }; 
  }

  return { x: newX, y: newY, collided: false };
}

// 두 지점 간의 거리 계산
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
