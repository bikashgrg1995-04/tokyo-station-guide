-- Test data for Tokyo Station Guide (Cloudflare D1 / SQLite)
-- Tables: operators, lines, stations, line_stations
-- Lines: Yamanote (loop), Ginza (4 stations -> straight), Fukutoshin (16 -> U shape), Keikyu (5 -> straight)
-- Safe to re-run: rows that already exist (same slug) are skipped.

INSERT OR IGNORE INTO operators (name, slug, description, website_url) VALUES
  ('JR East',     'jr-east',     'East Japan Railway Company', 'https://www.jreast.co.jp/e/'),
  ('Tokyo Metro', 'tokyo-metro', 'Tokyo subway operator',      'https://www.tokyometro.jp/en/');

INSERT OR IGNORE INTO lines (operator_id, name, slug, code, description, color)
VALUES
  ((SELECT id FROM operators WHERE slug = 'jr-east'),
   'Yamanote Line', 'yamanote-line', 'JY', 'Loop · Tokyo, Ueno, Ikebukuro, Shinjuku, Shibuya', '#9caf31'),
  ((SELECT id FROM operators WHERE slug = 'tokyo-metro'),
   'Ginza Line', 'ginza-line', 'G', 'Shibuya – Asakusa · via Ginza, Ueno', '#ff9500');

INSERT OR IGNORE INTO stations (name, name_japanese, slug) VALUES
('Tokyo', '東京', 'tokyo'),
('Kanda', '神田', 'kanda'),
('Akihabara', '秋葉原', 'akihabara'),
('Okachimachi', '御徒町', 'okachimachi'),
('Ueno', '上野', 'ueno'),
('Uguisudani', '鶯谷', 'uguisudani'),
('Nippori', '日暮里', 'nippori'),
('Nishi-nippori', '西日暮里', 'nishi-nippori'),
('Tabata', '田端', 'tabata'),
('Komagome', '駒込', 'komagome'),
('Sugamo', '巣鴨', 'sugamo'),
('Otsuka', '大塚', 'otsuka'),
('Ikebukuro', '池袋', 'ikebukuro'),
('Mejiro', '目白', 'mejiro'),
('Takadanobaba', '高田馬場', 'takadanobaba'),
('Shin-okubo', '新大久保', 'shin-okubo'),
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
('Asakusa', '浅草', 'asakusa'),
('Wakoshi', '和光市', 'wakoshi'),
('Chikatetsu-narimasu', '地下鉄成増', 'chikatetsu-narimasu'),
('Chikatetsu-akatsuka', '地下鉄赤塚', 'chikatetsu-akatsuka'),
('Heiwadai', '平和台', 'heiwadai'),
('Hikawadai', '氷川台', 'hikawadai'),
('Kotake-mukaihara', '小竹向原', 'kotake-mukaihara'),
('Senkawa', '千川', 'senkawa'),
('Kanamecho', '要町', 'kanamecho'),
('Zoshigaya', '雑司が谷', 'zoshigaya'),
('Nishi-waseda', '西早稲田', 'nishi-waseda'),
('Higashi-shinjuku', '東新宿', 'higashi-shinjuku'),
('Shinjuku-sanchome', '新宿三丁目', 'shinjuku-sanchome'),
('Kita-sando', '北参道', 'kita-sando'),
('Meiji-jingumae', '明治神宮前', 'meiji-jingumae'),
('Keikyu-Kamata', '京急蒲田', 'keikyu-kamata'),
('Tenkubashi', '天空橋', 'tenkubashi'),
('Haneda Airport T3', '羽田空港第3ターミナル', 'haneda-airport-t3'),
('Haneda Airport T1·T2', '羽田空港第1・第2ターミナル', 'haneda-airport-t1-t2');

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
JOIN lines l ON l.slug = 'yamanote-line'
WHERE NOT EXISTS (
  SELECT 1 FROM line_stations x
  WHERE x.line_id = l.id AND x.station_id = s.id
);

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
JOIN lines l ON l.slug = 'ginza-line'
WHERE NOT EXISTS (
  SELECT 1 FROM line_stations x
  WHERE x.line_id = l.id AND x.station_id = s.id
);

-- ---------- Fukutoshin (U shape) and Keikyu (straight) ----------
INSERT OR IGNORE INTO operators (name, slug, description, website_url) VALUES
  ('Keikyu', 'keikyu', 'Keikyu Corporation', 'https://www.keikyu.co.jp/');

INSERT OR IGNORE INTO lines (operator_id, name, slug, code, description, color)
VALUES
  ((SELECT id FROM operators WHERE slug = 'tokyo-metro'),
   'Fukutoshin Line', 'fukutoshin-line', 'F', 'Wakoshi – Shibuya · via Ikebukuro', '#9b5e31'),
  ((SELECT id FROM operators WHERE slug = 'keikyu'),
   'Keikyu Main Line', 'keikyu-main-line', 'KK', 'Shinagawa – Haneda Airport · 11 min', '#e8334a');

WITH m(slug, ord, code) AS (VALUES
    ('wakoshi', 1, 'F01'),
    ('chikatetsu-narimasu', 2, 'F02'),
    ('chikatetsu-akatsuka', 3, 'F03'),
    ('heiwadai', 4, 'F04'),
    ('hikawadai', 5, 'F05'),
    ('kotake-mukaihara', 6, 'F06'),
    ('senkawa', 7, 'F07'),
    ('kanamecho', 8, 'F08'),
    ('ikebukuro', 9, 'F09'),
    ('zoshigaya', 10, 'F10'),
    ('nishi-waseda', 11, 'F11'),
    ('higashi-shinjuku', 12, 'F12'),
    ('shinjuku-sanchome', 13, 'F13'),
    ('kita-sando', 14, 'F14'),
    ('meiji-jingumae', 15, 'F15'),
    ('shibuya', 16, 'F16')
)
INSERT INTO line_stations (line_id, station_id, station_order, station_code)
SELECT l.id, s.id, m.ord, m.code
FROM m
JOIN stations s ON s.slug = m.slug
JOIN lines l ON l.slug = 'fukutoshin-line'
WHERE NOT EXISTS (
  SELECT 1 FROM line_stations x
  WHERE x.line_id = l.id AND x.station_id = s.id
);

WITH m(slug, ord, code) AS (VALUES
    ('shinagawa', 1, 'KK01'),
    ('keikyu-kamata', 2, 'KK11'),
    ('tenkubashi', 3, 'KK15'),
    ('haneda-airport-t3', 4, 'KK16'),
    ('haneda-airport-t1-t2', 5, 'KK17')
)
INSERT INTO line_stations (line_id, station_id, station_order, station_code)
SELECT l.id, s.id, m.ord, m.code
FROM m
JOIN stations s ON s.slug = m.slug
JOIN lines l ON l.slug = 'keikyu-main-line'
WHERE NOT EXISTS (
  SELECT 1 FROM line_stations x
  WHERE x.line_id = l.id AND x.station_id = s.id
);

