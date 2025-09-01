# ActivityPro - Sistema de Controle de Atividades

## Overview

ActivityPro is a comprehensive web-based activity management and time tracking system designed for productive teams. The system enables flexible time tracking for employees while providing visibility to sector chiefs and administrators. It focuses on activity-based time investment rather than traditional time clock functionality, allowing collaborators to manage their work while giving supervisors insight into team productivity.

The system supports three main user roles: collaborators who create and manage activities, sector chiefs who monitor their team's activities, and administrators who manage the overall system configuration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Form Handling**: React Hook Form with Zod for validation and type inference
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript for full-stack type consistency
- **Real-time Communication**: WebSocket integration for live activity updates
- **Session Management**: Express sessions with PostgreSQL storage for persistence
- **Middleware**: Custom logging, error handling, and authentication middleware
- **Development**: Hot module replacement and development server integration

### Database Design
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema Structure**: 
  - Users table with role-based access (collaborator, sector_chief, admin)
  - Sectors table for organizational structure
  - Activities table supporting simple and checklist types with status tracking
  - Subtasks table for checklist-type activities
  - Activity sessions for time tracking
  - Time adjustment logs for audit trails
- **Connection Management**: Connection pooling with WebSocket support for real-time features

### Authentication & Authorization
// ...existing code...
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role-based Access**: Three-tier permission system (collaborator, sector_chief, admin)
- **Security**: HTTP-only cookies, CSRF protection, and secure session handling

### Real-time Features
- **WebSocket Server**: Custom WebSocket implementation for live activity updates
- **User Presence**: Real-time tracking of active users and their current activities
- **Live Updates**: Instant synchronization of activity status changes across clients
- **Sector Isolation**: WebSocket connections scoped to user sectors for data privacy

### State Management Pattern
- **Client-side**: React Query for server state with optimistic updates
- **Real-time Sync**: WebSocket events integrated with React Query cache invalidation
- **Error Handling**: Centralized error boundaries with user-friendly messaging
- **Loading States**: Skeleton components and loading indicators for better UX

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form handling and validation
- **@hookform/resolvers**: Form validation resolvers
- **wouter**: Lightweight React routing

### UI and Styling
- **@radix-ui/***: Comprehensive primitive component library
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Backend Services
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools
- **express**: Web application framework
- **ws**: WebSocket implementation

### Authentication & Session Management
- **openid-client**: OpenID Connect client implementation
- **passport**: Authentication middleware
- **connect-pg-simple**: PostgreSQL session store
- **express-session**: Session management middleware

### Development Tools
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for server-side development
// ...existing code...
- **typescript**: Type checking and compilation

### Database and Validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod validation
- **zod**: Schema validation library
- **date-fns**: Date manipulation and formatting

### Real-time Communication
- **ws**: WebSocket server implementation for real-time features
- **memoizee**: Function memoization for performance optimization