export interface Station {
  name: string;
  slug: string;
  area: string;
  description: string;

  lines: string[];

  exits: string[];

  attractions: string[];

  restaurants: string[];

  hotels: string[];

  images: {
    hero: string;
    gallery: string[];
  };

  faqs: {
    question: string;
    answer: string;
  }[];

  seo: {
    title: string;
    description: string;
  };
}

export const stations: Station[] = [
  {
    name: "Tokyo Station",
    slug: "tokyo",
    area: "Marunouchi · Central Tokyo",
    description:
      "Tokyo Station is one of the city's major railway hubs, connecting travellers with local, regional, and high-speed train services.",

    lines: [
      "JR Yamanote Line",
      "JR Chuo Line",
      "JR Keihin-Tohoku Line",
      "Tokyo Metro Marunouchi Line",
    ],

    exits: [
      "Marunouchi Central Exit",
      "Marunouchi North Exit",
      "Yaesu Central Exit",
    ],

    attractions: [
      "Tokyo Station Marunouchi Building",
      "Tokyo Imperial Palace",
      "Tokyo Station Gallery",
    ],

    restaurants: [
      "Tokyo Ramen Street",
      "Tokyo Station Ichibancho",
      "Marunouchi Restaurant Area",
    ],

    hotels: ["Tokyo Station Hotel", "Marunouchi Hotel"],

    images: {
      hero: "/images/stations/tokyo/tokyo-station.webp",
      gallery: [
        "/images/stations/tokyo/tokyo-station-1.webp",
        "/images/stations/tokyo/tokyo-station-2.webp",
        "/images/stations/tokyo/tokyo-station-3.webp",
      ],
    },

    faqs: [
      {
        question: "What train lines serve Tokyo Station?",
        answer:
          "Tokyo Station is served by several JR lines, Shinkansen services, and the Tokyo Metro Marunouchi Line.",
      },
      {
        question: "What is Tokyo Station known for?",
        answer:
          "Tokyo Station is known for its historic red-brick building, major railway connections, Shinkansen services, and access to Marunouchi.",
      },
    ],

    seo: {
      title: "Tokyo Station Guide | Train Lines, Exits & Nearby Places",
      description:
        "Complete Tokyo Station guide covering train lines, station exits, nearby attractions, restaurants, hotels, and useful travel information.",
    },
  },

  {
    name: "Shibuya Station",
    slug: "shibuya",
    area: "Shibuya · West Tokyo",
    description:
      "Shibuya Station is a major transport hub surrounded by shopping, entertainment, restaurants, and famous Tokyo landmarks.",

    lines: [
      "JR Yamanote Line",
      "JR Saikyo Line",
      "Tokyo Metro Ginza Line",
      "Tokyo Metro Hanzomon Line",
    ],

    exits: ["Hachiko Exit", "Central Exit", "West Exit"],

    attractions: ["Shibuya Scramble Crossing", "Hachiko Statue", "Shibuya Sky"],

    restaurants: ["Shibuya Center-Gai Restaurants", "Shibuya Yokocho"],

    hotels: ["Shibuya Excel Hotel Tokyu", "Shibuya Tokyu REI Hotel"],

    images: {
      hero: "/images/stations/shibuya/shibuya-station.webp",
      gallery: [
        "/images/stations/shibuya/shibuya-station-1.webp",
        "/images/stations/shibuya/shibuya-station-2.webp",
        "/images/stations/shibuya/shibuya-station-3.webp",
      ],
    },

    faqs: [
      {
        question: "What is Shibuya Station famous for?",
        answer:
          "Shibuya Station is famous for Shibuya Scramble Crossing, the Hachiko Statue, shopping, restaurants, and entertainment.",
      },
      {
        question: "Which train lines serve Shibuya Station?",
        answer:
          "Shibuya is served by JR lines, Tokyo Metro lines, and Tokyu and Keio railway services.",
      },
    ],

    seo: {
      title: "Shibuya Station Guide | Train Lines, Exits & Nearby Places",
      description:
        "Complete Shibuya Station guide covering train lines, exits, attractions, restaurants, hotels, and useful travel information.",
    },
  },

  {
    name: "Shinjuku Station",
    slug: "shinjuku",
    area: "Shinjuku · West Tokyo",
    description:
      "Shinjuku Station is one of Tokyo's busiest railway hubs and provides access to shopping, business districts, restaurants, and entertainment.",

    lines: [
      "JR Yamanote Line",
      "JR Chuo Line",
      "JR Chuo-Sobu Line",
      "Tokyo Metro Marunouchi Line",
    ],

    exits: ["East Exit", "West Exit", "South Exit"],

    attractions: [
      "Shinjuku Gyoen National Garden",
      "Tokyo Metropolitan Government Building",
      "Kabukicho",
    ],

    restaurants: ["Omoide Yokocho", "Shinjuku Golden Gai"],

    hotels: ["Keio Plaza Hotel", "Hotel Gracery Shinjuku"],

    images: {
      hero: "/images/stations/shinjuku/shinjuku-station.webp",
      gallery: [
        "/images/stations/shinjuku/shinjuku-station-1.webp",
        "/images/stations/shinjuku/shinjuku-station-2.webp",
        "/images/stations/shinjuku/shinjuku-station-3.webp",
      ],
    },

    faqs: [
      {
        question: "What is Shinjuku Station known for?",
        answer:
          "Shinjuku Station is a major transportation hub surrounded by shopping, business areas, restaurants, nightlife, and entertainment.",
      },
      {
        question: "What can you visit near Shinjuku Station?",
        answer:
          "Popular places include Shinjuku Gyoen, Kabukicho, Omoide Yokocho, and the Tokyo Metropolitan Government Building.",
      },
    ],

    seo: {
      title: "Shinjuku Station Guide | Train Lines, Exits & Nearby Places",
      description:
        "Complete Shinjuku Station guide covering train lines, exits, attractions, restaurants, hotels, and useful travel information.",
    },
  },

  {
    name: "Ueno Station",
    slug: "ueno",
    area: "Ueno · Taito",
    description:
      "Ueno Station provides convenient access to Ueno Park, museums, shopping areas, and several important railway lines.",

    lines: [
      "JR Yamanote Line",
      "JR Keihin-Tohoku Line",
      "JR Utsunomiya Line",
      "Tokyo Metro Ginza Line",
    ],

    exits: ["Park Exit", "Shinobazu Exit", "Asakusa Exit"],

    attractions: ["Ueno Park", "Tokyo National Museum", "Ueno Zoo"],

    restaurants: ["Ameyoko Shopping Street", "Ueno Restaurant Area"],

    hotels: ["Hotel Sardonyx Ueno", "APA Hotel Ueno Ekimae"],
    images: {
      hero: "/images/stations/ueno/ueno-station.webp",
      gallery: [
        "/images/stations/ueno/ueno-station-1.webp",
        "/images/stations/ueno/ueno-station-2.webp",
        "/images/stations/ueno/ueno-station-3.webp",
      ],
    },

    faqs: [
      {
        question: "What is Ueno Station near?",
        answer:
          "Ueno Station is close to Ueno Park, museums, Ueno Zoo, Ameyoko Shopping Street, and several cultural attractions.",
      },
      {
        question: "Which train lines serve Ueno Station?",
        answer:
          "Ueno Station is served by several JR lines and the Tokyo Metro Ginza and Hibiya lines.",
      },
    ],

    seo: {
      title: "Ueno Station Guide | Train Lines, Exits & Nearby Places",
      description:
        "Complete Ueno Station guide covering train lines, exits, attractions, restaurants, hotels, and useful travel information.",
    },
  },

  {
    name: "Akihabara Station",
    slug: "akihabara",
    area: "Akihabara · Chiyoda",
    description:
      "Akihabara Station is a major Tokyo transport hub known for electronics, anime, gaming, technology, and vibrant shopping streets.",

    lines: [
      "JR Yamanote Line",
      "JR Keihin-Tohoku Line",
      "JR Chuo-Sobu Line",
      "Tokyo Metro Hibiya Line",
    ],

    exits: ["Electric Town Exit", "Central Exit", "Showa-dori Exit"],

    attractions: [
      "Akihabara Electric Town",
      "Akihabara Radio Center",
      "Kanda Myojin Shrine",
    ],

    restaurants: ["Akihabara Ramen Area", "Akihabara Maid Cafe Area"],

    hotels: ["Akihabara Washington Hotel", "Hotel Resol Akihabara"],
    images: {
      hero: "/images/stations/akihabara/akihabara-station.webp",
      gallery: [
        "/images/stations/akihabara/akihabara-station-1.webp",
        "/images/stations/akihabara/akihabara-station-2.webp",
        "/images/stations/akihabara/akihabara-station-3.webp",
      ],
    },

    faqs: [
      {
        question: "What is Akihabara famous for?",
        answer:
          "Akihabara is famous for electronics, anime, manga, gaming, technology shops, and its distinctive pop-culture atmosphere.",
      },
      {
        question: "Which train lines serve Akihabara Station?",
        answer:
          "Akihabara is served by JR lines, the Tokyo Metro Hibiya Line, and the Tsukuba Express.",
      },
    ],

    seo: {
      title: "Akihabara Station Guide | Train Lines, Exits & Nearby Places",
      description:
        "Complete Akihabara Station guide covering train lines, exits, attractions, restaurants, hotels, and useful travel information.",
    },
  },
];
