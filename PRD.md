# Product Requirements Document (PRD)

## Project name
Personal File Drop (working title) — a private file transfer web app for close friends/classmates.

## Problem statement
BTech students in college labs work on ethernet-connected PCs where internet works fine, but WhatsApp Web frequently fails to sync/login (QR-scan or server-side issues), making it hard to move code and files from lab PCs to personal devices. There's no reliable, low-friction alternative that doesn't depend on WhatsApp or require using a personal email/Google account on a shared lab machine (which raises privacy/security concerns).

## Goal
Build a minimal, self-hosted web app that lets a small trusted group (5–10 people) create their own username/password account and upload/download files from any device, without needing a real email address or third-party messaging app.

## Non-goals (explicitly out of scope for v1)
- Not a general-purpose cloud storage replacement (Dropbox/Drive competitor)
- Not solving offline/no-internet access — internet connectivity is assumed to work, just WhatsApp specifically is the pain point
- No real-time chat or messaging features
- No public sign-up — closed group only

## Target users
- The user (Ashraya) and a small group of close friends/classmates (single college, single lab environment)
- Technical comfort level: high (all are BTech students)

## Core user stories
1. As a new user, I can sign up with just a username and password (no email required), so I don't have to trust the app with my personal identity.
2. As a new user, while typing my desired username during signup, I get immediate feedback (like Gmail) if that username is already taken, so I don't submit the form only to fail.
3. As a returning user, I can log in from any device (lab PC, phone, home laptop) and stay logged in via a session.
4. As a logged-in user, I can upload one or more files from my current device.
5. As a logged-in user, I can see a list of my uploaded files with name, size, and upload date.
6. As a logged-in user, I can download any of my previously uploaded files from a different device.
7. As a logged-in user, I can delete files I no longer need.
8. As a user, I should never be able to see or access another user's files.

## Success criteria (MVP)
- A user can sign up, log in, upload a file from Device A, and download the same file from Device B within a single test session.
- No user can access another user's files (verified manually).
- Works on both desktop and mobile browsers without layout breaking.

## Feature scope

### MVP (v1)
- Username + password signup/login (no email)
- Real-time username availability check during signup (Gmail-style "already taken" message)
- File upload (single or multiple files)
- File list per user (name, size, upload date)
- File download
- File delete
- Responsive UI (mobile browser usable)

### v2 (nice-to-have, post-MVP)
- Shareable file links (send to someone without giving them an account)
- File expiry / auto-delete after N days
- Upload progress bar
- File preview (images/PDFs)
- Per-user storage quota

## Constraints
- Small user base (single-digit to low double-digit users) — no need to design for scale
- Free-tier hosting/storage budget (Supabase free tier: ~1GB storage)
- Built and maintained by a single student developer alongside coursework

## Risks
- Password security: since there's no email-based recovery, a forgotten password means permanent lockout unless a manual reset path is added later
- Storage limits: free-tier storage caps could be hit if files are large or numerous
- Single point of failure: no admin recovery UI in v1 if something breaks

## Open questions
- Should there be any password-reset mechanism in v1, or is "ask the admin (Ashraya) to manually reset in DB" acceptable for a small trusted group?
- Should file size be capped per upload to protect the free storage tier?
