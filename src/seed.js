import mongoose from "mongoose";
import dotenv from "dotenv";
import { Hotel, Room } from "./models/index.js";

dotenv.config();

// ─── Hotel data
const HOTELS = [
  {
    name: "Evergreen Lodge & Spa",
    slug: "evergreen-lodge-spa-coorg",
    description:
      "A boutique hill-station retreat in Coorg's coffee plantations with private plunge pools and Kodava cuisine.",
    city: "Coorg",
    state: "Karnataka",
    address: "Madikeri Road, Coorg, Karnataka 571201",
    category: "boutique",
    vibes: ["romantic", "wellness"],
    amenities: [
      "Free WiFi",
      "Pool",
      "Spa",
      "Restaurant",
      "Parking",
      "Room Service",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
        public_id: "seed_evergreen_1",
      },
    ],
    rating: 4.8,
    reviewCount: 124,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nearbyAttractions: ["Abbey Falls", "Raja's Seat", "Namdroling Monastery"],
  },
  {
    name: "Opal Bay Retreat",
    slug: "opal-bay-retreat-goa",
    description:
      "Beachfront boutique in South Goa with private beach access, infinity pool, and Portuguese-Goan architecture.",
    city: "Goa",
    state: "Goa",
    address: "Palolem Beach Road, Canacona, Goa 403702",
    category: "boutique",
    vibes: ["romantic", "adventure"],
    amenities: [
      "Beachfront",
      "Pool",
      "Bar",
      "Free WiFi",
      "Water Sports",
      "Restaurant",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
        public_id: "seed_opal_1",
      },
    ],
    rating: 4.7,
    reviewCount: 98,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "10:00",
    nearbyAttractions: [
      "Palolem Beach",
      "Cotigao Wildlife Sanctuary",
      "Agonda Beach",
    ],
  },
  {
    name: "The Royal Crest",
    slug: "royal-crest-jaipur",
    description:
      "Grand heritage haveli in Jaipur restored with original frescoes, royal dining, and private courtyards.",
    city: "Jaipur",
    state: "Rajasthan",
    address: "C-Scheme, Jaipur, Rajasthan 302001",
    category: "luxury",
    vibes: ["family", "business"],
    amenities: [
      "Heritage Tours",
      "Pool",
      "Spa",
      "Restaurant",
      "Concierge",
      "Free WiFi",
      "Airport Transfer",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800",
        public_id: "seed_royal_1",
      },
    ],
    rating: 4.9,
    reviewCount: 176,
    isActive: true,
    checkInTime: "15:00",
    checkOutTime: "12:00",
    nearbyAttractions: [
      "Amber Fort",
      "Hawa Mahal",
      "City Palace",
      "Jantar Mantar",
    ],
  },
  {
    name: "Lure Retreat & Spa",
    slug: "lure-retreat-spa-manali",
    description:
      "Luxury mountain retreat in Manali with Himalayan views, open-air hot tubs, and adventure sports access.",
    city: "Manali",
    state: "Himachal Pradesh",
    address: "Old Manali Road, Manali, HP 175131",
    category: "luxury",
    vibes: ["adventure", "romantic"],
    amenities: [
      "Mountain View",
      "Hot Tub",
      "Spa",
      "Ski Access",
      "Restaurant",
      "Free WiFi",
      "Fireplace",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
        public_id: "seed_lure_1",
      },
    ],
    rating: 4.8,
    reviewCount: 143,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nearbyAttractions: ["Rohtang Pass", "Solang Valley", "Hadimba Temple"],
  },
  {
    name: "Majestic Urban Hotel",
    slug: "majestic-urban-hotel-mumbai",
    description:
      "Design-forward boutique hotel in Bandra, Mumbai — minutes from beaches, restaurants and entertainment.",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Linking Road, Bandra West, Mumbai 400050",
    category: "comfort",
    vibes: ["business", "solo"],
    amenities: [
      "Free WiFi",
      "Restaurant",
      "Bar",
      "Gym",
      "Concierge",
      "Room Service",
      "Laundry",
    ],
    images: [
      {
        url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        public_id: "seed_majestic_1",
      },
    ],
    rating: 4.5,
    reviewCount: 201,
    isActive: true,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    nearbyAttractions: [
      "Bandstand",
      "Carter Road",
      "Juhu Beach",
      "Bandra-Worli Sea Link",
    ],
  },
];

// ─── Room generator ───────────────────────────────────────────────────────────

/**
 * Generates 2-3 rooms per hotel.
 * Each room references the hotel by its MongoDB _id.
 * Prices are per night in INR.
 */
function generateRooms(hotelId, hotelCategory) {
  const baseRooms = [
    {
      hotelId,
      name: "Standard Room",
      type: "standard",
      description:
        "Comfortable room with all essential amenities for a pleasant stay.",
      pricePerNight:
        hotelCategory === "luxury"
          ? 4500
          : hotelCategory === "boutique"
            ? 3200
            : 2000,
      maxGuests: 2,
      amenities: ["Free WiFi", "AC", "TV", "En-suite Bathroom"],
      isAvailable: true,
      totalRooms: 5,
      images: [],
    },
    {
      hotelId,
      name: "Deluxe Room",
      type: "deluxe",
      description:
        "Spacious room with premium furnishings, upgraded toiletries and scenic views.",
      pricePerNight:
        hotelCategory === "luxury"
          ? 7500
          : hotelCategory === "boutique"
            ? 5200
            : 3500,
      maxGuests: 2,
      amenities: [
        "Free WiFi",
        "AC",
        "TV",
        "Mini Bar",
        "Premium Toiletries",
        "View",
      ],
      isAvailable: true,
      totalRooms: 4,
      images: [],
    },
    {
      hotelId,
      name: hotelCategory === "luxury" ? "Presidential Suite" : "Junior Suite",
      type: "suite",
      description:
        hotelCategory === "luxury"
          ? "Expansive suite with private terrace, butler service, and panoramic views."
          : "Generous suite with separate living area, ideal for longer stays.",
      pricePerNight:
        hotelCategory === "luxury"
          ? 15000
          : hotelCategory === "boutique"
            ? 9000
            : 6000,
      maxGuests: 4,
      amenities: [
        "Free WiFi",
        "AC",
        "Smart TV",
        "Mini Bar",
        "Bathtub",
        "Living Area",
        "Premium Toiletries",
      ],
      isAvailable: true,
      totalRooms: 2,
      images: [],
    },
  ];

  // comfort hotels only get standard + deluxe (no suite)
  return hotelCategory === "comfort" ? baseRooms.slice(0, 2) : baseRooms;
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  let connection;

  try {
    console.log("\n🌱 Seeding started...\n");

    // 1. Connect
    console.log("📡 Connecting to MongoDB...");
    connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ Connected to: ${connection.connection.host}\n`);

    // 2. Clear existing data (idempotent)
    console.log("🗑️  Clearing existing hotels and rooms...");
    const [deletedHotels, deletedRooms] = await Promise.all([
      Hotel.deleteMany({}),
      Room.deleteMany({}),
    ]);
    console.log(`   Removed ${deletedHotels.deletedCount} hotels`);
    console.log(`   Removed ${deletedRooms.deletedCount} rooms\n`);

    // 3. Insert hotels
    console.log("🏨 Inserting hotels...");
    const insertedHotels = await Hotel.insertMany(HOTELS);
    console.log(`   ✅ Inserted ${insertedHotels.length} hotels\n`);

    // 4. Generate and insert rooms — linked to correct hotel _id
    console.log("🛏️  Inserting rooms...");
    let totalRooms = 0;

    for (const hotel of insertedHotels) {
      const rooms = generateRooms(hotel._id, hotel.category);
      const inserted = await Room.insertMany(rooms);
      totalRooms += inserted.length;
      console.log(`   ✅ ${hotel.name} — ${inserted.length} rooms inserted`);
    }

    console.log(`\n   Total rooms inserted: ${totalRooms}`);

    // 5. Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Seeding completed successfully!");
    console.log(`   Hotels : ${insertedHotels.length}`);
    console.log(`   Rooms  : ${totalRooms}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    // Always close the connection
    if (connection) {
      await mongoose.disconnect();
      console.log("🔌 Database connection closed.\n");
    }
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
seed();
