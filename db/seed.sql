-- Test data for Tokyo Station Guide (Cloudflare D1 / SQLite)
-- Tables: operators, lines, stations, line_stations
-- Run ONCE on empty tables (it does not check for duplicates).

INSERT INTO operators (name, slug, description, website_url) VALUES
  ('JR East',     'jr-east',     'East Japan Railway Company', 'https://www.jreast.co.jp/e/'),
  ('Tokyo Metro', 'tokyo-metro', 'Tokyo subway operator',      'https://www.tokyometro.jp/en/');

INSERT INTO lines (operator_id, name, slug, code, description, color)
VALUES
  ((SELECT id FROM operators WHERE slug = 'jr-east'),
   'Yamanote Line', 'yamanote-line', 'JY', 'Loop line around central Tokyo', '#9caf31'),
  ((SELECT id FROM operators WHERE slug = 'tokyo-metro'),
   'Ginza Line', 'ginza-line', 'G', 'Asakusa to Shibuya subway line', '#ff9500');

INSERT INTO stations (name, name_japanese, slug) VALUES
  ('Tokyo', '東京', 'tokyo'),
  ('Kanda', '神田', 'kanda'),
  ('Akihabara', '秋葉原', 'akihabara'),
  ('Okachimachi', '御徒町', 'okachimachi'),
  ('Ueno', '上野', 'ueno'),
  ('Uguisudani', '鶯谷', 'uguisudani'),
  ('Nippori', '日暮里', 'nippori'),
  ('Nishi-Nippori', '西日暮里', 'nishi-nippori'),
  ('Tabata', '田端', 'tabata'),
  ('Komagome', '駒込', 'komagome'),
  ('Sugamo', '巣鴨', 'sugamo'),
  ('Otsuka', '大塚', 'otsuka'),
  ('Ikebukuro', '池袋', 'ikebukuro'),
  ('Mejiro', '目白', 'mejiro'),
  ('Takadanobaba', '高田馬場', 'takadanobaba'),
  ('Shin-Okubo', '新大久保', 'shin-okubo'),
  ('Shinjuku', '新宿', 'shinjuku'),
  ('Yoyogi', '代々木', 'yoyogi'),
  ('Harajuku', '原宿', 'harajuku'),
  ('Shibuya', '渋谷', 'shibuya'),
  ('Ebisu', '恵比寿', 'ebisu'),
  ('Meguro', '目黒', 'meguro'),
  ('Gotanda', '五反田', 'gotanda'),
  ('Osaki', '大崎', 'osaki'),
  ('Shinagawa', '品川', 'shinagawa'),
  ('Takanawa Gateway', '高輪ゲートウェイ', 'takanawa-gateway'),
  ('Tamachi', '田町', 'tamachi'),
  ('Hamamatsucho', '浜松町', 'hamamatsucho'),
  ('Shimbashi', '新橋', 'shimbashi'),
  ('Yurakucho', '有楽町', 'yurakucho'),
  ('Ginza', '銀座', 'ginza'),
  ('Asakusa', '浅草', 'asakusa');

WITH m(slug, ord, code) AS (VALUES
    ('tokyo', 1, 'JY01'),
    ('kanda', 2, 'JY02'),
    ('akihabara', 3, 'JY03'),
    ('okachimachi', 4, 'JY04'),
    ('ueno', 5, 'JY05'),
    ('uguisudani', 6, 'JY06'),
    ('nippori', 7, 'JY07'),
    ('nishi-nippori', 8, 'JY08'),
    ('tabata', 9, 'JY09'),
    ('komagome', 10, 'JY10'),
    ('sugamo', 11, 'JY11'),
    ('otsuka', 12, 'JY12'),
    ('ikebukuro', 13, 'JY13'),
    ('mejiro', 14, 'JY14'),
    ('takadanobaba', 15, 'JY15'),
    ('shin-okubo', 16, 'JY16'),
    ('shinjuku', 17, 'JY17'),
    ('yoyogi', 18, 'JY18'),
    ('harajuku', 19, 'JY19'),
    ('shibuya', 20, 'JY20'),
    ('ebisu', 21, 'JY21'),
    ('meguro', 22, 'JY22'),
    ('gotanda', 23, 'JY23'),
    ('osaki', 24, 'JY24'),
    ('shinagawa', 25, 'JY25'),
    ('takanawa-gateway', 26, 'JY26'),
    ('tamachi', 27, 'JY27'),
    ('hamamatsucho', 28, 'JY28'),
    ('shimbashi', 29, 'JY29'),
    ('yurakucho', 30, 'JY30')
)
INSERT INTO line_stations (line_id, station_id, station_order, station_code)
SELECT l.id, s.id, m.ord, m.code
FROM m
JOIN stations s ON s.slug = m.slug
JOIN lines l ON l.slug = 'yamanote-line';

WITH m(slug, ord, code) AS (VALUES
    ('shibuya', 1, 'G01'),
    ('ginza', 2, 'G09'),
    ('ueno', 3, 'G16'),
    ('asakusa', 4, 'G19')
)
INSERT INTO line_stations (line_id, station_id, station_order, station_code)
SELECT l.id, s.id, m.ord, m.code
FROM m
JOIN stations s ON s.slug = m.slug
JOIN lines l ON l.slug = 'ginza-line';