---
description: How to deploy Supabase Edge Functions to production
---

# Deploying Edge Functions

Follow these steps to deploy your `send-email` function to the live Supabase project.

## 1. Login to Supabase CLI
If you haven't already logged in:
```powershell
npx supabase login
```

## 2. Link to Remote Project
You need your project Reference ID (get it from Supabase Dashboard > Project Settings > General).
```powershell
npx supabase link --project-ref your-project-id
```

## 3. Set Production Secrets
Upload your Resend API Key to the remote project:
```powershell
npx supabase secrets set RESEND_API_KEY=re_123456...
```

## 4. Deploy Functions
Deploy all functions (or specify one):
```powershell
npx supabase functions deploy send-email
```

## 5. Verify
Your function is now live! The frontend will automatically use the remote URL when built for production, or you can test it via the Supabase Dashboard.
