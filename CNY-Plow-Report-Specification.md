# CNY Plow Report - MVP Specification & Implementation

## Executive Summary

**CNY Plow Report** is a community-powered road conditions app for Central New York. Users can view and submit real-time reports about road conditions (clear, wet, slush, snow, ice, whiteout) and passability (OK, slow, avoid). The app helps drivers make informed decisions before heading out in winter weather.

---

## H) Future Enhancements List

### Phase 2 (Weeks 2-4)
1. **Drive Mode / Routing**
   - Enter start/end addresses
   - Show route with reports overlaid
   - Highlight risky segments
   - Suggest alternative routes

2. **Push Notifications**
   - Alert when watched roads get "avoid" reports
   - Storm warnings integration
   - Daily digest of local conditions

3. **Photo Blur Tool**
   - Allow users to blur faces/plates before submitting
   - AI-assisted auto-blur for privacy

4. **Official Plow Data Integration**
   - Research NYSDOT 511 API
   - Contact Onondaga County DPW
   - Display official plow routes on map

### Phase 3 (Month 2)
1. **Native Mobile Apps**
   - React Native or Expo wrapper
   - Better camera integration
   - Background location for auto-reports

2. **Weather Integration**
   - Current conditions overlay
   - Storm forecasts
   - Correlate reports with weather data

3. **Gamification**
   - Leaderboards for top reporters
   - Badges for milestones
   - Seasonal challenges

4. **Analytics Dashboard**
   - Heatmaps of bad conditions
   - Time-series analysis
   - Export data for municipalities

### Phase 4 (Month 3+)
1. **Partnerships**
   - Local news stations
   - Municipal DPW departments
   - Insurance companies
   - Rideshare services

2. **Monetization (if needed)**
   - Premium features (no ads, advanced routing)
   - B2B API for logistics companies
   - Sponsored road segments

3. **Expansion**
   - Other lake-effect regions (Buffalo, Erie PA)
   - Colorado mountains
   - New England

---

## Technology Justification

### Why Next.js + MapLibre + Supabase?

| Requirement | Solution | Why |
|-------------|----------|-----|
| Fastest MVP | Next.js 14 | Full-stack in one repo, instant deploys to Vercel |
| Free maps | MapLibre + Stadia | Unlimited free tiles, no API limits |
| Auth + DB + Storage | Supabase | All-in-one backend, generous free tier |
| Mobile-friendly | PWA | Install to home screen, works offline |
| Scale for storms | Edge functions + CDN | Vercel handles traffic spikes automatically |
| PostGIS for geo | Supabase Postgres | Native spatial queries, indexes |

### Alternatives Considered

- **React Native + Firebase**: Better native UX but 2x development time
- **Flutter + Firebase**: Good cross-platform but smaller talent pool
- **Mapbox**: Better maps but costs money at scale

---

## Cost Estimate

### Free Tier Limits

| Service | Free Tier | Our Usage (Est.) |
|---------|-----------|-----------------|
| Vercel | 100GB bandwidth, 100 hours compute | ~50GB/mo in winter |
| Supabase | 500MB DB, 1GB storage, 50K MAU | ~200MB DB, 500MB photos |
| Stadia Maps | 200K tiles/day | ~50K tiles/day peak |

### Estimated Monthly Costs

- **Normal winter month**: $0 (within free tiers)
- **Major storm surge**: ~$20-50 (Vercel bandwidth overage)
- **Sustained growth (10K users)**: ~$25/mo Supabase Pro

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Spam/abuse | Rate limits, trust scoring, auto-hide flagged content |
| Inaccurate reports | Confirmation system, decay over time, multiple sources |
| Privacy concerns | EXIF stripping, no location history, blur tool (future) |
| Legal liability | Clear disclaimers, community-sourced labeling |
| Winter traffic spikes | Edge caching, CDN, read-heavy architecture |
| User adoption | Focus on core value, partner with local media |

---

## Success Metrics

### MVP (Week 1)
- [ ] 50 reports submitted
- [ ] 10 registered users
- [ ] App loads in <2 seconds
- [ ] No critical bugs

### Month 1
- [ ] 500 reports total
- [ ] 100 registered users
- [ ] 80% of reports have photos
- [ ] Average 2+ confirmations per report

### Season 1
- [ ] 5,000 reports
- [ ] 1,000 users
- [ ] Featured on local news
- [ ] Partnership with 1 municipality

---

## Files Delivered

```
cny-plow-report/
├── README.md                 # Setup instructions
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind config
├── next.config.js            # Next.js config
├── .env.example              # Environment template
├── .gitignore
├── public/
│   └── manifest.json         # PWA manifest
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
└── src/
    ├── app/
    │   ├── layout.tsx        # Root layout
    │   ├── page.tsx          # Home page
    │   ├── globals.css       # Global styles
    │   ├── providers.tsx     # React Query provider
    │   ├── middleware.ts     # Auth middleware
    │   ├── auth/callback/    # OAuth callback
    │   ├── report/[id]/      # Report detail page
    │   ├── admin/            # Admin panel
    │   └── api/
    │       ├── reports/      # Reports API
    │       └── photos/       # Photo upload API
    ├── components/
    │   ├── Header.tsx
    │   ├── MainView.tsx
    │   ├── MapView.tsx
    │   ├── FeedView.tsx
    │   ├── ReportCard.tsx
    │   ├── PostModal.tsx
    │   ├── FilterSheet.tsx
    │   ├── AuthModal.tsx
    │   ├── BottomNav.tsx
    │   └── Disclaimer.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   └── useReports.ts
    ├── lib/
    │   ├── store.ts          # Zustand state
    │   ├── utils.ts          # Helpers
    │   └── supabase/
    │       ├── client.ts
    │       ├── server.ts
    │       └── middleware.ts
    └── types/
        └── index.ts          # TypeScript types
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Add Supabase credentials to .env.local

# 4. Run database migration in Supabase SQL Editor

# 5. Start development server
npm run dev
```

---

## Contact

Built for Central New York. Stay safe out there! 🚗❄️
