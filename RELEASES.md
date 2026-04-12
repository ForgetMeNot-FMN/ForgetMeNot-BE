# Backend Releases (VCTL-2)

This document tracks backend release history using Git tags.

---

## v1.0 — Core Backend
- Authentication (login & register)
- User & Garden services
- Initial microservice setup
- Firebase integration

---

## v1.1 — Habit System
- Habit service (CRUD operations)
- Habit progress tracking
- Streak calculation logic
- Docker & deployment setup

---

## v1.2 — Task & Flower System
- Task management (CRUD, stats, completion)
- Flower system (purchase, plant, water, lifecycle)
- DTO structures and service logic

---

## v1.2.1 — Rate Limiting Update
- Improved API rate limiting configuration

---

## v1.3 — Notification System
- Notification service implementation
- Scheduling & dispatch logic
- Notification CRUD operations
- Integration with Task & Habit services

---

## v1.3.1 — Notification Flow Fix
- Fixed create/cancel/delete notification flow

---

## v1.3.2 — Notification UUID Fix
- Fixed UUID version inconsistency in notification service

---

## v1.4 — Cloud Tasks & FCM
- Google Cloud Tasks integration
- Firebase Cloud Messaging (FCM) integration
- Async notification handling

---

## v1.4.1 — Notification Dispatcher Fix
- Fixed scheduling logic for notification dispatcher

---

## v1.5 — Calendar System
- Calendar service implementation
- Google Calendar integration
- Conflict detection system
- Event synchronization

---

## v1.5.1 — Calendar Conflict Fix
- Fixed event conflict detection and publishing logic

---

## v1.5.2 — Calendar Sync Fix
- Fixed Google Calendar sync range and logic

---

## v1.6 — Reward & Badge System
- Awards service implementation
- Pub/Sub integration for achievement system
- Reward evaluation logic

---

## v1.7 — AI Notification Engine
- Context-aware notification generation
- User context builder
- AI-based decision engine for notifications