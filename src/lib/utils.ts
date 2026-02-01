import { clsx, type ClassValue } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import type { RoadCondition, Passability, County } from '@/types';

// Class name utility
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format relative time
export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// Get condition color
export function getConditionColor(condition: RoadCondition): string {
  const colors: Record<RoadCondition, string> = {
    clear: '#22c55e',
    wet: '#3b82f6',
    slush: '#f59e0b',
    snow: '#f97316',
    ice: '#ef4444',
    whiteout: '#7c3aed',
  };
  return colors[condition];
}

// Get passability color
export function getPassabilityColor(passability: Passability): string {
  const colors: Record<Passability, string> = {
    ok: '#22c55e',
    slow: '#f59e0b',
    avoid: '#ef4444',
  };
  return colors[passability];
}

// Get condition emoji
export function getConditionEmoji(condition: RoadCondition): string {
  const emojis: Record<RoadCondition, string> = {
    clear: '🟢',
    wet: '🔵',
    slush: '🟡',
    snow: '🟠',
    ice: '🔴',
    whiteout: '🟣',
  };
  return emojis[condition];
}

// Get passability icon
export function getPassabilityIcon(passability: Passability): string {
  const icons: Record<Passability, string> = {
    ok: '✓',
    slow: '⚠',
    avoid: '✕',
  };
  return icons[passability];
}

// Format county name
export function formatCounty(county: County): string {
  return county.charAt(0).toUpperCase() + county.slice(1);
}

// Calculate confidence score (simplified version)
export function calculateConfidence(
  upvotes: number,
  confirmations: number,
  userTrustScore: number,
  ageMinutes: number
): number {
  // Base confidence from user trust
  let confidence = Math.min(0.3 + (userTrustScore / 100) * 0.3, 0.6);
  
  // Boost from confirmations (most important)
  confidence += Math.min(confirmations * 0.15, 0.3);
  
  // Small boost from upvotes
  confidence += Math.min(upvotes * 0.02, 0.1);
  
  // Decay over time
  const decayFactor = Math.max(0, 1 - (ageMinutes / 240)); // Full decay at 4 hours
  confidence *= decayFactor;
  
  return Math.min(Math.max(confidence, 0), 1);
}

// Determine if report should auto-expire based on conditions
export function getExpirationHours(condition: RoadCondition): number {
  const hours: Record<RoadCondition, number> = {
    clear: 2,      // Clear roads can change fast
    wet: 3,
    slush: 3,
    snow: 4,
    ice: 4,        // Ice persists longer
    whiteout: 2,   // Whiteouts change fast
  };
  return hours[condition];
}

// Validate coordinates are within CNY bounds
export function isWithinCNYBounds(lat: number, lng: number): boolean {
  return lat >= 42.5 && lat <= 44.0 && lng >= -77.0 && lng <= -75.0;
}

// Rate limiting helper (for client-side)
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests: number[] = [];
  
  return {
    canMakeRequest(): boolean {
      const now = Date.now();
      // Remove old requests
      while (requests.length > 0 && requests[0] < now - windowMs) {
        requests.shift();
      }
      return requests.length < maxRequests;
    },
    recordRequest(): void {
      requests.push(Date.now());
    },
  };
}

// Sanitize user input
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .slice(0, 500); // Limit length
}

// Generate a readable location name from coordinates (placeholder)
export function generateLocationName(lat: number, lng: number): string {
  // In production, this would use reverse geocoding
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
