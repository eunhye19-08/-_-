-- SPDX-License-Identifier: Apache-2.0
-- "약한영웅 학교탈출" 게임용 최신 데이터베이스 스키마 정의 (Supabase / PostgreSQL 호환)

-- 1. 사용자 프로필 테이블 생성 (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    username VARCHAR(100) PRIMARY KEY,
    password_hash VARCHAR(256) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    escapes INTEGER DEFAULT 0,
    arrests INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    title VARCHAR(150) DEFAULT '초보 탈출러',
    skin VARCHAR(100) DEFAULT '기본',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 생성 (순위 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON public.profiles (experience DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_wins ON public.profiles (wins DESC);

-- 2. 친구 관계 테이블 생성 (friends)
CREATE TABLE IF NOT EXISTS public.friends (
    id BIGSERIAL PRIMARY KEY,
    user_username VARCHAR(100) REFERENCES public.profiles(username) ON DELETE CASCADE,
    friend_username VARCHAR(100) REFERENCES public.profiles(username) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_username, friend_username)
);

-- 친구 검색 속도 향상을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_friends_lookup ON public.friends (user_username, friend_username);

-- Supabase RLS (Row Level Security) 설정 및 개방 정책 수립
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- 퍼블릭 가용 정책 (Client-side Direct update 수용)
CREATE POLICY "Allow public select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read friends" ON public.friends FOR SELECT USING (true);
CREATE POLICY "Allow public insert friends" ON public.friends FOR INSERT WITH CHECK (true);
