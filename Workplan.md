# EyeTask - Driver Task Management Web App - Professional Workflow Plan

## Project Overview
**App Name**: EyeTask
**Company**: Mobileye
**Purpose**: Replace PDF-based task distribution with a real-time, mobile-first web application for drivers
**Language**: Hebrew (RTL layout required)
**Architecture**: Progressive Web App (PWA) with mobile-first design

## URL Structure & Navigation

### App Routing
- **Base URL**: `/` (Homepage)
- **Project Pages**: `/project/:projectId` 
- **Task Details**: `/project/:projectId/task/:taskId`
- **Subtask Details**: `/project/:projectId/task/:taskId/subtask/:subtaskId`
- **Admin Dashboard**: `/admin` (protected route)
- **Admin Task Management**: `/admin/tasks`
- **Admin Analytics**: `/admin/analytics`

### Deep Linking Strategy
- **Direct Access**: All URLs support direct access and sharing
- **State Preservation**: URL params maintain expanded/collapsed states
- **Task Sharing**: Individual task links for driver communication
- **Project Sharing**: Project-level links for team coordination

### PWA Integration & App Opening
- **PWA Detection**: Automatic detection if EyeTask PWA is installed
- **Smart Redirecting**: 
  - If PWA installed → Automatically open in app
  - If PWA not installed → Show "Open in App" banner/prompt
- **Install Prompt**: Native browser install prompt for first-time users
- **Fallback**: Seamless web experience if user prefers browser
- **URL Handling**: All shared links work in both PWA and browser modes

## Core Features & Requirements

### 1. Authentication System
- **Admin Access**: Single admin user (owner) with full CRUD permissions
- **Driver Access**: Public access, no login/registration required
- **Security**: Admin-only protected routes for management functions

### 2. Admin Dashboard
**Core Functions**:
- Add/Remove/Edit tasks
- Control task visibility (show/hide tasks for drivers)
- Analytics dashboard with visitor statistics

### 3. User Interface Structure

#### 3.1 Site Header
- **Layout**: Sticky header
- **Elements**: 
  - Mobileye company logo
  - EyeTask app name
  - Hamburger menu (3-line button) for side navigation

#### 3.2 Homepage
- **Daily Updates Section**: Top-positioned functionality area
- **Project Selection**: Grid/list of available project groups
- **Navigation**: Click project → redirect to project-specific page

#### 3.3 Project Pages
- **Task Display**: Collapsible list of tasks
- **Default State**: All tasks collapsed showing only Title + DATACO number
- **Expanded State**: Full task information + subtasks list
- **Subtask Display**: Nested collapsible items within expanded tasks

## Data Structure

### 4. Task Entity
**Required Fields**:
- Title (string)
- Subtitle (string, optional)
- DATACO Number (format: DATACO-XXXX, unique identifier)
- Description (object):
  - Main Description
  - How to Execute instructions
- Project (dropdown, create new if not exists)
- Type (checkbox): Events/Hours (אירועים/שעות) - can select both
- Locations (multi-select): Countries (dropdown from existing + add new option)
- Amount Needed (number, auto-calculated from subtasks total)
- Target Car (multi-select): Vehicle names
- LiDAR (boolean): Yes/No
- Day Time (multi-select): Day/Night/Dusk/Dawn
- Priority (number): 0-10 (1 = highest priority, 0 = no priority)

**Business Rules**:
- Each task must contain minimum 1 subtask
- Amount Needed = sum of all subtask amounts

### 5. Subtask Entity
**Required Fields**:
- Title (string)
- Subtitle (string, optional)
- Image (file upload, optional)
- Subtask DATACO (format: DATACO-XXXX, unique identifier)
- Type (radio button): Events OR Hours (single selection only)
- Amount Needed (number)
- Labels (multi-select tags, displayed as individual labels)
- Target Car (inherited from parent task)
- Weather (dropdown): Clear/Fog/Overcast/Rain/Snow/Mixed
- Scene (dropdown): Highway/Urban/Rural/Sub-Urban/Test Track/Mixed

## UI/UX Requirements

### 6. Design Specifications
- **Primary Focus**: Mobile-first responsive design
- **Language Support**: Full RTL (Right-to-Left) layout for Hebrew
- **Design Style**: Minimal, clean, modern interface
- **User Experience**: Optimized for driver workflow understanding

### 7. Image Handling
- **Default Display**: Small fixed-size thumbnails
- **Interaction**: Click to expand to full resolution (inline, not new window)
- **Responsive**: Maintain aspect ratio across devices

### 8. Progressive Web App (PWA) Features
- **App Name**: EyeTask
- **Mobile Optimization**: Touch-friendly interface
- **Responsive Design**: Adaptive layouts for all screen sizes
- **PWA Manifest**: EyeTask app-like experience configuration
- **Performance**: Fast loading and smooth animations
- **Gestures**: Native mobile gesture support
- **Typography**: Native font rendering
- **URL Association**: Register PWA to handle EyeTask domain URLs
- **App Install**: "Add to Home Screen" functionality
- **Offline Support**: Basic offline capabilities for installed app

## Technical Implementation Notes

### 9. Real-time Updates
- **Requirement**: Changes by admin instantly reflect for all drivers
- **Implementation**: Real-time synchronization system needed

### 10. Analytics Requirements
- **User Tracking**: Visitor count and statistics
- **Dashboard**: Admin-accessible analytics interface

### 11. Project Management
- **Dynamic Projects**: Projects created based on task assignments
- **Grouping**: Tasks organized by project groups
- **Navigation**: Project-based task filtering and display

### 12. PWA Technical Requirements
- **Manifest Configuration**: 
  - App name, icons, theme colors
  - Start URL and display mode settings
  - URL scope for app association
- **Service Worker**: 
  - URL interception for installed PWA
  - Basic caching for offline functionality
- **URL Handling**: 
  - Register app as URL handler for domain
  - Intent filters for opening links in PWA
- **Detection Logic**: 
  - Check if PWA is installed on device
  - Conditional rendering of "Open in App" prompts

## Data Storage & API Architecture

### 13. Local File-Based Storage System
- **Storage Method**: Local JSON files in app directory structure
- **File Organization**:
  - `/data/tasks.json` - All tasks data
  - `/data/subtasks.json` - All subtasks data  
  - `/data/projects.json` - Project groups data
  - `/data/users.json` - Admin user data
  - `/data/analytics.json` - Usage statistics
  - `/data/settings.json` - App configuration

### 14. Internal API Routes Structure
**Base API Path**: `/api/`

#### Task Management APIs:
- `GET /api/tasks` - Fetch all tasks
- `GET /api/tasks/:id` - Fetch specific task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update existing task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/visibility` - Toggle task visibility

#### Subtask Management APIs:
- `GET /api/tasks/:taskId/subtasks` - Fetch task subtasks
- `GET /api/subtasks/:id` - Fetch specific subtask
- `POST /api/tasks/:taskId/subtasks` - Create new subtask
- `PUT /api/subtasks/:id` - Update existing subtask
- `DELETE /api/subtasks/:id` - Delete subtask

#### Project Management APIs:
- `GET /api/projects` - Fetch all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Admin & Analytics APIs:
- `GET /api/analytics` - Fetch usage statistics
- `POST /api/analytics/visit` - Log visitor data
- `GET /api/admin/dashboard` - Admin dashboard data
- `POST /api/auth/login` - Admin authentication

### 15. Data Processing Implementation
- **File Operations**: Read/Write JSON files for all CRUD operations
- **Data Validation**: Robust validation before file modifications
- **Atomic Operations**: Ensure data integrity during updates
- **Backup Strategy**: Automatic backup before major changes
- **Error Handling**: Comprehensive error handling for file operations
- **Concurrent Access**: Handle simultaneous read/write operations safely

### 16. Real-time Sync Implementation
- **File Watching**: Monitor JSON file changes
- **WebSocket/SSE**: Push updates to connected clients
- **Change Detection**: Compare file timestamps for updates
- **Automatic Refresh**: Auto-refresh client data on server changes

## Development Phases
1. **Phase 1**: Core authentication and local JSON file system setup
2. **Phase 2**: Internal API routes and CRUD operations implementation  
3. **Phase 3**: Task and subtask management system with real-time sync
4. **Phase 4**: PWA implementation and final optimizations
5. **Phase 5**: Analytics dashboard and comprehensive testing

## Localization Requirements
- **Primary Language**: Hebrew
- **Text Direction**: RTL layout throughout
- **Content Translation**: All UI elements in Hebrew (except where specified otherwise)
- **Input Handling**: Hebrew text input support