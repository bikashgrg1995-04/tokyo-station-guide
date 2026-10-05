-- Station details for Tokyo Station Guide (about, facilities, top_picks, connections)
-- Run AFTER db/seed.sql. Safe to re-run (it only UPDATEs by slug).
-- connections: JSON [{"name","color"}]. NULL = popup falls back to other lines in the DB.
-- Facilities / connections are sample data: verify before publishing.

WITH d(slug, about, facilities, top_picks, connections) AS (VALUES

-- ===================== Yamanote Line =====================
('tokyo',
 'The main intercity rail terminal and the busiest station in Japan. Serves as a major hub for Shinkansen, JR lines, and Tokyo Metro. The Marunouchi side features the historic red-brick station building.',
 '["Coin Lockers","Ticket Office","7-Bank ATM","Wi-Fi"]',
 '["Imperial Palace","Ramen Street","Character Street"]',
 '[{"name":"Tokaido Shinkansen","color":"#1f8a5b"},{"name":"Narita Express (N''EX)"},{"name":"Chuo Line","color":"#f15a22"},{"name":"Keihin-Tohoku Line","color":"#00b2e5"},{"name":"Tokyo Metro Marunouchi Line","color":"#e60012"}]'),

('kanda',
 'A busy business district station with old izakaya alleys under the tracks and a strong student and office crowd.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Kanda Myojin Shrine","Yushima Seido","Izakaya Alleys"]',
 '[{"name":"Chuo Line","color":"#f15a22"},{"name":"Keihin-Tohoku Line","color":"#00b2e5"},{"name":"Tokyo Metro Ginza Line","color":"#ff9500"}]'),

('akihabara',
 'Famous for electronics, anime, manga, and maid cafes. The heart of Japan''s otaku culture and a good place to hunt for retro games.',
 '["Coin Lockers","Ticket Office","Wi-Fi","Elevators"]',
 '["Electric Town","Yodobashi Akiba","Mandarake"]',
 '[{"name":"Keihin-Tohoku Line","color":"#00b2e5"},{"name":"Chuo-Sobu Line","color":"#ffd400"},{"name":"Tokyo Metro Hibiya Line","color":"#b5b5ac"},{"name":"Tsukuba Express","color":"#1a3a8f"}]'),

('okachimachi',
 'Gateway to the Ameyoko market street, with jewelry wholesalers, street food, and cheap bargains.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Ameyoko Market","Jewelry District","Ueno Park"]',
 '[{"name":"Keihin-Tohoku Line","color":"#00b2e5"},{"name":"Tokyo Metro Hibiya Line","color":"#b5b5ac"},{"name":"Toei Oedo Line","color":"#b6007a"}]'),

('ueno',
 'A major northern terminal beside Ueno Park, home to museums, a zoo, and Shinkansen services to northern Japan.',
 '["Coin Lockers","Ticket Office","7-Bank ATM","Wi-Fi","Nursing Room"]',
 '["Ueno Park","Tokyo National Museum","Ueno Zoo","Ameyoko Market"]',
 '[{"name":"Tohoku Shinkansen","color":"#00a040"},{"name":"Joban Line","color":"#00b261"},{"name":"Tokyo Metro Ginza Line","color":"#ff9500"},{"name":"Tokyo Metro Hibiya Line","color":"#b5b5ac"},{"name":"Keisei Skyliner"}]'),

('uguisudani',
 'A small, quiet station on the east edge of Ueno Park, close to old temples and the National Museum area.',
 '["Ticket Office","Wi-Fi"]',
 '["Kaneiji Temple","Ueno Park","Tokyo National Museum"]',
 NULL),

('nippori',
 'A transfer point for Narita Airport trains and the gateway to the old-town Yanaka district and Nippori Textile Town.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Yanaka Ginza","Nippori Textile Town","Yanaka Cemetery"]',
 '[{"name":"Keihin-Tohoku Line","color":"#00b2e5"},{"name":"Joban Line","color":"#00b261"},{"name":"Keisei Skyliner"},{"name":"Nippori-Toneri Liner"}]'),

('nishi-nippori',
 'A quiet residential station on a hill with views over the tracks, near Yanaka and Dokanyama.',
 '["Ticket Office","Wi-Fi"]',
 '["Dokanyama Park","Suwa Shrine","Yanaka Ginza"]',
 '[{"name":"Tokyo Metro Chiyoda Line","color":"#00bb85"},{"name":"Nippori-Toneri Liner"}]'),

('tabata',
 'A calm neighborhood station once home to many writers and artists, with a small literary museum nearby.',
 '["Ticket Office","Wi-Fi"]',
 '["Tabata Bunshimura Memorial Hall","Local Shopping Street"]',
 '[{"name":"Keihin-Tohoku Line","color":"#00b2e5"}]'),

('komagome',
 'Known for the beautiful Rikugien Garden and its seasonal foliage and cherry blossoms.',
 '["Ticket Office","Wi-Fi"]',
 '["Rikugien Garden","Kyu-Furukawa Gardens","Somei Yoshino Cherry Trees"]',
 '[{"name":"Tokyo Metro Namboku Line","color":"#00ac9b"}]'),

('sugamo',
 'Nicknamed the Harajuku for grandmas, with the Jizo-dori shopping street full of traditional shops and snacks.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Jizo-dori Shopping Street","Koganji Temple","Rikugien Garden"]',
 '[{"name":"Toei Mita Line","color":"#0079c2"}]'),

('otsuka',
 'A relaxed local station where the Toden Arakawa tram line begins its trip through old Tokyo.',
 '["Ticket Office","Wi-Fi"]',
 '["Toden Arakawa Tram","Local Izakaya Alleys"]',
 '[{"name":"Toden Arakawa Line"}]'),

('ikebukuro',
 'One of the busiest stations in the world and a major hub for shopping and entertainment in north-west Tokyo.',
 '["Coin Lockers","Ticket Office","7-Bank ATM","Wi-Fi","Department Stores"]',
 '["Sunshine City","Sunshine Aquarium","Otome Road"]',
 '[{"name":"Saikyo Line","color":"#00ac9a"},{"name":"Shonan-Shinjuku Line","color":"#e21f26"},{"name":"Tokyo Metro Marunouchi Line","color":"#e60012"},{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"},{"name":"Tokyo Metro Fukutoshin Line","color":"#9c5e31"},{"name":"Seibu Ikebukuro Line"},{"name":"Tobu Tojo Line"}]'),

('mejiro',
 'A quiet, leafy residential area around Gakushuin University and the Chinzanso garden.',
 '["Ticket Office","Wi-Fi"]',
 '["Chinzanso Garden","Mejiro Garden","Gakushuin University"]',
 NULL),

('takadanobaba',
 'A lively student town beside Waseda University, famous for cheap eats, ramen, and an Astro Boy departure melody.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Waseda University","Student Ramen Alleys","Astro Boy Melody"]',
 '[{"name":"Seibu Shinjuku Line","color":"#00a0e9"},{"name":"Tokyo Metro Tozai Line","color":"#009bbf"}]'),

('shin-okubo',
 'The center of Tokyo''s Korea Town, packed with Korean BBQ, street food, cafes, and K-pop shops.',
 '["Ticket Office","Wi-Fi"]',
 '["Korea Town","Korean BBQ","K-Pop Shops"]',
 '[{"name":"Chuo-Sobu Line","color":"#ffd400"}]'),

('shinjuku',
 'The busiest railway station in the world, linking JR, Metro, and private railways, with skyscrapers on the west side and Kabukicho on the east.',
 '["Coin Lockers","Ticket Office","7-Bank ATM","Wi-Fi","Department Stores","Nursing Room"]',
 '["Tokyo Metropolitan Government Building","Shinjuku Gyoen","Kabukicho","Omoide Yokocho"]',
 '[{"name":"Chuo Line","color":"#f15a22"},{"name":"Saikyo Line","color":"#00ac9a"},{"name":"Odakyu Line","color":"#1b83e6"},{"name":"Keio Line","color":"#dd0077"},{"name":"Tokyo Metro Marunouchi Line","color":"#e60012"},{"name":"Toei Oedo Line","color":"#b6007a"},{"name":"Narita Express (N''EX)"}]'),

('yoyogi',
 'A quiet station beside the Docomo Tower and a short walk to Yoyogi Park.',
 '["Ticket Office","Wi-Fi"]',
 '["Yoyogi Park","Docomo Tower","Yoyogi Hachiman Shrine"]',
 '[{"name":"Toei Oedo Line","color":"#b6007a"},{"name":"Chuo-Sobu Line","color":"#ffd400"}]'),

('harajuku',
 'The home of Japanese youth fashion, right beside Meiji Shrine and the Takeshita Street crowds.',
 '["Ticket Office","Wi-Fi","Restrooms"]',
 '["Takeshita Street","Meiji Shrine","Omotesando"]',
 NULL),

('shibuya',
 'A major youth culture hub known for the scramble crossing, huge fashion buildings, and busy night life.',
 '["Coin Lockers","Ticket Office","7-Bank ATM","Wi-Fi","Department Stores"]',
 '["Shibuya Crossing","Hachiko Statue","Shibuya Sky","Miyashita Park"]',
 '[{"name":"Tokyo Metro Ginza Line","color":"#ff9500"},{"name":"Tokyo Metro Hanzomon Line","color":"#8f76d6"},{"name":"Tokyo Metro Fukutoshin Line","color":"#9c5e31"},{"name":"Tokyu Toyoko Line","color":"#da0442"},{"name":"Tokyu Den-en-toshi Line","color":"#00a040"},{"name":"Saikyo Line","color":"#00ac9a"}]'),

('ebisu',
 'A stylish dining area known for izakaya, craft beer, and the Yebisu Garden Place complex.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Yebisu Garden Place","Museum of Photography","Ebisu Yokocho"]',
 '[{"name":"Tokyo Metro Hibiya Line","color":"#b5b5ac"},{"name":"Saikyo Line","color":"#00ac9a"},{"name":"Shonan-Shinjuku Line","color":"#e21f26"}]'),

('meguro',
 'A residential, relaxed station near the Meguro River, famous for cherry blossoms in spring.',
 '["Ticket Office","Wi-Fi"]',
 '["Meguro River Cherry Blossoms","Meguro Parasitological Museum","Teien Art Museum"]',
 '[{"name":"Tokyo Metro Namboku Line","color":"#00ac9b"},{"name":"Toei Mita Line","color":"#0079c2"},{"name":"Tokyu Meguro Line","color":"#009cd2"}]'),

('gotanda',
 'A busy business and nightlife station with a direct Toei line to the airports.',
 '["Ticket Office","Wi-Fi"]',
 '["Gotanda Izakaya District","Meguro River","Sengakuji Temple"]',
 '[{"name":"Toei Asakusa Line","color":"#e85298"},{"name":"Tokyu Ikegami Line"}]'),

('osaki',
 'A modern business district station with office towers, ThinkPark, and a connection to the Rinkai Line.',
 '["Ticket Office","Wi-Fi","Elevators"]',
 '["ThinkPark","Osaki Garden","Gate City Osaki"]',
 '[{"name":"Saikyo Line","color":"#00ac9a"},{"name":"Shonan-Shinjuku Line","color":"#e21f26"},{"name":"Rinkai Line","color":"#00418e"}]'),

('shinagawa',
 'A major Shinkansen and airport gateway station, with trains to Haneda and western Japan.',
 '["Coin Lockers","Ticket Office","7-Bank ATM","Wi-Fi","Nursing Room"]',
 '["Shinagawa Aqua Stadium","Sengakuji Temple","Takanawa Gateway City"]',
 '[{"name":"Tokaido Shinkansen","color":"#1f8a5b"},{"name":"Tokaido Line","color":"#f68b1e"},{"name":"Yokosuka Line","color":"#1069b4"},{"name":"Keikyu Main Line","color":"#e8334a"},{"name":"Narita Express (N''EX)"}]'),

('takanawa-gateway',
 'Tokyo''s newest Yamanote Line station, opened in 2020 with a modern design by architect Kengo Kuma.',
 '["Ticket Office","Wi-Fi","Elevators"]',
 '["Station Architecture by Kengo Kuma","Takanawa Gateway City","Sengakuji Temple"]',
 NULL),

('tamachi',
 'A business station near Keio University Mita Campus and the Shibaura waterfront.',
 '["Ticket Office","Wi-Fi"]',
 '["Shibaura Canal Walk","Keio University Mita Campus"]',
 '[{"name":"Keihin-Tohoku Line","color":"#00b2e5"}]'),

('hamamatsucho',
 'The starting point of the Tokyo Monorail to Haneda Airport, close to Hamarikyu Gardens and Zojoji Temple.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Hamarikyu Gardens","World Trade Center Observatory","Zojoji Temple"]',
 '[{"name":"Tokyo Monorail"},{"name":"Keihin-Tohoku Line","color":"#00b2e5"}]'),

('shimbashi',
 'A classic salaryman district with izakaya under the tracks and a gateway to the Shiodome skyscrapers.',
 '["Coin Lockers","Ticket Office","Wi-Fi"]',
 '["Shiodome City Center","Karasumori Shrine","Izakaya Under the Tracks"]',
 '[{"name":"Tokyo Metro Ginza Line","color":"#ff9500"},{"name":"Toei Asakusa Line","color":"#e85298"},{"name":"Yurikamome"},{"name":"Tokaido Line","color":"#f68b1e"}]'),

('yurakucho',
 'A downtown station near the Imperial Palace, with the Tokyo International Forum and yakitori alleys beneath the tracks.',
 '["Ticket Office","Wi-Fi"]',
 '["Tokyo International Forum","Hibiya Park","Imperial Hotel"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"},{"name":"Tokyo Metro Hibiya Line","color":"#b5b5ac"}]'),

-- ===================== Ginza Line =====================
('ginza',
 'Tokyo''s premier shopping district with luxury brands, department stores, and the Kabuki-za Theatre.',
 '["Ticket Office","Wi-Fi","Elevators"]',
 '["Ginza Six","Kabuki-za Theatre","Wako Clock Tower"]',
 '[{"name":"Tokyo Metro Marunouchi Line","color":"#e60012"},{"name":"Tokyo Metro Hibiya Line","color":"#b5b5ac"}]'),

('asakusa',
 'The old town of Tokyo, home to Senso-ji Temple and the Nakamise shopping street.',
 '["Coin Lockers","Ticket Office","Wi-Fi","Tourist Information"]',
 '["Senso-ji Temple","Nakamise-dori","Tokyo Skytree View"]',
 '[{"name":"Toei Asakusa Line","color":"#e85298"},{"name":"Tobu Skytree Line"},{"name":"Tsukuba Express","color":"#1a3a8f"}]'),

-- ===================== Fukutoshin Line =====================
('wakoshi',
 'The north-west terminus of the Fukutoshin and Yurakucho lines, where Tokyo Metro meets the Tobu Tojo Line.',
 '["Ticket Office","Wi-Fi"]',
 '["Local Shopping Streets","Tobu Tojo Line Access"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"},{"name":"Tobu Tojo Line"}]'),

('chikatetsu-narimasu',
 'A suburban neighborhood station with shopping streets and good through-service to central Tokyo.',
 '["Ticket Office"]',
 '["Local Shopping Street"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"}]'),

('chikatetsu-akatsuka',
 'A quiet suburban station in Itabashi, with residential streets and small parks.',
 '["Ticket Office"]',
 '["Local Parks"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"}]'),

('heiwadai',
 'A residential station in Nerima, near local parks and neighborhood markets.',
 '["Ticket Office"]',
 '["Local Parks","Neighborhood Markets"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"}]'),

('hikawadai',
 'A calm Nerima neighborhood station, mostly residential with small local shops.',
 '["Ticket Office"]',
 '["Local Shops"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"}]'),

('kotake-mukaihara',
 'A junction station where the Fukutoshin and Yurakucho lines share track with the Seibu Yurakucho Line.',
 '["Ticket Office","Wi-Fi"]',
 '["Local Shopping Street"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"},{"name":"Seibu Yurakucho Line"}]'),

('senkawa',
 'A residential station in Toshima with small shopping streets and simple access to Ikebukuro.',
 '["Ticket Office"]',
 '["Local Shopping Street"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"}]'),

('kanamecho',
 'A local station one stop before Ikebukuro, with quiet streets and neighborhood eateries.',
 '["Ticket Office"]',
 '["Local Eateries"]',
 '[{"name":"Tokyo Metro Yurakucho Line","color":"#c1a470"}]'),

('zoshigaya',
 'A quiet old-Tokyo neighborhood with Kishimojin Temple and the Toden Arakawa tram.',
 '["Ticket Office","Wi-Fi"]',
 '["Kishimojin Temple","Toden Arakawa Tram","Zoshigaya Cemetery"]',
 '[{"name":"Toden Arakawa Line"}]'),

('nishi-waseda',
 'A student-friendly station on the edge of Waseda University and Toyama Park.',
 '["Ticket Office","Wi-Fi"]',
 '["Waseda University","Toyama Park"]',
 NULL),

('higashi-shinjuku',
 'A modern station on the east side of Shinjuku with connections to the Oedo and Fukutoshin lines.',
 '["Ticket Office","Wi-Fi"]',
 '["Okubo Park","Korea Town"]',
 '[{"name":"Toei Oedo Line","color":"#b6007a"}]'),

('shinjuku-sanchome',
 'A central Shinjuku station surrounded by department stores, bars, and the Golden Gai area.',
 '["Ticket Office","Wi-Fi","Department Stores"]',
 '["Isetan Department Store","Golden Gai","Shinjuku Gyoen"]',
 '[{"name":"Tokyo Metro Marunouchi Line","color":"#e60012"},{"name":"Toei Shinjuku Line","color":"#6cbb5a"}]'),

('kita-sando',
 'A calm station close to Yoyogi Park and the Meiji Shrine area.',
 '["Ticket Office","Wi-Fi"]',
 '["Yoyogi Park","Meiji Shrine"]',
 NULL),

('meiji-jingumae',
 'The station for Harajuku and Omotesando, close to Takeshita Street and Meiji Shrine.',
 '["Ticket Office","Wi-Fi","Elevators"]',
 '["Takeshita Street","Meiji Shrine","Omotesando Hills"]',
 '[{"name":"Tokyo Metro Chiyoda Line","color":"#00bb85"}]'),

-- ===================== Keikyu Main Line =====================
('keikyu-kamata',
 'A transfer station for the Keikyu Airport Line, with a lively shopping area and local eateries.',
 '["Ticket Office","Wi-Fi"]',
 '["Kamata Shopping Street","Gyoza Restaurants"]',
 '[{"name":"Keikyu Airport Line","color":"#e8334a"}]'),

('tenkubashi',
 'A small station by the Tama River, close to Haneda Airport Garden and its onsen.',
 '["Ticket Office","Wi-Fi"]',
 '["Haneda Airport Garden","Tama River Walk"]',
 '[{"name":"Keikyu Airport Line","color":"#e8334a"}]'),

('haneda-airport-t3',
 'The Keikyu station for Haneda Airport International Terminal, with direct trains to central Tokyo.',
 '["Coin Lockers","Ticket Office","Wi-Fi","Currency Exchange"]',
 '["Edo Market Place","Observation Deck","Airport Shops"]',
 '[{"name":"Tokyo Monorail"}]'),

('haneda-airport-t1-t2',
 'The Keikyu station for Haneda Airport Domestic Terminals 1 and 2.',
 '["Coin Lockers","Ticket Office","Wi-Fi","Currency Exchange"]',
 '["Observation Deck","Airport Shops","Airport Restaurants"]',
 '[{"name":"Tokyo Monorail"}]')
)
UPDATE stations
SET about = d.about,
    facilities = d.facilities,
    top_picks = d.top_picks,
    connections = d.connections,
    updated_at = CURRENT_TIMESTAMP
FROM d
WHERE stations.slug = d.slug;