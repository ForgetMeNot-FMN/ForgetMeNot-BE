# Backend Technical Tree Mapping

This document maps backend branches, features, and implementations to the technical tree.

---

## VCTL — Version Control

### VCTL-2 — Tagging Releases
- Implemented using Git tags:
  - v1.0 → v1.7 (major releases)
  - v1.x.x (patch fixes for critical systems)
- Applied on main branch commit history
- Represents backend system evolution milestones:
  - v1.0 → Core system (auth + user)
  - v1.3 → Notification system
  - v1.5 → Calendar integration
  - v1.7 → AI-based notification system

---

### VCTL-3 — Continuous Integration (Unit Test Automation)
- Automated checks executed in CI pipeline
- Ensures backend stability before deployment

---

## WAPP — Backend Application

### WAPP-2 — Authentication & Authorization
- Firebase Authentication integration
- JWT-based authorization
- Token validation middleware
- Secure access control for backend services

---

### WAPP-3 — Form & Data Validation
- Request validation using DTO/schema
- Data validation and serialization
- Ensures data consistency across services

---

### WAPP-4 — Backend API & Error Handling

**Architecture Pattern:**
- Routes → Controllers → Services → Repositories

**Implemented Features:**
- REST API endpoints per service
- Structured error handling
- Standardized API responses
- Service-to-service communication

---

### WAPP-6-1 — Async Backend Operations
- Background jobs and asynchronous processing (notifications, scheduled tasks)

---

### WAPP-6-2 — Service Health Endpoints
- Health check endpoints for backend services

---

## DTBS — Database

### DTBS-1-1 — Naming Conventions
- Consistent naming for Firestore collections and fields
- Standardized structure across services

---

### DTBS-1-4 — Exception Logging
- Logging of errors and failed operations
- Request/response level logging for debugging and monitoring

---

### DTBS-3-2 — Cloud Storage
- Use of Firebase/Cloud-based storage systems
- Persistent and scalable data handling

---

## TEST — Backend Quality & Testing

### TEST-1 — Manual Testing
- API endpoints manually tested during development
- Functional verification of backend behavior

---

### TEST-4 — Rate Limiting
- Middleware-based request limiting
- Protects backend services from excessive requests

---

## SCRT — Security

### SCRT-1 — Authentication
- User authentication using Firebase

---

### SCRT-2 — Encryption of Sensitive Data
- Secure handling of authentication tokens and user data

---

### SCRT-3-1 — Authorization (RBAC)
- Role/token-based access control using JWT

---

### SCRT-4-1 — Secret Management
- Environment variables used for sensitive configurations

---

## DVPS — DevOps & Deployment

### DVPS-1 — Dockerized Application
- Backend services containerized using Docker

### DVPS-2 — Deployment

**Infrastructure:**
- Google Cloud Run
- One container per service

**Features:**
- Independent scaling
- Serverless execution
- Environment-based configuration

---

### DVPS-3 — CI/CD

**Pipeline:**
- CircleCI monorepo setup

**Features:**
- Path-based filtering (only changed services deploy)
- Docker build & push
- Automated Cloud Run deployment


## BRANCH-LEVEL MAPPING

This section maps backend development tasks to specific technical tree nodes.

---

## 🔹 VCTL — Version Control

| Code | Description | Covered By |
|------|------------|-----------|
| VCTL-2 | Git tagging applied on release commits (v1.0 → v1.7) | FMN-145-Tagging
| VCTL-3 | Continuous Integration (Unit Test Automation) | FMN-149

---

## 🔹 WAPP — Backend Application

| Code | Description | Covered By |
|------|------------|-----------|
| WAPP-1 | Business logic specification | FMN-41, FMN-28, FMN-51, FMN-57 |
| WAPP-2 | Authentication & authorization | FMN-27-login-flow-ve-deployment-tamamlanmas, FMN-35, auth-service-update, add-authMiddleware |
| WAPP-3 | Form & data validation | FMN-44-Flowers-ve-tasks-endpoint-lerinin-eklenmesi, FMN-51 |
| WAPP-4 | Backend API & error handling | FMN-44-Flowers-ve-tasks-endpoint-lerinin-eklenmesi, FMN-57, FMN-69-notification-endpoints |
| WAPP-6-1 | Async backend operations | FMN-65-Cloud-Tasks, FMN-69-notification-endpoints |
| WAPP-6-2 | Service health endpoints | FMN-68, fix-calendar-deploy |

---

## 🔹 DTBS — Database

| Code | Description | Covered By |
|------|------------|-----------|
| DTBS-1-1 | Naming conventions | FMN-41, FMN-44, FMN-51 |
| DTBS-1-4 | Exception logging | FMN-58, FMN-66 |
| DTBS-3-2 | Cloud storage | FMN-65-Cloud-Tasks, FMN-107 |

---

## 🔹 TEST — Quality Assurance

| Code | Description | Covered By |
|------|------------|-----------|
| TEST-1 | Manual testing | All feature branches (FMN-41, FMN-51, FMN-57, etc.) |
| TEST-3 | Endpoint/session testing | FMN-69-notification-endpoints, FMN-107 |
| TEST-4 | Rate limiting | FMN-55-Endpointlere-rate-limit-eklenmesi, updateRateLimit |

---

## 🔹 SCRT — Security

| Code | Description | Covered By |
|------|------------|-----------|
| SCRT-1 | Authentication | FMN-27, FMN-35, auth-service-update |
| SCRT-2 | Encryption of sensitive data | Firebase-based implementation (implicit in all services) |
| SCRT-3-1 | Authorization (RBAC) | add-authMiddleware |
| SCRT-4-1 | Secret management | Environment configuration across all services |

---

## 🔹 DVPS — DevOps

| Code | Description | Covered By |
|------|------------|-----------|
| DVPS-1 | Dockerized application | FMN-28, FMN-68, FMN-78 |
| DVPS-2 | Containerized architecture | FMN-28, FMN-68 |
| DVPS-3 | Cloud deployment | FMN-27, FMN-68, fix-calendar-deploy |
| DVPS-3-1 | Service health monitoring | FMN-68 |
