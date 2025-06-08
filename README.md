# 🚗 Drivers Hub - Professional Task Management System

A modern, robust web application for managing automotive data collection tasks with comprehensive admin dashboard and real-time analytics.

## ✨ Key Features

- **🎯 Task Management** - Complete CRUD operations for automotive tasks
- **📊 Real-time Analytics** - Comprehensive dashboard with activity tracking  
- **🎫 Feedback System** - Public feedback form with admin management
- **📱 PWA Support** - Offline-capable progressive web app
- **🌐 Hebrew RTL** - Full Hebrew language support with RTL layout
- **🔐 Secure Authentication** - JWT-based admin authentication
- **📸 Multi-Image Upload** - Support for multiple images per task
- **🏗️ Project Organization** - Hierarchical project and subtask structure

## 🛠️ Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Database:** MongoDB with optimized schema
- **Styling:** Tailwind CSS with Hebrew RTL support
- **Authentication:** JWT with secure session management
- **UI Components:** Radix UI primitives
- **Analytics:** Real-time activity logging and metrics

## 🚀 Quick Start

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd drivers-hub
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your MongoDB URI and secrets
   ```

3. **Database Setup**
   ```bash
   npm run setup-mongodb
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
drivers-hub/
├── app/                    # Next.js 15 app directory
│   ├── api/               # API routes (tasks, projects, feedback, analytics)
│   ├── admin/             # Admin dashboard pages
│   ├── feedback/          # Public feedback system
│   └── project/           # Project detail pages
├── components/            # Reusable React components
│   ├── admin/             # Admin-specific components
│   └── icons/             # Icon components
├── lib/                   # Core utilities and services
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   └── mongodb.ts         # Database connection
├── docs/                  # Comprehensive documentation
│   ├── changelogs/        # Feature updates and changes
│   ├── deployment/        # Deployment guides
│   ├── features/          # Feature specifications
│   └── technical/         # Technical documentation
├── scripts/               # Utility scripts
│   ├── migrations/        # Database migration scripts
│   └── seed-activities.js # Sample data generation
└── public/               # Static assets and PWA files
```

## 🔧 Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=drivershub

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# App Configuration  
NEXT_PUBLIC_APP_NAME="Drivers Hub"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📚 Documentation

- **[📋 Changelogs](docs/changelogs/)** - Feature updates and system changes
- **[🚀 Deployment](docs/deployment/)** - Deployment guides and configurations  
- **[✨ Features](docs/features/)** - Feature specifications and implementations
- **[🔧 Technical](docs/technical/)** - Architecture and technical details

## 🎯 API Endpoints

### Public APIs
- `POST /api/feedback` - Submit feedback (no auth required)
- `GET /api/feedback/subtasks` - Get available subtasks

### Admin APIs  
- `GET /api/tasks` - List tasks with filtering
- `POST /api/tasks` - Create new task
- `GET /api/analytics` - System analytics and metrics
- `GET /api/feedback` - Manage feedback tickets

## 🔐 Admin Access

1. **Initial Setup:** Visit `/admin/setup` (first-time only)
2. **Login:** Access admin dashboard at `/admin/login`
3. **Dashboard:** Comprehensive admin interface at `/admin/dashboard`

## 🌟 Recent Major Features

- **✅ Feedback System** - Complete public feedback with admin management
- **✅ Real Analytics** - Replaced mock data with real-time analytics
- **✅ Debug Icon** - Context-aware bug reporting from any page
- **✅ Activity Logging** - Comprehensive audit trail for all actions
- **✅ Multi-Image Support** - Upload multiple images per task

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel with environment variables
```

### Netlify
```bash
npm run build
# Uses included netlify.toml configuration
```

### Docker
```bash
docker build -t drivers-hub .
docker run -p 3000:3000 drivers-hub
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **📖 Documentation:** Check the [docs](docs/) directory
- **🐛 Bug Reports:** Use the debug icon in the app or create an issue
- **💬 Questions:** Open a discussion or contact the development team

---

**Built with ❤️ for automotive data collection professionals**
