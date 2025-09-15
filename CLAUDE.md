# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Please, feel free to update it as you build a project.

##Project description

We need to build project from the scratch. You can choose any technology stack.
This project is a PoC of educational web-platform I want to create.
The core idea is to make a system where any person can create own educational trajectory, track progress and make knowledge portfolio.
It will work around knowledge graph, that will connect topics from different domains by prerequisite-effect connection.
In this model student learning goals, educators courses and employers vacancies are just a set of topics.
So students set goals and collect knowledge, educators provide courses on these topics and validate results and employers can find workers with
the right set of skills, seeing all the knowledge picture.

## General coding rules

Please, keep it divided into small independent modules.
Add short description comment to each non-obvious method and to each file.

## Project Structure

We'll need next modules:
- authorization, user management. Google Oauth2 will do the job on this stage
- db and handling connection with it
- admin panel for managing records in db
- knowledge graph representation

## Technology Stack & Implementation Status

**Tech Stack**: Next.js 15 + TypeScript + Tailwind CSS + Prisma + SQLite + NextAuth.js

### ✅ COMPLETED MODULES:
1. **Authentication System**: Google OAuth2 with NextAuth.js, role-based access (USER, EDITOR, ADMIN)
2. **Database**: Prisma with SQLite, full schema implemented with all entities and relationships
3. **Topic Management**: Complete CRUD API + Admin Panel for managing topics with prerequisites
4. **Admin Panel**: Full management interface for topics, courses, goals, users, and vacancies
5. **Student Dashboard**: Progress tracking, goals, courses, and topic status management
6. **Educator Dashboard**: Course creation, management, and student progress tracking
7. **Employer Dashboard**: Vacancy posting and candidate discovery
8. **Course System**: Complete course browsing, enrollment, and progress tracking
9. **Goal System**: Goal templates (public) and personal goals (private) with topic tracking
10. **Vacancy System**: Job posting with skill requirements and learning goal generation
11. **Knowledge Graph**: Interactive visualization with topic status management and course discovery
12. **Role-Based Interface**: Dynamic role switching (Student/Educator/Employer) with contextual features

## Common Development Commands

```bash
npm run dev          # Start development server
npx prisma studio    # Open database GUI
npx prisma migrate dev --name [name]  # Create database migration  
npx prisma generate  # Generate Prisma client after schema changes
```

## Database Operations

- Database file: `./dev.db` (SQLite)
- Admin promotion: First user can promote themselves via `/api/admin/promote`
- All entities implemented: User, Topic, Goal, Course, Vacancy with proper relationships

## Architecture Overview

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes (/api/topics, /api/admin/promote)
│   ├── admin/          # Admin panel pages (/admin/topics)
│   └── page.tsx        # Landing page with auth
├── lib/
│   ├── auth.ts         # NextAuth configuration  
│   ├── prisma.ts       # Prisma client setup
│   └── validations/    # Zod schemas for API validation
├── components/         # Reusable React components
└── types/             # TypeScript type definitions
```

## Authentication Flow

1. User signs in via Google OAuth2
2. NextAuth.js creates user record in database 
3. First user can promote themselves to ADMIN via "Become Admin" button
4. Role-based access controls API endpoints and UI navigation
5. JWT tokens include user role for authorization

## Key Files to Understand

- `src/app/api/topics/route.ts` - Topic CRUD API with validation and prerequisites
- `src/app/admin/topics/` - Admin panel for topic management 
- `src/lib/auth.ts` - NextAuth configuration with Google provider
- `prisma/schema.prisma` - Complete database schema with all relationships
- `src/lib/auth/middleware.ts` - API authentication middleware for protected routes

## Current State

✅ **PRODUCTION READY**: http://localhost:3000

### Core Features Implemented:
- **Authentication**: Google OAuth2 with role-based access control
- **Multi-Role Interface**: Users can switch between Student, Educator, and Employer roles
- **Knowledge Graph**: Interactive D3.js visualization with topic relationships and course discovery
- **Student Features**: Dashboard, goal creation, course enrollment, topic progress tracking
- **Educator Features**: Course creation/management, student progress tracking
- **Employer Features**: Vacancy posting, candidate discovery through learning goals
- **Admin Panel**: Complete content management for all entities
- **Search & Filtering**: Advanced filtering across courses, goals, and vacancies

### Key Pages:
- `/student` - Student dashboard with progress tracking
- `/educator` - Educator dashboard with course management
- `/employer` - Employer dashboard with vacancy management
- `/courses` - Course browsing with topic-based filtering
- `/goals` - Goal template browsing and inspiration
- `/vacancies` - Job browsing with learning goal generation
- `/knowledge-graph` - Interactive topic visualization
- `/admin/*` - Complete administration interface

### Technical Highlights:
- **Database**: Full Prisma schema with all relationships
- **APIs**: RESTful endpoints for all CRUD operations
- **UI/UX**: Consistent design with role-based navigation
- **Data Integrity**: Comprehensive validation and error handling

## UI/UX Design Decisions

### Topic Display Standards
**Decision**: Use pictograms for topic types and background colors for learning statuses.

**Implementation**:
- **Pictograms for Topic Types** (always visible):
  - 📚 Theory topics
  - ⚙️ Practice topics  
  - 🚀 Project topics
- **Background Colors for Learning Status** (when user is authenticated):
  - Gray: NOT_LEARNED
  - Blue: WANT_TO_LEARN
  - Yellow: LEARNING
  - Green: LEARNED
  - Purple: LEARNED_AND_VALIDATED

**Rationale**: This approach separates semantic meaning (what type of topic) from progress tracking (learning status), making the interface more intuitive and avoiding visual conflicts between different information types.

**Applied to**: All student-facing pages including /vacancies, /courses, /goals, and dashboard views.

### Goal Architecture
**Decision**: Separate Goal Templates (public, reusable) from Student Goals (private, personal).

**Problem Solved**: The original "public goals" concept didn't make sense - students shouldn't create public goals, and sharing personal learning objectives isn't useful for other learners.

**New Architecture**:
- **GoalTemplate** - Created by platform team/educators, public, reusable templates
- **Goal** - Always private, owned by students, can be created from templates or from scratch
- **Relationship**: Goals can optionally reference the GoalTemplate they were created from

**Database Changes**:
- Added `GoalTemplate` model with `GoalTemplateTopic` junction table
- Removed `isPublic` field from `Goal` model
- Added optional `goalTemplateId` field to `Goal` model

**API Endpoints**:
- `/api/goal-templates` - Public browsing of templates
- `/api/admin/goal-templates` - Admin management of templates
- `/api/goals` - Private student goal management (no public browsing)

**UI Changes**:
- `/goals` page now shows goal templates instead of public goals
- Admin panel manages goal templates at `/admin/goal-templates`
- Student goal creation removes visibility toggles (always private)

**Rationale**: This creates a cleaner separation between curated content (templates) and personal learning objectives (goals), making the platform more logical and useful.

## Recent Improvements & Features

### Course Filtering Enhancement
- **Problem**: Topic type dropdown was impractical for large databases
- **Solution**: Replaced dropdown with text search field for topic names
- **Benefit**: Scalable filtering that works with unlimited topics

### Knowledge Graph Integration
- **Enhancement**: Added course discovery to right panel
- **Feature**: When selecting a topic, shows all courses that cover that topic
- **Navigation**: Direct links to course detail pages
- **UX**: Seamless integration between graph exploration and practical learning paths

### Role-Based Vacancy Features
- **Smart Filtering**: "Create Learning Goal" button only appears for users in Student role
- **Context Awareness**: Employers and Educators see clean vacancy interface without student-specific actions
- **Simplified Interface**: Removed unnecessary "skill type" filters (most vacancies include mixed topic types)

### UI Polish
- **Consistent Navigation**: Back buttons on all sub-pages following standard patterns
- **Filter Simplification**: Removed meaningless filters (e.g., topic types for vacancies)
- **Error Handling**: Improved null-safe rendering across all components
- **Loading States**: Professional loading indicators for all async operations

## Production Deployment

### Prerequisites
- Node.js 18+ and npm
- Google OAuth2 credentials (for authentication)
- Domain name (for production URLs)

### Environment Variables
Create `.env.local` with:
```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Build & Deploy Commands
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build for production
npm run build

# Start production server
npm start
```

### Database Setup for Production
1. **SQLite**: Works out-of-box, suitable for small-medium scale
2. **PostgreSQL**: For larger scale, update `DATABASE_URL` in schema.prisma
3. **Seed Data**: Run `node seed-script.js` to populate initial topics/courses

### Deployment Platforms
- **Vercel**: Recommended (built by Next.js team)
- **Railway**: Good alternative with database hosting
- **DigitalOcean**: For custom server setup
- **AWS/Google Cloud**: Enterprise-grade options

### First-Time Setup
1. Deploy application
2. Visit `/api/auth/signin` to create first user
3. First user can promote themselves to ADMIN
4. Use admin panel to create initial topics, courses, and goal templates
5. Invite educators and employers to join
