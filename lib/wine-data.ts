export type StorageLocation = {
  id: string;
  name: string;
  type: "Fridge" | "Cellar" | "Cabinet" | "Locker";
  room: string;
  capacity: number;
  occupied: number;
  temperatureC: number;
  humidity: number;
  notes: string;
};

export type Supplier = {
  id: string;
  name: string;
  specialty: string;
  website: string;
};

export type WineCellarStatus = "Cellar" | "Drank";

export type WineBottle = {
  id: string;
  wineName: string;
  producer: string;
  imageUrl: string;
  vintage: number | null;
  region: string;
  country: string;
  grape: string;
  style: string;
  bottleSize: string;
  quantity: number;
  purchasePrice: number;
  estimatedValue: number;
  vivinoLink: string;
  vivinoScore: number;
  robertParkerScore: number;
  jamesSucklingScore: number;
  criticSource: string;
  locationId: string;
  shelf: string;
  slot: string;
  readiness: "Hold" | "Ready" | "Peak";
  drinkWindow: string;
  acquiredOn: string;
  supplierId: string;
  notes: string;
  cellarStatus?: WineCellarStatus;
  drankOn?: string;
};

export function isDrankWine(wine: Pick<WineBottle, "cellarStatus">) {
  return wine.cellarStatus === "Drank";
}

export function isCellarWine(wine: Pick<WineBottle, "cellarStatus">) {
  return wine.cellarStatus !== "Drank";
}

export const storageLocations: StorageLocation[] = [
  {
    id: "loc-kitchen-fridge",
    name: "Kitchen Fridge Reserve",
    type: "Fridge",
    room: "Kitchen",
    capacity: 36,
    occupied: 24,
    temperatureC: 11.5,
    humidity: 69,
    notes: "Best for whites, Champagne, and bottles planned for the next 60 days."
  },
  {
    id: "loc-dining-fridge",
    name: "Dining Room Service Fridge",
    type: "Fridge",
    room: "Dining Room",
    capacity: 18,
    occupied: 11,
    temperatureC: 13,
    humidity: 66,
    notes: "Front-of-house fridge for ready-to-pour bottles and guest favorites."
  },
  {
    id: "loc-cellar-a",
    name: "Basement Cellar Rack A",
    type: "Cellar",
    room: "Basement",
    capacity: 96,
    occupied: 61,
    temperatureC: 14,
    humidity: 72,
    notes: "Long-term aging zone for Barolo, Rioja Gran Reserva, and structured reds."
  },
  {
    id: "loc-hall-cabinet",
    name: "Hallway Display Cabinet",
    type: "Cabinet",
    room: "Hallway",
    capacity: 12,
    occupied: 7,
    temperatureC: 18,
    humidity: 49,
    notes: "Short-stay storage for bottles being gifted or rotated into service."
  }
];

export const suppliers: Supplier[] = [
  {
    id: "supplier-vinfolio",
    name: "Vinfolio",
    specialty: "Rare and collectible bottles",
    website: "https://www.vinfolio.com"
  },
  {
    id: "supplier-flatiron",
    name: "Flatiron Wines",
    specialty: "Everyday classics and Champagne",
    website: "https://flatiron-wines.com"
  },
  {
    id: "supplier-local-merchant",
    name: "Local Merchant",
    specialty: "Mixed regional selection",
    website: "https://example.com/local-merchant"
  }
];

export const wines: WineBottle[] = [
  {
    id: "wine-1",
    wineName: "Bandol Rouge Cuvee Classique",
    producer: "Domaine Tempier",
    imageUrl: "",
    vintage: 2019,
    region: "Bandol",
    country: "France",
    grape: "Mourvedre Blend",
    style: "Red",
    bottleSize: "750ml",
    quantity: 4,
    purchasePrice: 68,
    estimatedValue: 84,
    vivinoLink: "https://www.vivino.com/search/wines?q=Domaine%20Tempier%20Bandol%202019",
    vivinoScore: 4.3,
    robertParkerScore: 95,
    jamesSucklingScore: 94,
    criticSource: "Manual seed",
    locationId: "loc-cellar-a",
    shelf: "A2",
    slot: "Row 1 / Bin 4",
    readiness: "Hold",
    drinkWindow: "2027-2034",
    acquiredOn: "2025-10-19",
    supplierId: "Vinfolio",
    notes: "Keep for another two summers before opening the next bottle."
  },
  {
    id: "wine-2",
    wineName: "Langhe Nebbiolo Clare J.C.",
    producer: "G.D. Vajra",
    imageUrl: "",
    vintage: 2022,
    region: "Piedmont",
    country: "Italy",
    grape: "Nebbiolo",
    style: "Red",
    bottleSize: "750ml",
    quantity: 6,
    purchasePrice: 29,
    estimatedValue: 34,
    vivinoLink: "https://www.vivino.com/search/wines?q=G.D.%20Vajra%20Langhe%20Nebbiolo%202022",
    vivinoScore: 4.1,
    robertParkerScore: 0,
    jamesSucklingScore: 92,
    criticSource: "Manual seed",
    locationId: "loc-dining-fridge",
    shelf: "Top Shelf",
    slot: "Right 3",
    readiness: "Ready",
    drinkWindow: "2025-2030",
    acquiredOn: "2026-01-12",
    supplierId: "Local Merchant",
    notes: "Ideal weeknight nebbiolo. Keep two bottles chilled for quick pulls."
  },
  {
    id: "wine-3",
    wineName: "Vina Tondonia Reserva",
    producer: "Lopez de Heredia",
    imageUrl: "",
    vintage: 2011,
    region: "Rioja",
    country: "Spain",
    grape: "Tempranillo Blend",
    style: "Red",
    bottleSize: "750ml",
    quantity: 3,
    purchasePrice: 57,
    estimatedValue: 74,
    vivinoLink: "https://www.vivino.com/search/wines?q=Lopez%20de%20Heredia%20Tondonia%202011",
    vivinoScore: 4.4,
    robertParkerScore: 96,
    jamesSucklingScore: 95,
    criticSource: "Manual seed",
    locationId: "loc-cellar-a",
    shelf: "A4",
    slot: "Row 2 / Bin 1",
    readiness: "Peak",
    drinkWindow: "2024-2032",
    acquiredOn: "2024-06-04",
    supplierId: "Vinfolio",
    notes: "Open one for autumn dinner service."
  },
  {
    id: "wine-4",
    wineName: "Blanc de Blancs Grand Cru",
    producer: "Pierre Peters",
    imageUrl: "",
    vintage: 2016,
    region: "Champagne",
    country: "France",
    grape: "Chardonnay",
    style: "Sparkling",
    bottleSize: "750ml",
    quantity: 5,
    purchasePrice: 89,
    estimatedValue: 102,
    vivinoLink: "https://www.vivino.com/search/wines?q=Pierre%20Peters%20Blanc%20de%20Blancs%202016",
    vivinoScore: 4.5,
    robertParkerScore: 94,
    jamesSucklingScore: 95,
    criticSource: "Manual seed",
    locationId: "loc-kitchen-fridge",
    shelf: "Middle Shelf",
    slot: "Left 2",
    readiness: "Ready",
    drinkWindow: "2025-2033",
    acquiredOn: "2025-12-20",
    supplierId: "Flatiron Wines",
    notes: "Keep one cold for celebrations and rotate replacements monthly."
  },
  {
    id: "wine-5",
    wineName: "Estate Cabernet Sauvignon",
    producer: "Ridge Vineyards",
    imageUrl: "",
    vintage: 2020,
    region: "Santa Cruz Mountains",
    country: "USA",
    grape: "Cabernet Sauvignon",
    style: "Red",
    bottleSize: "750ml",
    quantity: 2,
    purchasePrice: 76,
    estimatedValue: 82,
    vivinoLink: "https://www.vivino.com/search/wines?q=Ridge%20Estate%20Cabernet%202020",
    vivinoScore: 4.2,
    robertParkerScore: 93,
    jamesSucklingScore: 94,
    criticSource: "Manual seed",
    locationId: "loc-cellar-a",
    shelf: "A1",
    slot: "Row 1 / Bin 1",
    readiness: "Hold",
    drinkWindow: "2028-2038",
    acquiredOn: "2026-02-07",
    supplierId: "Local Merchant",
    notes: "Still primary-fruit driven. Check first bottle in 2028."
  },
  {
    id: "wine-6",
    wineName: "Moscato d'Asti",
    producer: "Vietti",
    imageUrl: "",
    vintage: 2024,
    region: "Piedmont",
    country: "Italy",
    grape: "Moscato Bianco",
    style: "Dessert",
    bottleSize: "750ml",
    quantity: 4,
    purchasePrice: 21,
    estimatedValue: 24,
    vivinoLink: "https://www.vivino.com/search/wines?q=Vietti%20Moscato%20d%27Asti%202024",
    vivinoScore: 4,
    robertParkerScore: 0,
    jamesSucklingScore: 90,
    criticSource: "Manual seed",
    locationId: "loc-kitchen-fridge",
    shelf: "Lower Shelf",
    slot: "Back 2",
    readiness: "Ready",
    drinkWindow: "2025-2027",
    acquiredOn: "2026-03-02",
    supplierId: "Flatiron Wines",
    notes: "Fast turnover bottle for desserts and brunch pours."
  },
  {
    id: "wine-7",
    wineName: "Adrianna Vineyard Malbec",
    producer: "Catena Zapata",
    imageUrl: "",
    vintage: 2021,
    region: "Mendoza",
    country: "Argentina",
    grape: "Malbec",
    style: "Red",
    bottleSize: "750ml",
    quantity: 3,
    purchasePrice: 97,
    estimatedValue: 109,
    vivinoLink: "https://www.vivino.com/search/wines?q=Catena%20Zapata%20Adrianna%202021",
    vivinoScore: 4.6,
    robertParkerScore: 99,
    jamesSucklingScore: 98,
    criticSource: "Manual seed",
    locationId: "loc-cellar-a",
    shelf: "A5",
    slot: "Row 3 / Bin 2",
    readiness: "Hold",
    drinkWindow: "2029-2040",
    acquiredOn: "2025-11-14",
    supplierId: "Vinfolio",
    notes: "High-potential bottle. Protect from casual opening."
  },
  {
    id: "wine-8",
    wineName: "Rosso di Montalcino",
    producer: "Biondi-Santi",
    imageUrl: "",
    vintage: 2020,
    region: "Tuscany",
    country: "Italy",
    grape: "Sangiovese",
    style: "Red",
    bottleSize: "750ml",
    quantity: 2,
    purchasePrice: 63,
    estimatedValue: 71,
    vivinoLink: "https://www.vivino.com/search/wines?q=Biondi-Santi%20Rosso%202020",
    vivinoScore: 4.2,
    robertParkerScore: 92,
    jamesSucklingScore: 93,
    criticSource: "Manual seed",
    locationId: "loc-dining-fridge",
    shelf: "Bottom Shelf",
    slot: "Center 1",
    readiness: "Ready",
    drinkWindow: "2025-2031",
    acquiredOn: "2026-02-18",
    supplierId: "Local Merchant",
    notes: "Dinner-party safe pick. Move one more bottle to service before spring hosting."
  },
  {
    id: "wine-9",
    wineName: "Le Mont Sec",
    producer: "Domaine Huet",
    imageUrl: "",
    vintage: 2022,
    region: "Vouvray",
    country: "France",
    grape: "Chenin Blanc",
    style: "White",
    bottleSize: "750ml",
    quantity: 5,
    purchasePrice: 39,
    estimatedValue: 46,
    vivinoLink: "https://www.vivino.com/search/wines?q=Domaine%20Huet%20Le%20Mont%202022",
    vivinoScore: 4.3,
    robertParkerScore: 94,
    jamesSucklingScore: 95,
    criticSource: "Manual seed",
    locationId: "loc-kitchen-fridge",
    shelf: "Top Shelf",
    slot: "Center 4",
    readiness: "Ready",
    drinkWindow: "2025-2035",
    acquiredOn: "2025-09-09",
    supplierId: "Flatiron Wines",
    notes: "Track for spring lunches and seafood pairings."
  },
  {
    id: "wine-10",
    wineName: "Morgon Cote du Py",
    producer: "Jean Foillard",
    imageUrl: "",
    vintage: 2022,
    region: "Beaujolais",
    country: "France",
    grape: "Gamay",
    style: "Red",
    bottleSize: "750ml",
    quantity: 6,
    purchasePrice: 41,
    estimatedValue: 47,
    vivinoLink: "https://www.vivino.com/search/wines?q=Foillard%20Morgon%202022",
    vivinoScore: 4.2,
    robertParkerScore: 0,
    jamesSucklingScore: 93,
    criticSource: "Manual seed",
    locationId: "loc-dining-fridge",
    shelf: "Middle Shelf",
    slot: "Left 1",
    readiness: "Ready",
    drinkWindow: "2025-2030",
    acquiredOn: "2026-01-26",
    supplierId: "Local Merchant",
    notes: "Great by-the-glass candidate. Quantity is healthy enough for rotation."
  },
  {
    id: "wine-11",
    wineName: "Vintage Port",
    producer: "Niepoort",
    imageUrl: "",
    vintage: 2017,
    region: "Douro",
    country: "Portugal",
    grape: "Field Blend",
    style: "Fortified",
    bottleSize: "750ml",
    quantity: 2,
    purchasePrice: 92,
    estimatedValue: 116,
    vivinoLink: "https://www.vivino.com/search/wines?q=Niepoort%20Vintage%20Port%202017",
    vivinoScore: 4.5,
    robertParkerScore: 97,
    jamesSucklingScore: 96,
    criticSource: "Manual seed",
    locationId: "loc-hall-cabinet",
    shelf: "Upper Rack",
    slot: "Box 2",
    readiness: "Hold",
    drinkWindow: "2030-2050",
    acquiredOn: "2025-08-21",
    supplierId: "Vinfolio",
    notes: "Move back to cellar if cabinet temperature climbs in summer."
  },
  {
    id: "wine-12",
    wineName: "Chablis 1er Cru Montmains",
    producer: "Raveneau",
    imageUrl: "",
    vintage: 2021,
    region: "Chablis",
    country: "France",
    grape: "Chardonnay",
    style: "White",
    bottleSize: "750ml",
    quantity: 1,
    purchasePrice: 138,
    estimatedValue: 164,
    vivinoLink: "https://www.vivino.com/search/wines?q=Raveneau%20Montmains%202021",
    vivinoScore: 4.7,
    robertParkerScore: 96,
    jamesSucklingScore: 97,
    criticSource: "Manual seed",
    locationId: "loc-kitchen-fridge",
    shelf: "Top Shelf",
    slot: "Right 1",
    readiness: "Peak",
    drinkWindow: "2025-2032",
    acquiredOn: "2025-07-03",
    supplierId: "Vinfolio",
    notes: "Flag as high-value bottle and avoid leaving it buried behind party wines."
  }
];
