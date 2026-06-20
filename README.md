<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="web/public/knowhere-logo-dark.svg">
    <img alt="Knowhere Logo" src="web/public/knowhere-logo-light.svg" width="120" height="120" style="margin-bottom: 20px;">
  </picture>
  <h1>Knowhere</h1>
  <p><b>Your Private Cosmic Collection</b></p>
  <p>A unified, personal hub for your links, notes, images, and documents—docked at a single set of Coords.</p>
  <p>
    <a href="#-welcome-to-knowhere">Overview</a> •
    <a href="#-key-features">Features</a> •
    <a href="#-how-it-works">How it Works</a> •
    <a href="#-for-developers">Developers</a>
  </p>
</div>

---

## Welcome to Knowhere

Forget managing complex folders and scattering your digital life across multiple apps. **Knowhere** is a singular, beautifully unified space to store everything that matters. Whether it's a quick note, an inspiring image, a crucial PDF, or a link you need to read later, Knowhere keeps it organized and instantly accessible.

No passwords to remember. No cluttered UI. Just your universe of information, perfectly organized.

## Why Knowhere?

- **Simplicity by Design:** A fluid, app-like experience that gets out of your way and lets you focus on your content.
- **Nebula:** The intelligence layer that actively watches what you search for and build, surfacing exactly the right knowledge right when you need it.
- **Uncompromising Motivation:** Stop procrastinating. Set Missions and let Knowhere send you intense push notifications to force you into action.
- **Privacy First:** Your data is yours. Protected by enterprise-grade security and accessible only via your unique access code.
- **Instant Access Anywhere:** Seamlessly transition between desktop and mobile. Your collection is always just a set of Coords away.

## Key Features

### Zero-Friction AI Tagging
Save anything. Drop links, write quick notes, or upload images. Knowhere's AI automatically analyzes, tags, and groups your resources. No manual organization required.

### Nebula: Intelligence Layer & Dashboard
Not just a dashboard of vanity metrics. Knowhere tracks your *Knowledge Activation Rate*, monitoring how effectively you turn saved links into completed projects, resurrected ideas, and true action.

### Just-in-Time Surfacing
Working on a new project? Knowhere watches your search intent and immediately surfaces similar discoveries from your vault. It remembers what you forgot, so you don't have to.

### Intent-Based Missions
Set specific missions for your saved content. Turn a chaotic inbox into a targeted action plan.

### Uncompromising Push Notifications
Knowhere doesn't let you forget. Tiered recommendation algorithms track knowledge decay, breaking your procrastination habits with intense push notifications.

### Instant "Coords" Access
Jump into your collection from any device using just your unique Coords (e.g., `AB-1234`). No more forgotten passwords or clunky login screens.

---

## How It Works

1. **Claim Your Coords:** Pick a unique, memorable identifier like `AB-1234`.
2. **Secure Your Space:** Add a recovery email (powered by secure passwordless login) so you never lose access.
3. **Start Collecting:** Drop links, write notes, or upload files directly into your space.
4. **Access Anywhere:** Type your Coords on any device to instantly enter your Knowhere.

---

## For Developers

Knowhere is an open-source SaaS built with a modern, high-performance TypeScript stack.

### Tech Stack
- **Frontend:** React 19, Vite, React Router, TanStack Query, Framer Motion
- **Backend:** Node.js, Express API, MongoDB Atlas
- **AI Integration:** Google Gemini API
- **Push Notifications:** Web Push API, Service Workers
- **Storage & Auth:** Firebase Storage, Firebase Authentication (Passwordless & Google SSO)
- **Monorepo:** Shared Zod schemas between client and server

### Architecture Highlights

- **Frictionless Authentication:** Daily logins use fast, secure Coords hashing via MongoDB. Firebase is utilized exclusively for Google SSO and secure, passwordless email recovery.
- **Secure File Handling:** Files are stored in Firebase Storage and streamed securely through an authenticated Express proxy.
- **Unified Data Model:** Shared TypeScript types and Zod schemas ensure end-to-end type safety across users, categories, and resources.

