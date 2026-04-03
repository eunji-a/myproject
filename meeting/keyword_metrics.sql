-- ListeningMind 키워드 데이터 테이블
-- Supabase SQL Editor에서 실행

-- 테이블 생성
CREATE TABLE keyword_metrics (
  id              bigserial PRIMARY KEY,
  keyword         text        NOT NULL,
  gl              char(2)     NOT NULL,
  competition     text,
  competition_index integer,
  cpc             numeric(10,4),
  low_bid_micros  bigint,
  high_bid_micros bigint,
  volume_avg      integer,
  volume_total    integer,
  volume_trend    numeric(6,2),
  gg_volume_avg   integer,
  gg_volume_total integer,
  gg_volume_trend numeric(6,2),
  nv_volume_avg   integer,
  nv_volume_total integer,
  nv_volume_trend numeric(6,2),
  fetched_at      timestamptz DEFAULT now()
);

-- 테스트 데이터 삽입 (스마트폰 / kr)
INSERT INTO keyword_metrics (
  keyword, gl,
  competition, competition_index, cpc, low_bid_micros, high_bid_micros,
  volume_avg, volume_total, volume_trend,
  gg_volume_avg, gg_volume_total, gg_volume_trend,
  nv_volume_avg, nv_volume_total, nv_volume_trend
) VALUES (
  '스마트폰', 'kr',
  'MEDIUM', 58, 0.25, 116358, 611228,
  105510, 1239160, 1.84,
  96166, 1102500, 2.33,
  9343, 136660, -0.3
);
