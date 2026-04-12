# ForgetMeNot — Backend

Backend infrastructure for the gamified task and habit tracking application. Built on an event-driven microservices architecture running on Google Cloud Platform.

---

## Table of Contents

- [Application Specifications](#application-specifications)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Services](#services)
- [Project Structure](#project-structure)
- [Inter-Service Communication](#inter-service-communication)
- [Environment Variables](#environment-variables)
- [Setup and Running](#setup-and-running)
- [CI/CD and Deployment](#cicd-and-deployment)

---

## Application Specifications

### Architecture

**Type:** Microservices  
Each service is independently deployable, maintains its own Firestore collections, and has no shared in-process state with other services. Services communicate asynchronously via Google Cloud Pub/Sub and synchronously via direct HTTP calls. There is no API gateway; the mobile client calls each service directly using its Cloud Run URL.

**Deployment Unit:** One Docker container per service, deployed to Google Cloud Run  
**Scaling:** Each service scales independently from zero based on traffic  
**Data Isolation:** No cross-service database joins; each service owns its data and exposes it via API

---

### Business Logic Specifications

#### Reward System

- **Trigger:** A task or habit is marked as complete by the user.
- **Rule:** On each completion event, the system publishes a Pub/Sub message to the Garden Service.
- **Reward values:** `+5 coins`, `+1 water unit` per completion.
- **Constraint:** Rewards are published only once per completion. Re-completion of an already-completed item does not re-award.
- **Consumer:** Garden Service subscribes to these events and credits the user's garden balance.

#### Habit Streak Calculation

- **Definition:** A streak is the count of consecutive days on which a habit was completed.
- **Rule:** If a habit is not completed on a scheduled day, the streak resets to 0.
- **Partial days:** A habit is considered completed for a day if it is marked complete at any time within that calendar day (midnight to midnight in the user's local timezone).
- **Progress window:** Default progress view covers the last 7 days; the client may request a custom range.

#### Flower Growth Lifecycle

- **Stages:** `seed` → `growing` → `bloomed` → `harvested`
- **Rule:** Each flower type has a fixed watering requirement to advance between stages. Failure to water within the defined period causes the flower to enter a `dead` state.
- **Watering:** Watering consumes 1 water unit from the garden balance. If balance is 0, the watering action is rejected.
- **Harvest:** A bloomed flower can be harvested; it leaves the garden slot and optionally moves to the display showcase.
- **Purchase:** Flowers are purchased with coins. Insufficient coin balance blocks the purchase.

#### Notification Scheduling

- **Scheduling engine:** Google Cloud Tasks — notifications are enqueued with a future execution time.
- **Sources:** Every notification is linked to a source (`TASK`, `HABIT`, `FLOWER`, `SYSTEM`). Deleting the source cascades to delete associated notifications.
- **Enable/Disable:** Notifications can be toggled without deletion. Disabled notifications remain in Firestore but are not dispatched.
- **Personalization:** Before dispatch, the Notification Service calls the AI Service to generate a context-aware message body based on the user's current habit, task, and garden state.
- **Click tracking:** Each notification click is recorded for analytics.

#### Calendar Conflict Detection

- **Rule:** When a task or habit event is added to the calendar, the Calendar Service checks for time overlaps with existing events from any source (tasks, habits, external Google Calendar).
- **Conflict resolution:** The system surfaces conflicts to the user with resolution suggestions. The user may reschedule or accept the overlap.
- **External sync:** Google Calendar events are pulled periodically by the Calendar Sync Job and stored in Firestore. These events participate in conflict detection.

#### Authentication and Authorization

- **Flow:** The mobile client authenticates with Firebase, then exchanges the Firebase ID token for a backend JWT via the Auth Service. All subsequent requests to backend services use this JWT.
- **Token validation:** Every protected endpoint validates the JWT signature and expiry. An invalid or expired token returns `401`.
- **Google Calendar scope:** During Google Sign-In, the user is prompted for Google Calendar access. The granted OAuth token is stored and used by the Calendar Service for Google Calendar API calls.
- **Internal service calls:** Calls between services (e.g., Notification → AI Service) use internal authentication headers, not user JWTs.

#### Award Unlock

- **Trigger:** Habit or task completion events published to Pub/Sub.
- **Rule:** The Awards Consumer evaluates unlock criteria for each event. If criteria are met (e.g., "complete 7 habits in a row"), the award is unlocked and recorded in Firestore.
- **Idempotency:** An already-unlocked award cannot be unlocked again.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      Mobile Client                        │
└──────────────────────┬───────────────────────────────────┘
                        │ HTTPS
           ┌────────────▼────────────┐
           │       Auth Service       │
           │  (JWT / Firebase / OAuth)│
           └────────────┬────────────┘
                        │ JWT Token
         ┌──────────────┼──────────────────────────┐
         │              │                           │
    ┌────▼────┐   ┌─────▼─────┐   ┌───────────────▼────┐
    │  User   │   │   Task    │   │      Habit          │
    │ Service │   │  Service  │   │      Service        │
    └─────────┘   └─────┬─────┘   └──────────┬─────────┘
                         │                    │
                         └────────┬───────────┘
                                  │ Pub/Sub
                       ┌──────────▼──────────┐
                       │   Calendar Service  │
                       │  (+ Event Consumer) │
                       └─────────────────────┘
                                  │
           ┌──────────────────────┼──────────────────┐
           │                      │                   │
    ┌──────▼──────┐     ┌─────────▼───┐   ┌──────────▼─────┐
    │ Notification│     │   Garden    │   │    Awards       │
    │   Service  │     │   Service   │   │    Service      │
    └──────┬──────┘     └─────────────┘   └────────────────┘
           │
    ┌──────▼──────┐
    │  AI Service │
    └─────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript 5.x |
| **Runtime** | Node.js 18–22 |
| **Web Framework** | Express.js 5.x |
| **Database** | Google Cloud Firestore |
| **Message Queue** | Google Cloud Pub/Sub |
| **Task Scheduling** | Google Cloud Tasks |
| **Authentication** | Firebase Admin SDK, JWT, Google OAuth 2.0 |
| **Validation** | Zod |
| **HTTP Client** | Axios |
| **Logging** | Winston |
| **Security** | bcryptjs, express-rate-limit, CORS |
| **Date/Time** | dayjs |
| **Containerization** | Docker (node:18-slim) |
| **Hosting** | Google Cloud Run (europe-west1) |
| **CI/CD** | CircleCI (monorepo path-filtering) |

---

## Services

### 1. Auth Service

**Location:** `services/auth` | **Port:** 8080

Handles user authentication and authorization. Integrates Firebase Authentication and Google OAuth 2.0. On successful login, issues a backend JWT used by all other services.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/firebase` | Exchange Firebase ID token for a backend JWT |
| `POST` | `/auth/google` | Google OAuth login (includes Google Calendar scope) |
| `GET` | `/auth/me` | Get current user profile *(JWT required)* |

---

### 2. User Service

**Location:** `services/user` | **Port:** 8080

Manages user profiles, Firebase Cloud Messaging (FCM) tokens, and notification preferences.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/users` | Create a new user |
| `GET` | `/users/:userId` | Get user profile |
| `PUT` | `/users/:userId` | Update user information |
| `PATCH` | `/users/:userId/permissions` | Update user permissions |
| `DELETE` | `/users/:userId` | Delete user |
| `POST` | `/users/:userId/fcm-token` | Register FCM token for push notifications |
| `POST` | `/users/:userId/allow-notification` | Toggle notification preference |

---

### 3. Task Service

**Location:** `services/task` | **Port:** 8080

Creates, manages, and tracks tasks including location-based reminders. On completion, publishes reward events via Pub/Sub and dispatches a calendar event.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/task/user/:userId` | Get all tasks for a user |
| `GET` | `/task/:taskId` | Get a single task |
| `POST` | `/task/:userId` | Create a new task |
| `PATCH` | `/task/:taskId` | Update a task |
| `DELETE` | `/task/:taskId` | Delete a task |
| `POST` | `/task/:userId/:taskId/complete` | Mark task as complete |
| `GET` | `/task/:userId/today/completed` | Today's completed tasks |
| `GET` | `/task/:userId/today/pending` | Today's pending tasks |
| `GET` | `/task/:userId/today/stats` | Daily statistics |
| `GET` | `/task/:userId/overall/stats` | Overall statistics |

---

### 4. Habit Service

**Location:** `services/habit` | **Port:** 8080 | **Node:** 22

Manages daily habits, progress tracking, and streak calculation. Shares the same reward structure as the Task Service.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/habit/create/:userId` | Create a new habit |
| `GET` | `/habit/get/:userId` | Get active habits |
| `GET` | `/habit/get/:userId/:habitId` | Get a specific habit |
| `PATCH` | `/habit/update/:userId/:habitId` | Update a habit |
| `DELETE` | `/habit/delete/:userId/:habitId` | Delete a habit |
| `POST` | `/habit/complete/:habitId` | Mark habit as complete |
| `GET` | `/habit/progress/:habitId` | Progress history (default: 7 days) |
| `GET` | `/habit/completed-today/:habitId` | Check if completed today |

---

### 5. Garden Service

**Location:** `services/garden` | **Port:** 8080

The gamification engine of the application. Manages the virtual garden including flower planting, watering, harvesting, character equipment, and the display showcase.

**Garden:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/garden` | Create garden |
| `GET` | `/garden/:userId` | Get garden state |
| `PATCH` | `/garden/:userId/water` | Water the garden |
| `PATCH` | `/garden/:userId/add-water` | Add water units |
| `PATCH` | `/garden/:userId/add-coins` | Add coins |
| `DELETE` | `/garden/:userId` | Delete garden |

**Flowers:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/garden/:userId/flowers` | Get all flowers |
| `GET` | `/garden/:userId/flowers/bloomed` | Get bloomed flowers |
| `POST` | `/garden/:userId/flowers/purchase` | Purchase a flower |
| `PATCH` | `/garden/:userId/flowers/:flowerId/plant` | Plant a flower |
| `PATCH` | `/garden/:userId/flowers/:flowerId/water` | Water a flower |
| `PATCH` | `/garden/:userId/flowers/:flowerId/inventory` | Move to inventory |
| `PATCH` | `/garden/:userId/flowers/:flowerId/kill` | Kill a flower |
| `DELETE` | `/garden/:userId/flowers/:flowerId` | Remove a flower |

Character equipment (purchase, equip, unequip) and the 3-slot display showcase also live in this service.

---

### 6. Calendar Service

**Location:** `services/calendar` | **Port:** 8080

Provides a unified calendar view combining tasks and habits, detects scheduling conflicts, and syncs with Google Calendar. Composed of three components:

**calendar-service (REST API)**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/calendar/internal/project-habits` | Project habit events *(internal)* |
| `GET` | `/calendar/:userId/events` | Get user's calendar events |
| `GET` | `/calendar/:userId/conflicts` | List scheduling conflicts |
| `POST` | `/calendar/:userId/conflicts/resolve` | Resolve a conflict |

**calendar-event-consumer** — Cloud Function. Subscribes to the `calendar-events` Pub/Sub topic; stores and handles deletion of task/habit events in Firestore.

**calendar-sync-job** — Scheduled job. Periodically pulls Google Calendar events into Firestore for conflict detection.

---

### 7. Notification Service

**Location:** `services/notification` | **Port:** 8080

Central notification management and scheduling via Google Cloud Tasks. Delivers push notifications through Firebase Cloud Messaging (FCM).

**Source Types:** `HABIT` | `TASK` | `FLOWER` | `SYSTEM`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notifications/internal/notifications/dispatch` | Dispatch a notification *(internal)* |
| `POST` | `/notifications/click` | Record notification click |
| `GET` | `/notifications/user/:userId` | Get user notifications *(filterable by sourceType)* |
| `GET` | `/notifications/user/:userId/active` | Get active notifications |
| `POST` | `/notifications/:userId` | Create a notification |
| `PATCH` | `/notifications/:notificationId` | Update a notification |
| `PATCH` | `/notifications/:notificationId/enable` | Enable a notification |
| `PATCH` | `/notifications/:notificationId/disable` | Disable a notification |
| `DELETE` | `/notifications/:notificationId` | Delete a notification |
| `DELETE` | `/notifications/:notificationId/soft` | Soft-delete (hide) |
| `DELETE` | `/notifications/source/:sourceId` | Delete by source ID |
| `GET` | `/notifications/task/:sourceId/reminders` | Get task reminder times |
| `PATCH` | `/notifications/task/:sourceId/reminders` | Update reminder times |

---

### 8. Awards Service

**Location:** `services/awards`

Manages the achievement and badge system via two components:

**awards-create-get (REST API)**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/awards/:userId` | Create an award |
| `GET` | `/awards/:userId` | Get user's awards |
| `PATCH` | `/awards/:awardId` | Update an award |
| `DELETE` | `/awards/:awardId` | Delete an award |

**awards-consumer** — Pub/Sub consumer. Listens to task and habit completion events, evaluates unlock criteria, and records newly unlocked achievements in Firestore. Already-unlocked awards cannot be unlocked again.

---

### 9. AI Service

**Location:** `services/ai` | **Port:** 8080

Analyzes the user's habit, task, and garden state to generate context-aware notification messages. Called exclusively by the Notification Service before dispatching.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ai/health` | Service health check |
| `GET` | `/ai/internal/context/users/:userId` | Build user context *(internal)* |
| `POST` | `/ai/notifications/generate` | Generate notification message *(internal)* |

---

### 10. Strapi CMS

**Location:** `services/strapi-cms`

Headless CMS for managing static content such as default task and habit templates. Frontend and other services fetch content from here.

---

## Project Structure

```
ForgetMeNot-BE/
├── .circleci/
│   ├── config.yml                     # Monorepo path-filtering main config
│   ├── monorepo-pipeline-dev.yml
│   └── monorepo-pipeline-prod.yml
├── config/prod/                       # Cloud Run env var definitions
├── docker/dev/                        # Dev scripts: run.sh, clean.sh, update.sh
├── lib/middlewares/
│   └── rateLimitMiddleware.ts         # Shared rate limit middleware
├── services/
│   ├── auth/
│   ├── user/
│   ├── task/
│   ├── habit/
│   ├── garden/
│   ├── calendar/
│   │   ├── calendar-service/
│   │   ├── calendar-event-consumer/
│   │   └── calendar-sync-job/
│   ├── notification/
│   ├── awards/
│   │   ├── awards-create-get/
│   │   └── awards-consumer/
│   ├── ai/
│   └── strapi-cms/
└── README.md
```

Each service follows the same internal structure: `routes → controllers → services → repositories → Firestore`.

---

## Inter-Service Communication

### Pub/Sub Topics

| Topic | Publisher | Subscriber | Description |
|-------|-----------|------------|-------------|
| `calendar-events` | Task, Habit | Calendar Event Consumer | Task/habit calendar events |
| Reward events | Task, Habit | Garden Service | Coin and water credits on completion |
| Completion events | Task, Habit | Awards Consumer | Achievement unlock triggers |

### Direct HTTP Calls

| Caller | Target | Purpose |
|--------|--------|---------|
| Task Service | Notification Service | Create/delete task notifications |
| Habit Service | Notification Service | Create/delete habit notifications |
| Notification Service | AI Service | Generate personalized message body |
| Notification Service | Garden Service | Flower state notifications |

---

## Environment Variables

Each service reads from its own `.env` file in development and from Cloud Run environment configuration in production. See each service's `.env.example` for the full list.

### Common Variables (All Services)

```env
PORT=8080
ENVIRONMENT=dev
API_NAME=service-name
FIREBASE_SERVICE_ACCOUNT='{...}'
GCP_PROJECT_ID=forgetmenot-477816
GOOGLE_APPLICATION_CREDENTIALS=./path/service-account.json
```

### Auth Service

```env
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Task / Habit Services

```env
NOTIFICATION_SERVICE_URL=https://notification-service-url
CALENDAR_TOPIC=calendar-events
```

### Notification Service

```env
GOOGLE_CLOUD_TASKS_QUEUE=notification-queue
CLOUD_TASKS_LOCATION=europe-west1
NOTIFICATION_DISPATCH_URL=https://...
AI_SERVICE_URL=https://ai-service-url
GARDEN_SERVICE_URL=https://garden-service-url
```

---

## Setup and Running

### Prerequisites

- Node.js 18+ (Node 22 for Habit Service)
- Docker and Docker Compose
- Firebase project with service account JSON
- Google Cloud SDK (`gcloud` CLI)

### Run a Single Service

```bash
cd services/auth
npm install
cp temp/.env.example temp/.env
npm run dev
```

### Run All Services with Docker

```bash
cd docker/dev && ./run.sh
```

### npm Scripts

```bash
npm run dev      # Hot-reload development (ts-node + nodemon)
npm run build    # Compile TypeScript
npm start        # Run compiled build
```

---

## CI/CD and Deployment

Uses CircleCI with **monorepo path-filtering** — only services with changed files are rebuilt and redeployed to Google Cloud Run (`europe-west1`). Services scale to zero automatically between requests.

**Pipeline steps:** detect changed services → build Docker image → push to Google Container Registry → deploy to Cloud Run.

## Additional Documentation

- [Technical Mapping](./TECHNICAL_MAPPING.md)
- [Releases](./RELEASES.md)