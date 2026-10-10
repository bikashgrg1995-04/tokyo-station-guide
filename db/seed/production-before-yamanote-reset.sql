PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_schema.sql','2026-10-09 07:18:43');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_admin_users.sql','2026-10-09 07:18:43');
CREATE TABLE operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    website_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "operators" ("id","name","slug","description","website_url","created_at","updated_at") VALUES(1,'JR East','jr-east','East Japan Railway Company','https://www.jreast.co.jp/e/','2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "operators" ("id","name","slug","description","website_url","created_at","updated_at") VALUES(2,'Tokyo Metro','tokyo-metro','Tokyo subway operator','https://www.tokyometro.jp/en/','2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "operators" ("id","name","slug","description","website_url","created_at","updated_at") VALUES(3,'Keikyu','keikyu','Keikyu Corporation','https://www.keikyu.co.jp/','2026-10-09 09:39:57','2026-10-09 09:39:57');
CREATE TABLE lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    color TEXT,
    line_type TEXT NOT NULL DEFAULT 'subway'
        CHECK (line_type IN ('jr', 'subway', 'private', 'shinkansen', 'express')),
    show_on_map INTEGER NOT NULL DEFAULT 1
        CHECK (show_on_map IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (operator_id)
        REFERENCES operators(id)
        ON DELETE RESTRICT
);
INSERT INTO "lines" ("id","operator_id","name","slug","code","description","color","line_type","show_on_map","created_at","updated_at") VALUES(1,1,'Yamanote Line','yamanote-line','JY','Loop · Tokyo, Ueno, Ikebukuro, Shinjuku, Shibuya','#9caf31','subway',1,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "lines" ("id","operator_id","name","slug","code","description","color","line_type","show_on_map","created_at","updated_at") VALUES(2,2,'Ginza Line','ginza-line','G','Shibuya – Asakusa · via Ginza, Ueno','#ff9500','subway',1,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "lines" ("id","operator_id","name","slug","code","description","color","line_type","show_on_map","created_at","updated_at") VALUES(3,2,'Fukutoshin Line','fukutoshin-line','F','Wakoshi – Shibuya · via Ikebukuro','#9b5e31','subway',1,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "lines" ("id","operator_id","name","slug","code","description","color","line_type","show_on_map","created_at","updated_at") VALUES(4,3,'Keikyu Main Line','keikyu-main-line','KK','Shinagawa – Haneda Airport · 11 min','#e8334a','subway',1,'2026-10-09 09:39:57','2026-10-09 09:39:57');
CREATE TABLE stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_japanese TEXT,
    slug TEXT NOT NULL UNIQUE,
    latitude REAL,
    longitude REAL,
    description TEXT,
    about TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(1,'Tokyo','東京','tokyo',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(2,'Kanda','神田','kanda',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(3,'Akihabara','秋葉原','akihabara',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(4,'Okachimachi','御徒町','okachimachi',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(5,'Ueno','上野','ueno',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(6,'Uguisudani','鶯谷','uguisudani',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(7,'Nippori','日暮里','nippori',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(8,'Nishi-nippori','西日暮里','nishi-nippori',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(9,'Tabata','田端','tabata',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(10,'Komagome','駒込','komagome',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(11,'Sugamo','巣鴨','sugamo',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(12,'Otsuka','大塚','otsuka',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(13,'Ikebukuro','池袋','ikebukuro',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(14,'Mejiro','目白','mejiro',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(15,'Takadanobaba','高田馬場','takadanobaba',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(16,'Shin-okubo','新大久保','shin-okubo',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(17,'Shinjuku','新宿','shinjuku',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(18,'Yoyogi','代々木','yoyogi',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(19,'Harajuku','原宿','harajuku',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(20,'Shibuya','渋谷','shibuya',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(21,'Ebisu','恵比寿','ebisu',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(22,'Meguro','目黒','meguro',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(23,'Gotanda','五反田','gotanda',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(24,'Osaki','大崎','osaki',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(25,'Shinagawa','品川','shinagawa',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(26,'Takanawa Gateway','高輪ゲートウェイ','takanawa-gateway',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(27,'Tamachi','田町','tamachi',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(28,'Hamamatsucho','浜松町','hamamatsucho',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(29,'Shimbashi','新橋','shimbashi',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(30,'Yurakucho','有楽町','yurakucho',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(31,'Ginza','銀座','ginza',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(32,'Asakusa','浅草','asakusa',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(33,'Wakoshi','和光市','wakoshi',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(34,'Chikatetsu-narimasu','地下鉄成増','chikatetsu-narimasu',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(35,'Chikatetsu-akatsuka','地下鉄赤塚','chikatetsu-akatsuka',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(36,'Heiwadai','平和台','heiwadai',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(37,'Hikawadai','氷川台','hikawadai',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(38,'Kotake-mukaihara','小竹向原','kotake-mukaihara',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(39,'Senkawa','千川','senkawa',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(40,'Kanamecho','要町','kanamecho',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(41,'Zoshigaya','雑司が谷','zoshigaya',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(42,'Nishi-waseda','西早稲田','nishi-waseda',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(43,'Higashi-shinjuku','東新宿','higashi-shinjuku',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(44,'Shinjuku-sanchome','新宿三丁目','shinjuku-sanchome',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(45,'Kita-sando','北参道','kita-sando',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(46,'Meiji-jingumae','明治神宮前','meiji-jingumae',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(47,'Keikyu-Kamata','京急蒲田','keikyu-kamata',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(48,'Tenkubashi','天空橋','tenkubashi',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(49,'Haneda Airport T3','羽田空港第3ターミナル','haneda-airport-t3',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
INSERT INTO "stations" ("id","name","name_japanese","slug","latitude","longitude","description","about","created_at","updated_at") VALUES(50,'Haneda Airport T1·T2','羽田空港第1・第2ターミナル','haneda-airport-t1-t2',NULL,NULL,NULL,NULL,'2026-10-09 09:39:57','2026-10-09 09:39:57');
CREATE TABLE line_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    station_order INTEGER NOT NULL,
    station_code TEXT,

    FOREIGN KEY (line_id)
        REFERENCES lines(id)
        ON DELETE CASCADE,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    UNIQUE (line_id, station_id),
    UNIQUE (line_id, station_order)
);
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(1,1,1,1,'JY01');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(2,1,2,2,'JY02');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(3,1,3,3,'JY03');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(4,1,4,4,'JY04');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(5,1,5,5,'JY05');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(6,1,6,6,'JY06');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(7,1,7,7,'JY07');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(8,1,8,8,'JY08');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(9,1,9,9,'JY09');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(10,1,10,10,'JY10');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(11,1,11,11,'JY11');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(12,1,12,12,'JY12');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(13,1,13,13,'JY13');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(14,1,14,14,'JY14');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(15,1,15,15,'JY15');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(16,1,16,16,'JY16');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(17,1,17,17,'JY17');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(18,1,18,18,'JY18');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(19,1,19,19,'JY19');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(20,1,20,20,'JY20');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(21,1,21,21,'JY21');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(22,1,22,22,'JY22');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(23,1,23,23,'JY23');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(24,1,24,24,'JY24');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(25,1,25,25,'JY25');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(26,1,26,26,'JY26');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(27,1,27,27,'JY27');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(28,1,28,28,'JY28');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(29,1,29,29,'JY29');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(30,1,30,30,'JY30');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(31,2,20,1,'G01');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(32,2,31,2,'G09');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(33,2,5,3,'G16');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(34,2,32,4,'G19');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(35,3,33,1,'F01');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(36,3,34,2,'F02');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(37,3,35,3,'F03');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(38,3,36,4,'F04');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(39,3,37,5,'F05');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(40,3,38,6,'F06');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(41,3,39,7,'F07');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(42,3,40,8,'F08');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(43,3,13,9,'F09');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(44,3,41,10,'F10');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(45,3,42,11,'F11');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(46,3,43,12,'F12');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(47,3,44,13,'F13');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(48,3,45,14,'F14');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(49,3,46,15,'F15');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(50,3,20,16,'F16');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(51,4,25,1,'KK01');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(52,4,47,2,'KK11');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(53,4,48,3,'KK15');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(54,4,49,4,'KK16');
INSERT INTO "line_stations" ("id","line_id","station_id","station_order","station_code") VALUES(55,4,50,5,'KK17');
CREATE TABLE facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE station_facilities (
    station_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    note TEXT,

    PRIMARY KEY (station_id, facility_id),

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON DELETE CASCADE
);
CREATE TABLE top_picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_japanese TEXT,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'landmark',
    description TEXT,
    image_url TEXT
);
CREATE TABLE station_top_picks (
    station_id INTEGER NOT NULL,
    top_pick_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    walking_minutes INTEGER,

    PRIMARY KEY (station_id, top_pick_id),

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (top_pick_id)
        REFERENCES top_picks(id)
        ON DELETE CASCADE
);
CREATE TABLE featured_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE
);
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "admin_users" ("id","email","password_hash","name","is_active","created_at","updated_at") VALUES(1,'bikashgurung.official@gmail.com','pbkdf2$sha256$100000$+Yw1FIntXrWy9OVALKk8Ag==$NqNwl4MO07zM46AtjgcDcpbs7u1m4J4J7RZ43r2uVwY=','Admin',1,'2026-10-09 08:29:32','2026-10-09 08:29:32');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',2);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('admin_users',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('line_stations',55);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('operators',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('lines',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('stations',50);
CREATE INDEX idx_lines_operator_id
    ON lines(operator_id);
CREATE INDEX idx_stations_name
    ON stations(name);
CREATE INDEX idx_line_stations_line_id
    ON line_stations(line_id);
CREATE INDEX idx_line_stations_station_id
    ON line_stations(station_id);
CREATE INDEX idx_station_facilities_facility_id
    ON station_facilities(facility_id);
CREATE INDEX idx_station_top_picks_top_pick_id
    ON station_top_picks(top_pick_id);
CREATE UNIQUE INDEX idx_featured_stations_station
    ON featured_stations(station_id);
CREATE INDEX idx_featured_stations_active_order
    ON featured_stations(is_active, sort_order);
CREATE INDEX idx_admin_users_email
ON admin_users(email);
