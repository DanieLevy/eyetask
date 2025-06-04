# EyeTask - Driver Task Management System

A modern web application for managing automotive data collection tasks, built with Next.js 15 and MongoDB.

## 🚀 Features

- **Task Management**: Create, view, and manage automotive data collection tasks
- **Project Organization**: Organize tasks by projects with hierarchical structure
- **Subtask Support**: Break down tasks into smaller, manageable subtasks
- **User Authentication**: Secure admin authentication with JWT tokens
- **Analytics Dashboard**: Track task completion and project metrics
- **Daily Updates**: Carousel-style announcements and updates
- **Responsive Design**: Mobile-first design with modern UI components
- **Real-time Data**: Live updates and efficient data fetching

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Database**: MongoDB with native driver
- **Authentication**: JWT with bcryptjs password hashing
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Deployment**: Netlify-ready configuration

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB Atlas account or local MongoDB instance
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eyetask
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=drivershub
   NODE_ENV=development

   # App Configuration
   NEXT_PUBLIC_APP_NAME="EyeTask"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Session Secret for authentication
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Database Setup**
   
   Set up MongoDB collections (if not already done):
   ```bash
   npm run setup-mongodb
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## 📊 Database Schema

### Collections

- **projects**: Project information and metadata
- **tasks**: Main tasks with detailed specifications
- **subtasks**: Sub-components of tasks
- **appUsers**: Admin user accounts
- **analytics**: Application usage statistics
- **dailyUpdates**: Announcements and updates
- **dailyUpdatesSettings**: Configuration for updates

### Key Features

- **Schema Validation**: MongoDB schema validation for data integrity
- **Indexes**: Optimized queries with proper indexing
- **Relationships**: ObjectId references between collections
- **Aggregation**: Complex queries for analytics and reporting

## 🔐 Authentication

The application uses a custom JWT-based authentication system:

- **Password Hashing**: bcryptjs with salt rounds
- **Token Management**: HTTP-only cookies for security
- **Role-based Access**: Admin-only endpoints protection
- **Session Management**: Automatic token refresh and validation

### Admin Setup

1. Navigate to `/admin/setup` (first-time only)
2. Create admin credentials
3. Login at `/admin/login`

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `POST /api/auth/setup` - Initial admin setup

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project (admin)

### Tasks
- `GET /api/tasks` - List tasks (filtered by role)
- `POST /api/tasks` - Create new task (admin)

### Analytics
- `GET /api/analytics` - Application metrics
- `POST /api/analytics` - Update analytics

## 🚀 Deployment

### Netlify Deployment

1. **Build Configuration**
   ```bash
   npm run build
   ```

2. **Environment Variables**
   
   Set the following in Netlify dashboard:
   - `MONGODB_URI`
   - `MONGODB_DB_NAME`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

3. **Deploy**
   
   The project includes `netlify.toml` configuration for automatic deployment.

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## 📁 Project Structure

```
eyetask/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── project/           # Project pages
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── mongodb.ts         # MongoDB connection
│   ├── database.ts        # Database service
│   ├── auth.ts           # Authentication service
│   └── logger.ts         # Logging utilities
├── public/               # Static assets
├── setup-mongodb-collections.js  # Database setup
├── supabase-to-mongodb-migration.js  # Migration script
└── package.json          # Dependencies and scripts
```

## 🔄 Migration from Supabase

If migrating from a Supabase setup:

1. **Run Migration Script**
   ```bash
   npm run migrate-from-supabase
   ```

2. **Update Environment Variables**
   
   Replace Supabase variables with MongoDB configuration

3. **Test Connection**
   
   Verify database connectivity and data integrity

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup-mongodb` - Initialize database
- `npm run migrate-from-supabase` - Migrate from Supabase

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Tailwind CSS for styling

## 📈 Performance

- **Database Optimization**: Indexed queries and aggregation pipelines
- **Caching**: Strategic caching for frequently accessed data
- **Bundle Optimization**: Tree-shaking and code splitting
- **Image Optimization**: Next.js automatic image optimization

## 🔒 Security

- **Authentication**: JWT tokens with HTTP-only cookies
- **Authorization**: Role-based access control
- **Input Validation**: Server-side validation for all inputs
- **Environment Variables**: Secure configuration management
- **CORS**: Proper cross-origin resource sharing setup

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify `MONGODB_URI` in environment variables
   - Check network connectivity and firewall settings
   - Ensure MongoDB Atlas IP whitelist includes your IP

2. **Authentication Issues**
   - Verify `NEXTAUTH_SECRET` is set
   - Clear browser cookies and try again
   - Check admin user exists in database

3. **Build Errors**
   - Run `npm install` to ensure all dependencies
   - Check TypeScript errors with `npm run lint`
   - Verify environment variables are set

### Logs

Application logs are available in:
- Browser console (development)
- Server logs (production)
- MongoDB logs (database operations)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Next.js team for the excellent framework
- MongoDB for the robust database solution
- Tailwind CSS for the utility-first CSS framework
- Radix UI for accessible component primitives

---

For more information or support, please contact the development team.
