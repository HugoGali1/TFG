export interface Category {
  _id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  order: number;
}

export interface MenuItem {
  _id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  category: Category | string;
  price: number;
  cookingTimeMinutes: number;
  tags: string[];
  allergens: string[];
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  isGrilled: boolean;
  imageUrl?: string;
  isAvailable: boolean;
  cookingLevels: string[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  cookingLevel?: string;
  notes?: string;
}

export interface Table {
  _id: string;
  number: number;
  zone: string;
  capacity: number;
  status: string;
  qrCode: string;
}

export interface Buffet {
  _id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  pricePerPerson: number;
  includedCategories: (Category | string)[];
  icon?: string;
  order?: number;
  isActive: boolean;
}

export interface Session {
  _id: string;
  table: Table;
  buffet?: Buffet;
  token: string;
  partySize: number;
  status: string;
  totalAmount: number;
  roundCount: number;
  openedAt: string;
}

export interface OrderItem {
  menuItem: MenuItem | string;
  name: string;
  quantity: number;
  cookingLevel?: string;
  notes?: string;
  status: string;
  estimatedMinutes?: number;
  unitPrice?: number;
  linePrice?: number;
  coveredByBuffet?: boolean;
}

export interface Order {
  _id: string;
  session: string;
  table: Table | string;
  roundNumber: number;
  items: OrderItem[];
  generalNotes?: string;
  status: string;
  totalAmount: number;
  sentAt: string;
  servedAt?: string;
  createdAt: string;
}

export interface Payment {
  _id: string;
  session: string;
  subtotal: number;
  tip: number;
  total: number;
  status: string;
  method?: string;
  stripeClientSecret?: string;
  paidAt?: string;
}

export interface LoginResponse {
  access_token: string;
  user: { id: string; name: string; email: string; role: string };
}

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeTables: number;
  avgRating: number;
  totalRatings: number;
  topItems: { name: string; quantity: number }[];
  topBuffets: { name: string; icon?: string; sessions: number; revenue: number }[];
  recentRatings: { rating: number; comment?: string; createdAt: string }[];
}
