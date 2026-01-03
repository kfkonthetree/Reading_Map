export enum ScreenState {
  LANDING = 'LANDING',
  APP = 'APP',
}

export interface BookNode {
  id: string;
  label: string;
  x: number;
  y: number;
  connections: string[];
}

// Existing types preserved for compatibility
export interface Recommendation {
  title: string;
  author: string;
  reason: string;
  genre: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  recommendations?: Recommendation[];
}

// --- New Types for Reading Map ---

export interface GeoLocation {
  lat: number;
  lng: number;
  name: string; // e.g. "Aracataca, Colombia"
  regionCode?: string; // e.g. "CN-33" (Zhejiang) or "FR" (France). For MVP using 3-letter ISO for countries, and specific names for China provinces
  isDomestic?: boolean;
}

export interface ReadingBook {
  id: string;
  title: string;
  author: string;
  coverImage?: string; 
  location: GeoLocation;
  summary: string;
  year: string; // Can be published year
  
  // New Fields
  startDate: string; // ISO "2024-02-15" for sorting
  displayDate: string; // "2024.02" for UI
  oneLiner: string; // Short poetic quote/description
}

export interface JourneyData {
  books: ReadingBook[];
  summaryComment: string; // The romantic summary for the postcard
  totalDistance?: number;
}