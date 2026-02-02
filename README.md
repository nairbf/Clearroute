# CNY Plow Report

Community-powered road conditions and plow status for Central New York (Syracuse/Onondaga, Oswego, Madison, Cayuga, Oneida, Cortland counties).

## Features

- 🗺️ **Interactive Map** - View road conditions on a map with clustered markers
- 📋 **Feed View** - Browse recent reports in a scrollable feed
- 📸 **Photo Reports** - Submit photos with automatic EXIF stripping for privacy
- ✅ **Community Verification** - Upvote and confirm accurate reports
- 🎯 **Trust System** - Build reputation through accurate reporting
- 🔍 **Filters** - Filter by time, county, condition, and passability
- 📱 **Mobile-First** - Large touch targets, works in cold weather with gloves

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Map**: MapLibre GL + Stadia Maps (free tiles)
- **Backend**: Supabase (Postgres + PostGIS, Auth, Storage)
- **State**: Zustand + TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account (free tier works)
- A Stadia Maps account (free tier, optional)

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo>
   cd cny-plow-report
   npm install
   ```

2. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the database to be ready

3. **Run database migrations**
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL

4. **Create storage bucket**
   - In Supabase dashboard, go to Storage
   - Create a new bucket called `report-photos`
   - Set it to public
   - Add policies for viewing (anyone) and uploading (authenticated)

5. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

6. **Enable Google OAuth (optional)**
   - In Supabase dashboard, go to Authentication > Providers
   - Enable Google and add your OAuth credentials
   - Add callback URL: `https://your-domain.com/auth/callback`

7. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── reports/       # Reports CRUD
│   │   └── photos/        # Photo upload
│   ├── auth/              # Auth callback
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── AuthModal.tsx      # Login/signup modal
│   ├── BottomNav.tsx      # Bottom navigation
│   ├── Disclaimer.tsx     # Safety disclaimer
│   ├── FeedView.tsx       # Feed of reports
│   ├── FilterSheet.tsx    # Filter controls
│   ├── Header.tsx         # App header
│   ├── MainView.tsx       # Map/Feed switcher
│   ├── MapView.tsx        # Map with markers
│   ├── PostModal.tsx      # New report form
│   └── ReportCard.tsx     # Report display
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts         # Authentication
│   └── useReports.ts      # Report data fetching
├── lib/                   # Utilities
│   ├── store.ts           # Zustand store
│   ├── supabase/          # Supabase clients
│   └── utils.ts           # Helper functions
└── types/                 # TypeScript types
    └── index.ts
```

## API Endpoints

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List reports with filters |
| POST | `/api/reports` | Create new report |
| GET | `/api/reports/[id]` | Get single report |

### Photos

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/photos/upload` | Upload photo (EXIF stripped) |

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for full schema.

Key tables:
- `profiles` - User profiles with trust scores
- `reports` - Road condition reports
- `upvotes` - Report upvotes
- `confirmations` - "Still accurate" confirmations
- `comments` - Report comments
- `flags` - Abuse reports

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_STADIA_API_KEY` | Stadia Maps API key (optional; required for Stadia styles, otherwise fallback MapLibre demo tiles are used) |

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

MIT
