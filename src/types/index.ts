// Database types matching Supabase schema

export type RoadCondition = 'clear' | 'wet' | 'slush' | 'snow' | 'ice' | 'whiteout';
export type Passability = 'ok' | 'slow' | 'avoid';
export type County = 'onondaga' | 'oswego' | 'madison' | 'cayuga' | 'oneida' | 'cortland';
export type UserRole = 'user' | 'moderator' | 'admin';
export type ReportStatus = 'active' | 'hidden' | 'deleted';
export type FlagReason = 'spam' | 'inaccurate' | 'inappropriate' | 'privacy' | 'other';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  role: UserRole;
  trust_score: number;
  report_count: number;
  accurate_count: number;
  created_at: string;
  banned_at: string | null;
  ban_reason: string | null;
}

export interface Report {
  id: string;
  user_id: string | null;
  location: {
    lat: number;
    lng: number;
  };
  location_name: string | null;
  county: County;
  road_name: string | null;
  condition: RoadCondition;
  passability: Passability;
  notes: string | null;
  photo_urls: string[];
  upvote_count: number;
  confirmation_count: number;
  comment_count: number;
  flag_count: number;
  confidence_score: number;
  status: ReportStatus;
  created_at: string;
  last_confirmed_at: string;
  expires_at: string;
  // Joined fields
  user?: Pick<Profile, 'username' | 'trust_score'>;
}

export interface Comment {
  id: string;
  report_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  user?: Pick<Profile, 'username' | 'trust_score'>;
}

export interface Upvote {
  id: string;
  report_id: string;
  user_id: string;
  created_at: string;
}

export interface Confirmation {
  id: string;
  report_id: string;
  user_id: string;
  created_at: string;
}

export interface Flag {
  id: string;
  report_id: string;
  user_id: string | null;
  reason: FlagReason;
  details: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

// API types
export interface ReportsQuery {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  county?: County;
  condition?: RoadCondition;
  passability?: Passability;
  minutes?: 15 | 30 | 60 | 120;
  cursor?: string;
  limit?: number;
}

export interface CreateReportInput {
  lat: number;
  lng: number;
  location_name?: string;
  county: County;
  road_name?: string;
  condition: RoadCondition;
  passability: Passability;
  notes?: string;
  photo_ids?: string[];
}

// Map types
export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface ClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string;
}

export interface ReportPoint {
  type: 'Feature';
  properties: Report & ClusterProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

// UI types
export interface FilterState {
  minutes: 15 | 30 | 60 | 120;
  county: County | 'all';
  condition: RoadCondition | 'all';
  passability: Passability | 'all';
}

// Constants
export const COUNTIES: { value: County; label: string }[] = [
  { value: 'onondaga', label: 'Onondaga' },
  { value: 'oswego', label: 'Oswego' },
  { value: 'madison', label: 'Madison' },
  { value: 'cayuga', label: 'Cayuga' },
  { value: 'oneida', label: 'Oneida' },
  { value: 'cortland', label: 'Cortland' },
];

export const CONDITIONS: { value: RoadCondition; label: string; color: string; emoji: string }[] = [
  { value: 'clear', label: 'Clear', color: '#22c55e', emoji: '🟢' },
  { value: 'wet', label: 'Wet', color: '#3b82f6', emoji: '🔵' },
  { value: 'slush', label: 'Slush', color: '#f59e0b', emoji: '🟡' },
  { value: 'snow', label: 'Snow', color: '#f97316', emoji: '🟠' },
  { value: 'ice', label: 'Ice', color: '#ef4444', emoji: '🔴' },
  { value: 'whiteout', label: 'Whiteout', color: '#7c3aed', emoji: '🟣' },
];

export const PASSABILITIES: { value: Passability; label: string; color: string; icon: string }[] = [
  { value: 'ok', label: 'OK to drive', color: '#22c55e', icon: '✓' },
  { value: 'slow', label: 'Slow down', color: '#f59e0b', icon: '⚠' },
  { value: 'avoid', label: 'Avoid', color: '#ef4444', icon: '✕' },
];

export const TIME_FILTERS: { value: 15 | 30 | 60 | 120; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
];

// Central NY bounds
export const CNY_BOUNDS = {
  north: 44.0,
  south: 42.5,
  east: -75.0,
  west: -77.0,
};

export const CNY_CENTER = {
  lat: 43.0481,
  lng: -76.1474,
};
