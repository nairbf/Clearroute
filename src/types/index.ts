// Road condition types
export type RoadCondition = 'clear' | 'wet' | 'slush' | 'snow' | 'ice' | 'whiteout';
export type Passability = 'ok' | 'slow' | 'avoid';
export type County = 'onondaga' | 'oswego' | 'madison' | 'cayuga' | 'oneida' | 'cortland';
export type ReportStatus = 'active' | 'hidden' | 'deleted' | 'expired';
export type UpdateType = 'plowed' | 'clearing' | 'worse' | 'same';

// Location
export interface Location {
  lat: number;
  lng: number;
}

// User profile
export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  trust_score: number;
  report_count: number;
  accurate_count: number;
  role: 'user' | 'moderator' | 'admin';
  banned_at?: string | null;
  ban_reason?: string | null;
  created_at: string;
}

// Report
export interface Report {
  id: string;
  user_id: string;
  location: Location | null;
  location_name?: string;
  road_name?: string;
  county: County;
  condition: RoadCondition;
  passability: Passability;
  notes?: string;
  photo_urls: string[];
  upvote_count: number;
  confirmation_count: number;
  comment_count: number;
  flag_count: number;
  confidence_score: number;
  status: ReportStatus;
  created_at: string;
  last_confirmed_at?: string;
  expires_at?: string;
  latest_update?: UpdateType | null;
  latest_update_at?: string | null;
  plowed_count?: number;
  user?: {
    username: string;
    trust_score: number;
  };
}

// Comment
export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    username: string;
    trust_score: number;
  };
}

// Road Update
export interface RoadUpdate {
  id: string;
  report_id: string;
  user_id: string;
  update_type: UpdateType;
  notes?: string;
  created_at: string;
  user?: {
    username: string;
  };
}

// Map viewport
export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

// Filter state
export interface FilterState {
  minutes: number;
  county: County | 'all';
  condition: RoadCondition | 'all';
  passability: Passability | 'all';
}

// Report query params
export interface ReportsQuery {
  minutes?: number;
  county?: County;
  condition?: RoadCondition;
  passability?: Passability;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  limit?: number;
  cursor?: string;
}

// Create report input
export interface CreateReportInput {
  lat: number;
  lng: number;
  location_name?: string;
  road_name?: string;
  county: County;
  condition: RoadCondition;
  passability: Passability;
  notes?: string;
  photo_urls?: string[];
}

// GeoJSON point for clustering
export interface ReportPoint {
  type: 'Feature';
  properties: Report & { cluster: boolean };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

// Constants
export const CNY_CENTER: Location = {
  lat: 43.0481,
  lng: -76.1474,
};

export const CONDITIONS: Array<{
  value: RoadCondition;
  label: string;
  emoji: string;
  color: string;
}> = [
  { value: 'clear', label: 'Clear', emoji: '🟢', color: '#22c55e' },
  { value: 'wet', label: 'Wet', emoji: '🔵', color: '#3b82f6' },
  { value: 'slush', label: 'Slush', emoji: '🟡', color: '#f59e0b' },
  { value: 'snow', label: 'Snow', emoji: '🟠', color: '#f97316' },
  { value: 'ice', label: 'Ice', emoji: '🔴', color: '#ef4444' },
  { value: 'whiteout', label: 'Whiteout', emoji: '🟣', color: '#8b5cf6' },
];

export const PASSABILITIES: Array<{
  value: Passability;
  label: string;
  icon: string;
  color: string;
}> = [
  { value: 'ok', label: 'OK to drive', icon: '✓', color: '#22c55e' },
  { value: 'slow', label: 'Slow down', icon: '⚠', color: '#f59e0b' },
  { value: 'avoid', label: 'Avoid', icon: '✕', color: '#ef4444' },
];

export const COUNTIES: Array<{
  value: County;
  label: string;
}> = [
  { value: 'onondaga', label: 'Onondaga' },
  { value: 'oswego', label: 'Oswego' },
  { value: 'madison', label: 'Madison' },
  { value: 'cayuga', label: 'Cayuga' },
  { value: 'oneida', label: 'Oneida' },
  { value: 'cortland', label: 'Cortland' },
];

export const TIME_FILTERS: Array<{
  value: number;
  label: string;
}> = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
];