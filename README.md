# 🚀 NexusOS: The AI-Powered Enterprise Operating System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-000000.svg?style=flat-square&logo=turborepo)](https://turbo.build/)
[![NestJS](https://img.shields.io/badge/framework-NestJS-E0234E.svg?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748.svg?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

**NexusOS** is a production-grade, enterprise-scale SaaS platform that unifies communication, project management, AI agents, DevOps monitoring, document intelligence, security, and workflow automation into a single intelligent ecosystem. 

Designed with modern distributed systems architecture, NexusOS showcases cloud-native engineering, transactional consistency patterns, and high-performance real-time features suitable for FAANG/MANG-level engineering standards.

---

## 🏗️ System Architecture Overview

NexusOS is built as a **high-performance, monorepo workspace** managed by **Turborepo** and **pnpm**. The system architecture leverages strict separation of concerns, event-driven state processing, database-backed transactional outboxes, and real-time message brokers.

```mermaid
graph TD
    Client[Next.js 15 Web Client] -->|HTTP / REST| API[NestJS Gateway API]
    Client -->|WebSockets| WS[NestJS Gateway WS]
    
    subgraph Core App Services (apps/api)
        API --> Guard[Auth & RBAC Guards]
        Guard --> Controllers[Module Controllers]
        Controllers --> Services[Domain Services]
    end
    
    subgraph Data & Storage Layer
        Services --> Prisma[Prisma ORM]
        Prisma --> DB[(PostgreSQL + pgvector)]
        Services --> Redis[(Redis Cache & Queues)]
        Services --> S3[(MinIO / S3 Object Storage)]
    end
    
    subgraph Event & Worker Engine
        Prisma --> Outbox[Transactional Outbox Table]
        Outbox -->|Debezium / Poller| Worker[BullMQ Worker Service]
        Worker -->|Email/SMS/Push| Mail[MailHog / SMTP]
    end
    
    subgraph AI Workspace Services
        Services -->|FastAPI Client| PyAI[FastAPI AI Service]
        PyAI -->|LangChain / LangGraph| LLM[OpenAI / Custom LLM API]
    end
```

---

## ⚡ Engineering Highlights (FAANG/MANG Interview Ready)

* **Transactional Outbox Pattern**: Employs a database-backed `OutboxEvent` table to achieve *at-least-once delivery* guarantees for asynchronous background tasks (emails, notifications, file scans) without risking distributed state inconsistency.
* **Granular RBAC & Custom Security Policies**: Complete multi-tenant Role-Based Access Control (RBAC) with device trust fingerprinting, JWT session revocation, and multi-factor authentication (TOTP/2FA).
* **Enterprise-Scale Prisma Schema**: Fully normalized schema incorporating relational indexes, cascades, self-referential tree relations (folders and documents), and multi-field indexes configured for high-throughput query optimization.
* **Real-time Gateway Architecture**: Bidirectional channels powered by WebSockets (Socket.io) with room-based isolation and typing indicators.
* **Full-Stack Monorepo Tooling**: Uses **Turborepo** to pipeline linting, typechecking, database migrations, and production builds with remote caching.

---

## 🛠️ The Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19, Next.js 15 (App Router), TypeScript, TailwindCSS, ShadCN UI | Server-side rendering (SSR), optimized hydration, modern component patterns. |
| **Backend** | NestJS (Node.js 20+), Express, Passport, TypeScript | Opinionated modular design, dependency injection container, robust guard/interceptor pipelines. |
| **Database** | PostgreSQL 16 (with `pgvector` extension) | ACID-compliant relational storage combined with fast vector embedding searches. |
| **Caching/Queues** | Redis 7, BullMQ | Fast session management, WebSocket adapter registry, and high-performance task queues. |
| **Object Storage** | MinIO (AWS S3 Compatible) | Local development S3 mock with pre-signed URL upload/download support. |
| **AI Integration** | Python 3.12, FastAPI, LangChain, LangGraph | Low-overhead Python AI runtime for complex agent orchestration. |

---

## 📁 Monorepo Structure

```
nexusos/
├── apps/
│   ├── api/                 # NestJS enterprise backend
│   │   ├── src/common/      # Custom exception filters, guards, rate-limiters, middleware
│   │   ├── src/modules/     # Modules (Auth, Orgs, Tasks, AI, Notifications, Audit, etc.)
│   │   └── src/services/    # External communication engines (Email, SMS)
│   ├── web/                 # Next.js 15 frontend application (scaffolded)
│   └── ai/                  # FastAPI / Python AI Agents service (scaffolded)
├── packages/
│   ├── shared-types/        # Dry-run shared models and types across packages
│   └── ui/                  # Component library based on Tailwind & Radix UI
├── prisma/
│   ├── schema.prisma        # Complete PostgreSQL database schema
│   └── seed.ts              # System seed script
├── docker-compose.yml       # Local dev service suite (PostgreSQL, Redis, MinIO, MailHog)
├── tsconfig.base.json       # Strict global TypeScript compiler definitions
└── turbo.json               # Turbo build/cache pipeline definitions
```

---

## 🚦 Getting Started (Local Development)

### Prerequisites
* **Node.js**: `v20.x` or higher
* **pnpm**: `v9.x`
* **Docker & Docker Compose**

### Setup Steps

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/HIYA-Banerjee/NexusOS.git
   cd NexusOS
   pnpm install
   ```

2. **Spin up local infrastructure services (PostgreSQL, Redis, MinIO, MailHog):**
   ```bash
   pnpm docker:up
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(Ensure local secrets match your database and authentication configuration).*

4. **Run database migrations and seed system roles:**
   ```bash
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. **Boot the application in development mode:**
   ```bash
   pnpm dev
   ```

---

## 📊 Database Schema Highlights (`prisma/schema.prisma`)

* **User Identity & Security**: Support for standard password hashes, magic links, 2FA credentials, and device fingerprints.
* **Organisational Multi-Tenancy**: Organization -> Department -> Team hierarchy mapped with unique indexing on slug fields.
* **Communication & Collaboration**: Message trees with parental refs for threads, reactions, and direct message indexing.
* **Auditability**: Complete `AuditLog` mapping `actorId` and action contexts to maintain compliance standards.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
