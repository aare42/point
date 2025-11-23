# Point - Educational Platform

A modern educational platform built with Next.js that allows students to track learning progress, educators to create courses, and employers to post skill-based vacancies.

## Features

- **Role-based Authentication** - Student, Educator, Admin roles with Google OAuth2
- **Knowledge Graph** - Interactive visualization of topic relationships and prerequisites
- **Student Dashboard** - Goal tracking, progress monitoring, and learning path management
- **Course Management** - Educators can create courses and track student progress
- **Admin Panel** - Complete management of users, topics, courses, and goals
- **Responsive Design** - Built with Tailwind CSS for mobile and desktop

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: NextAuth.js with Google OAuth2
- **Visualization**: D3.js for knowledge graph

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google OAuth2 credentials

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd Point
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
- Google OAuth2 credentials
- NextAuth secret
- Database URL

5. Set up the database
```bash
npx prisma migrate dev
npx prisma generate
```

6. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Set up PostgreSQL database (Vercel Postgres recommended)
5. Deploy!

### Environment Variables for Production

```
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Features Overview

### Student Features
- Personal dashboard with learning progress
- Goal creation and tracking
- Course enrollment and progress tracking
- Interactive knowledge graph exploration
- Topic status management (learning, learned, validated)

### Educator Features
- Course creation and management
- Student progress monitoring
- Topic validation and assessment
- Course analytics and insights

### Admin Features
- User management and role assignment
- Topic and course administration
- Goal template creation
- System analytics and monitoring

### Employer Features
- Vacancy posting with skill requirements
- Candidate discovery based on validated skills
- Learning goal generation from job requirements

## Database Schema

The application uses a comprehensive schema supporting:
- User management with role-based access and content moderation
- Topic relationships and prerequisites
- Learning progress tracking
- Course enrollment and completion
- Goal setting and achievement
- Content blocking and moderation features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure build passes
5. Submit a pull request

## License

This project is licensed under the ISC License.