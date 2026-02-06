# Blog Analytics Setup Guide

## 1. Supabase Database Setup

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Open the SQL Editor (left sidebar)
3. Create a new query and paste the contents of `supabase-schema.sql`
4. Click "Run" to create all tables and policies

## 2. Get Your Supabase Anon Key

1. In Supabase dashboard, go to **Settings > API**
2. Copy the **anon public** key (starts with `eyJ...`)
3. The project URL is already set: `https://kfggnsmgpuakjzrhzkwp.supabase.co`

## 3. Set Environment Variables

### Local Development
Create a `.env` file in the project root:
```
PUBLIC_SUPABASE_URL=https://kfggnsmgpuakjzrhzkwp.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Vercel Deployment
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add both variables:
   - `PUBLIC_SUPABASE_URL` = `https://kfggnsmgpuakjzrhzkwp.supabase.co`
   - `PUBLIC_SUPABASE_ANON_KEY` = your anon key

## 4. Create Admin User

1. In Supabase dashboard, go to **Authentication > Users**
2. Click "Add user" > "Create new user"
3. Enter your email and a strong password
4. This account will be used to access `/admin/analytics`

## 5. Deploy

```bash
npm install
npm run build
# Push to GitHub to trigger Vercel deploy
```

## 6. Access Analytics

Visit: `https://icode4freedom.com/admin/analytics`

Log in with the admin user you created.

---

## What Gets Tracked

| Metric | Description |
|--------|-------------|
| Page Views | Every page load |
| Unique Visitors | Fingerprint-based (no cookies) |
| Time on Page | Seconds spent reading |
| Scroll Depth | How far down the user scrolled (%) |
| Read Complete | Scrolled 90%+ of the page |
| Bounce Rate | Left without scrolling 25%+ or staying 10s+ |
| Shares | Share button clicks |
| Subscribes | Newsletter form submissions |
| External Links | Clicks on external links |
| Referrers | Where traffic comes from |

## Privacy Notes

- No cookies used for tracking
- Visitor IDs are browser fingerprints (not personally identifiable)
- Data is stored in your Supabase database (you own it)
- RLS policies ensure only authenticated users can read analytics
