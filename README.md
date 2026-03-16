# Estimating Hub — Deployment Guide

## What you need
- A free Vercel account (vercel.com)
- A free GitHub account (github.com)
- This folder of files

---

## Step 1 — Create a GitHub repository

1. Go to github.com and sign in (or sign up free)
2. Click the green **New** button (top left)
3. Name it `estimating-hub`
4. Leave everything else as default
5. Click **Create repository**
6. On the next page, click **uploading an existing file**
7. Drag ALL the files and folders from this ZIP into the upload area
8. Click **Commit changes**

---

## Step 2 — Deploy to Vercel

1. Go to vercel.com and sign in with GitHub
2. Click **Add New Project**
3. Find `estimating-hub` in the list and click **Import**
4. Click **Deploy** (leave all settings as default)
5. Wait ~60 seconds — Vercel builds your app
6. You'll see a green tick and a live URL like `estimating-hub.vercel.app`

---

## Step 3 — Add the database (Vercel KV)

Your app needs a database to save data. Vercel gives you one free.

1. In Vercel, open your project dashboard
2. Click the **Storage** tab
3. Click **Create Database**
4. Choose **KV** (Redis)
5. Name it `estimating-kv`, click **Create**
6. Click **Connect to Project** → select `estimating-hub` → **Connect**
7. Go to **Settings** → **Environment Variables** — you'll see `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` were added automatically
8. Go to **Deployments** → click the three dots on your latest deployment → **Redeploy**

That's it. Your app is live with a real database.

---

## Your live URL

After deployment, your app lives at:
`https://estimating-hub-[random].vercel.app`

You can set a custom domain in Vercel → Project Settings → Domains.

---

## Adding team members

Share the URL with your team — anyone with the link can access it.

To add password protection (optional):
1. In Vercel, go to Project Settings → Security
2. Enable **Password Protection**
3. Set a password your team will use

---

## Updating the app

If you need to change anything later:
1. Edit the files
2. Upload the changed files to GitHub (same way as Step 1)
3. Vercel automatically redeploys within ~60 seconds

---

## Need help? 

Ask Claude to help with any step — just paste the error message you see.
