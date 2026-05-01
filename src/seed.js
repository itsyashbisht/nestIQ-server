import mongoose from "mongoose";
import dotenv from "dotenv";
import { Hotel, Room } from "./models/index.js";

dotenv.config();

const HOTELS = [
  {
    name: "Taj Lake Palace",
    slug: "taj-lake-palace-udaipur",
    description:
      "A legendary 18th-century marble palace floating on Lake Pichola. Every room faces the lake. Boat transfers, royal dining, and Rajput architecture at its finest.",
    city: "Udaipur",
    state: "Rajasthan",
    address: "Pichola Lake, Udaipur, Rajasthan 313001",
    category: "luxury",
    vibes: ["romantic", "family"],
    amenities: [
      "Lake View",
      "Pool",
      "Spa",
      "Fine Dining",
      "Boat Transfer",
      "Concierge",
      "Free WiFi",
      "Butler Service",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=1200&q=85",
        public_id: "seed_taj_lake_1",
      },
    ],
    startingFrom: 18000,
    rating: 4.9,
    reviewCount: 312,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    nearbyAttractions: ["City Palace", "Jagdish Temple", "Fateh Sagar Lake"],
  },
  {
    name: "Wildflower Hall",
    slug: "wildflower-hall-shimla",
    description:
      "A former summer retreat of Lord Kitchener perched at 8,250 ft in the Himalayas. Cedar forests, heated plunge pools, and panoramic snow views from every suite.",
    city: "Shimla",
    state: "Himachal Pradesh",
    address: "Chharabra, Shimla, Himachal Pradesh 171012",
    category: "luxury",
    vibes: ["romantic", "wellness"],
    amenities: [
      "Mountain View",
      "Heated Pool",
      "Spa",
      "Fireplace",
      "Restaurant",
      "Free WiFi",
      "Trekking",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=85",
        public_id: "seed_wildflower_1",
      },
    ],
    startingFrom: 14000,
    rating: 4.8,
    reviewCount: 198,
    isActive: true,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    nearbyAttractions: ["Jakhu Temple", "The Ridge", "Kufri", "Green Valley"],
  },
  {
    name: "Coconut Lagoon",
    slug: "coconut-lagoon-kumarakom",
    description:
      "An award-winning heritage resort on Vembanad Lake in Kerala. Teak-wood mansions, backwater cruises on private kettuvallams, and Ayurveda at the source.",
    city: "Kumarakom",
    state: "Kerala",
    address: "Kumarakom, Kottayam, Kerala 686563",
    category: "boutique",
    vibes: ["romantic", "wellness"],
    amenities: [
      "Backwater View",
      "Ayurveda",
      "Pool",
      "Houseboat",
      "Restaurant",
      "Free WiFi",
      "Birdwatching",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=85",
        public_id: "seed_coconut_1",
      },
    ],
    startingFrom: 8500,
    rating: 4.8,
    reviewCount: 224,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nearbyAttractions: [
      "Vembanad Lake",
      "Kumarakom Bird Sanctuary",
      "Alleppey Backwaters",
    ],
  },
  {
    name: "The Leela Goa",
    slug: "leela-goa-cavelossim",
    description:
      "A 75-acre paradise on the Sal River in South Goa. Lagoon pools wind through Portuguese-style villas leading to a private beach.",
    city: "Goa",
    state: "Goa",
    address: "Mobor, Cavelossim, South Goa 403731",
    category: "luxury",
    vibes: ["romantic", "family"],
    amenities: [
      "Private Beach",
      "Lagoon Pool",
      "Spa",
      "Fine Dining",
      "Water Sports",
      "Free WiFi",
      "Kids Club",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=85",
        public_id: "seed_leela_goa_1",
      },
    ],
    startingFrom: 12000,
    rating: 4.8,
    reviewCount: 276,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    nearbyAttractions: ["Mobor Beach", "Colva Beach", "Margao Market"],
  },
  {
    name: "Neemrana Fort Palace",
    slug: "neemrana-fort-palace-alwar",
    description:
      "A 15th-century step-fort hotel on a dramatic escarpment between Delhi and Jaipur. Multiple pools at different elevations, vintage cars, and zip-lining over battlements.",
    city: "Neemrana",
    state: "Rajasthan",
    address: "Neemrana, NH-48, Alwar, Rajasthan 301705",
    category: "boutique",
    vibes: ["adventure", "family"],
    amenities: [
      "Heritage Pool",
      "Zip Line",
      "Restaurant",
      "Vintage Cars",
      "Yoga",
      "Free WiFi",
      "Cultural Shows",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=85",
        public_id: "seed_neemrana_1",
      },
    ],
    startingFrom: 5500,
    rating: 4.6,
    reviewCount: 189,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nearbyAttractions: ["Neemrana Fort", "Sariska Tiger Reserve", "Bala Quila"],
  },
  {
    name: "Taj Mahal Palace Mumbai",
    slug: "taj-mahal-palace-mumbai",
    description:
      "The iconic 1903 Taj fronting the Arabian Sea and the Gateway of India. Mumbai's most storied address with 9 restaurants and sea-view suites.",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Apollo Bunder, Colaba, Mumbai 400001",
    category: "luxury",
    vibes: ["business", "romantic"],
    amenities: [
      "Sea View",
      "Pool",
      "Spa",
      "9 Restaurants",
      "Bar",
      "Concierge",
      "Free WiFi",
      "Business Centre",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=85",
        public_id: "seed_taj_mumbai_1",
      },
    ],
    startingFrom: 22000,
    rating: 4.9,
    reviewCount: 441,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    nearbyAttractions: [
      "Gateway of India",
      "Colaba Causeway",
      "Elephanta Caves",
      "Marine Drive",
    ],
  },
  {
    name: "SwaSwara Gokarna",
    slug: "swaswara-om-beach-gokarna",
    description:
      "A yoga and wellness sanctuary overlooking Om Beach. Laterite cottages, Ayurveda centre, and a no-phones beach policy that actually works.",
    city: "Gokarna",
    state: "Karnataka",
    address: "Om Beach, Gokarna, Karnataka 581326",
    category: "boutique",
    vibes: ["wellness", "solo"],
    amenities: [
      "Yoga Shala",
      "Ayurveda",
      "Beach Access",
      "Organic Cuisine",
      "Meditation",
      "Free WiFi",
      "Pool",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85",
        public_id: "seed_swaswara_1",
      },
    ],
    startingFrom: 9000,
    rating: 4.7,
    reviewCount: 161,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nearbyAttractions: ["Om Beach", "Half Moon Beach", "Gokarna Temple"],
  },
  {
    name: "Alila Fort Bishangarh",
    slug: "alila-fort-bishangarh-jaipur",
    description:
      "A 230-year-old hilltop fort 45 minutes from Jaipur. Six towers, rooftop pool, and Aravalli views stretching to the horizon.",
    city: "Jaipur",
    state: "Rajasthan",
    address: "Bishangarh, Jaipur, Rajasthan 303104",
    category: "luxury",
    vibes: ["romantic", "adventure"],
    amenities: [
      "Rooftop Pool",
      "Spa",
      "Heritage Walks",
      "Restaurant",
      "Jeep Safari",
      "Yoga",
      "Free WiFi",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1519955266818-e3b7e3d55f6d?w=1200&q=85",
        public_id: "seed_bishangarh_1",
      },
    ],
    startingFrom: 13000,
    rating: 4.8,
    reviewCount: 167,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    nearbyAttractions: ["Amber Fort", "Nahargarh Fort", "Jaipur Old City"],
  },
  {
    name: "The Windflower Coorg",
    slug: "windflower-spa-resort-coorg",
    description:
      "A 3-acre coffee estate resort with plantation views, infinity pool over the valley, and Kodava spice-route cuisine.",
    city: "Coorg",
    state: "Karnataka",
    address: "Gonikoppal Road, Coorg, Karnataka 571201",
    category: "boutique",
    vibes: ["romantic", "wellness"],
    amenities: [
      "Plantation View",
      "Infinity Pool",
      "Spa",
      "Coffee Tour",
      "Restaurant",
      "Free WiFi",
      "Cycling",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1586375300773-8384e3e4916f?w=1200&q=85",
        public_id: "seed_windflower_1",
      },
    ],
    startingFrom: 6500,
    rating: 4.7,
    reviewCount: 203,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nearbyAttractions: ["Abbey Falls", "Raja's Seat", "Dubare Elephant Camp"],
  },
  {
    name: "Rambagh Palace",
    slug: "rambagh-palace-jaipur",
    description:
      "The Maharaja of Jaipur's former home. 47 acres of Mughal gardens, polo grounds, and a spa in the royal stables.",
    city: "Jaipur",
    state: "Rajasthan",
    address: "Bhawani Singh Road, Jaipur, Rajasthan 302005",
    category: "luxury",
    vibes: ["romantic", "family"],
    amenities: [
      "Mughal Gardens",
      "Pool",
      "Spa",
      "Polo",
      "Fine Dining",
      "Butler Service",
      "Free WiFi",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1562790351-d273a961e0e9?w=1200&q=85",
        public_id: "seed_rambagh_1",
      },
    ],
    startingFrom: 32000,
    rating: 4.9,
    reviewCount: 287,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    nearbyAttractions: [
      "City Palace",
      "Amber Fort",
      "Hawa Mahal",
      "Jantar Mantar",
    ],
  },
  {
    name: "Zostel Manali",
    slug: "zostel-manali",
    description:
      "Best-rated backpacker hostel in Manali with mountain views from every dorm, rooftop bonfire deck, and treks to Hampta Pass.",
    city: "Manali",
    state: "Himachal Pradesh",
    address: "Old Manali Road, Manali, HP 175131",
    category: "budget",
    vibes: ["adventure", "solo"],
    amenities: [
      "Mountain View",
      "Bonfire Deck",
      "Cafe",
      "Lockers",
      "Travel Desk",
      "Free WiFi",
      "Laundry",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85",
        public_id: "seed_zostel_manali_1",
      },
    ],
    startingFrom: 700,
    rating: 4.4,
    reviewCount: 318,
    isActive: true,
    checkInTime: "12:00",
    checkOutTime: "10:00",
    nearbyAttractions: ["Solang Valley", "Rohtang Pass", "Hadimba Temple"],
  },
  {
    name: "The Paul Bangalore",
    slug: "paul-bangalore",
    description:
      "Contemporary design hotel in Bangalore with handcrafted furniture, 6000 sq ft spa, rooftop pool, and one of the city's best French restaurants.",
    city: "Bangalore",
    state: "Karnataka",
    address: "Domlur, Bengaluru, Karnataka 560071",
    category: "luxury",
    vibes: ["business", "romantic"],
    amenities: [
      "Rooftop Pool",
      "Spa",
      "French Restaurant",
      "Bar",
      "Business Centre",
      "Free WiFi",
      "Gym",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=85",
        public_id: "seed_paul_blr_1",
      },
    ],
    startingFrom: 8000,
    rating: 4.7,
    reviewCount: 189,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    nearbyAttractions: ["Indiranagar", "MG Road", "Cubbon Park"],
  },
  {
    name: "Zostel Varanasi",
    slug: "zostel-varanasi",
    description:
      "Rooftop hostel directly overlooking the Ganges. Ghat views from every bed, Ganga aarti from the terrace, and daily boat rides.",
    city: "Varanasi",
    state: "Uttar Pradesh",
    address: "Meer Ghat, Varanasi, Uttar Pradesh 221001",
    category: "budget",
    vibes: ["solo", "adventure"],
    amenities: [
      "Ganga View",
      "Rooftop Cafe",
      "Boat Rides",
      "Travel Desk",
      "Free WiFi",
      "Lockers",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1561361058-c24e021b7d83?w=1200&q=85",
        public_id: "seed_zostel_var_1",
      },
    ],
    startingFrom: 600,
    rating: 4.3,
    reviewCount: 402,
    isActive: true,
    checkInTime: "12:00",
    checkOutTime: "10:00",
    nearbyAttractions: [
      "Dashashwamedh Ghat",
      "Kashi Vishwanath Temple",
      "Sarnath",
    ],
  },
  {
    name: "Coco Shambhala Goa",
    slug: "coco-shambhala-north-goa",
    description:
      "Private villa boutique in Assagao, North Goa. Bougainvillea-draped, salt-pool centred, deliberately low-key. 8 villas, farm-to-table kitchen, zero noise policy.",
    city: "Goa",
    state: "Goa",
    address: "Assagao, Bardez, North Goa 403507",
    category: "boutique",
    vibes: ["romantic", "wellness"],
    amenities: [
      "Salt Pool",
      "Farm-to-Table",
      "Spa",
      "Yoga",
      "Cycling",
      "Free WiFi",
      "Library",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=85",
        public_id: "seed_coco_1",
      },
    ],
    startingFrom: 11000,
    rating: 4.8,
    reviewCount: 88,
    isActive: true,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    nearbyAttractions: ["Vagator Beach", "Anjuna Flea Market", "Chapora Fort"],
  },
  {
    name: "Zostel Rishikesh",
    slug: "zostel-rishikesh",
    description:
      "Riverside hostel above the Ganges in Tapovan. Morning yoga on deck, white-water rafting at the door, bonfire every evening.",
    city: "Rishikesh",
    state: "Uttarakhand",
    address: "Tapovan, Rishikesh, Uttarakhand 249192",
    category: "budget",
    vibes: ["adventure", "wellness"],
    amenities: [
      "Ganga View",
      "Yoga Deck",
      "Rafting Desk",
      "Bonfire",
      "Cafe",
      "Free WiFi",
      "Lockers",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1529170335054-5abb0f4b9d78?w=1200&q=85",
        public_id: "seed_zostel_rk_1",
      },
    ],
    startingFrom: 650,
    rating: 4.4,
    reviewCount: 487,
    isActive: true,
    checkInTime: "12:00",
    checkOutTime: "10:00",
    nearbyAttractions: ["Laxman Jhula", "Triveni Ghat", "Neer Garh Waterfall"],
  },
];

// ─── Room generator ───────────────────────────────────────────────────────────
// hotel.startingFrom = cheapest room price (standard/dorm)
// All other rooms priced as multipliers of that base

function generateRooms(hotel) {
  const c = hotel.category;
  const b = hotel.startingFrom; // base = cheapest room
  const rooms = [];

  // Room 1 — Entry level
  if (c === "budget") {
    rooms.push({
      hotelId: hotel._id,
      name: "Dorm Bed",
      type: "dormitory",
      description:
        "Pod-style bunk in a clean shared dorm with individual locker, reading light, USB charging, curtain privacy, and shared bathrooms on each floor.",
      pricePerNight: b,
      maxGuests: 1,
      amenities: [
        "Free WiFi",
        "Locker",
        "Reading Light",
        "Shared Bathroom",
        "AC",
        "USB Charging",
      ],
      isAvailable: true,
      totalRooms: 20,
      images: [],
    });
  } else {
    rooms.push({
      hotelId: hotel._id,
      name: "Standard Room",
      type: "standard",
      description:
        "A well-appointed room with quality bedding, en-suite bathroom, reliable WiFi, and all essentials for a comfortable stay.",
      pricePerNight: b,
      maxGuests: 2,
      amenities: [
        "Free WiFi",
        "AC",
        "LED TV",
        "En-suite Bathroom",
        "Work Desk",
        "Safe",
      ],
      isAvailable: true,
      totalRooms: c === "luxury" ? 8 : 6,
      images: [],
    });
  }

  // Room 2 — Mid tier
  if (c === "budget") {
    rooms.push({
      hotelId: hotel._id,
      name: "Private Room",
      type: "standard",
      description:
        "A private en-suite double room — the step up from dorms when you need your own space without luxury prices.",
      pricePerNight: Math.round(b * 2.4),
      maxGuests: 2,
      amenities: [
        "Free WiFi",
        "AC",
        "TV",
        "En-suite Bathroom",
        "Wardrobe",
        "Safe",
      ],
      isAvailable: true,
      totalRooms: 8,
      images: [],
    });
  } else {
    rooms.push({
      hotelId: hotel._id,
      name: "Deluxe Room",
      type: "deluxe",
      description:
        "More space, upgraded bath amenities, premium toiletries, and better views. The most popular choice at this property.",
      pricePerNight: Math.round(b * 1.65),
      maxGuests: 3,
      amenities: [
        "Free WiFi",
        "AC",
        "Smart TV",
        "Mini Bar",
        "Premium Toiletries",
        "Work Desk",
        "View",
      ],
      isAvailable: true,
      totalRooms: c === "luxury" ? 6 : 5,
      images: [],
    });
  }

  // Room 3 — Suite / Family
  if (c === "budget") {
    rooms.push({
      hotelId: hotel._id,
      name: "Family Room",
      type: "suite",
      description:
        "Spacious private room with two queen beds, extra storage, and en-suite bathroom. Best for families or groups of three.",
      pricePerNight: Math.round(b * 3.8),
      maxGuests: 4,
      amenities: [
        "Free WiFi",
        "AC",
        "TV",
        "Two Queen Beds",
        "En-suite Bathroom",
        "Extra Storage",
      ],
      isAvailable: true,
      totalRooms: 4,
      images: [],
    });
  } else {
    rooms.push({
      hotelId: hotel._id,
      name: c === "luxury" ? "Luxury Suite" : "Heritage Suite",
      type: "suite",
      description:
        c === "luxury"
          ? "A sprawling suite with separate living area, premium bar, soaking tub, and signature property views."
          : "The most distinctive room — largest footprint, best views, fully personalised service.",
      pricePerNight: Math.round(b * 2.8),
      maxGuests: 4,
      amenities: [
        "Free WiFi",
        "AC",
        "Smart TV",
        "Living Area",
        "Mini Bar",
        "Soaking Tub",
        "Premium Toiletries",
        "Concierge",
      ],
      isAvailable: true,
      totalRooms: c === "luxury" ? 4 : 3,
      images: [],
    });
  }

  // Room 4 — Top tier (luxury + boutique only)
  if (c === "luxury") {
    rooms.push({
      hotelId: hotel._id,
      name: "Private Villa",
      type: "villa",
      description:
        "Standalone villa with private plunge pool, personal butler, full kitchen, and the entire estate experience. Maximum privacy.",
      pricePerNight: Math.round(b * 4.8),
      maxGuests: 6,
      amenities: [
        "Private Pool",
        "Butler Service",
        "Full Kitchen",
        "Private Garden",
        "Premium Bar",
        "Free WiFi",
        "Concierge",
        "Breakfast Included",
      ],
      isAvailable: true,
      totalRooms: 2,
      images: [],
    });
  }

  if (c === "boutique") {
    rooms.push({
      hotelId: hotel._id,
      name: "Signature Villa",
      type: "villa",
      description:
        "Crown jewel of the property — private garden, outdoor shower, curated minibar, and bespoke daily itinerary from the concierge.",
      pricePerNight: Math.round(b * 3.5),
      maxGuests: 4,
      amenities: [
        "Private Garden",
        "Outdoor Shower",
        "Curated Minibar",
        "Concierge",
        "Free WiFi",
        "Personalised Breakfast",
        "Premium Toiletries",
      ],
      isAvailable: true,
      totalRooms: 2,
      images: [],
    });
  }

  return rooms;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  let connection;
  try {
    console.log("\n🌱 Seeding started...\n");

    console.log("📡 Connecting to MongoDB...");
    connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ Connected: ${connection.connection.host}\n`);

    console.log("🗑️  Clearing existing data...");
    const [h, r] = await Promise.all([
      Hotel.deleteMany({}),
      Room.deleteMany({}),
    ]);
    console.log(
      `   Removed ${h.deletedCount} hotels, ${r.deletedCount} rooms\n`,
    );

    console.log("🏨 Inserting hotels...");
    const inserted = await Hotel.insertMany(HOTELS);
    console.log(`  ✅ ${inserted.length} hotels inserted\n`);

    console.log("🛏️  Inserting rooms...");
    let totalRooms = 0;
    for (const hotel of inserted) {
      const rooms = generateRooms(hotel);
      const done = await Room.insertMany(rooms);
      totalRooms += done.length;
      console.log(
        `   ${hotel.name} (${hotel.category}) → ${done.length} rooms | from ₹${hotel.startingFrom.toLocaleString("en-IN")}/night`,
      );
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Done! Hotels: ${inserted.length} | Rooms: ${totalRooms}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected.\n");
    }
  }
}

seed();
