# Drivers Hub - Driver Task Management Web App - Professional Workflow Plan

## Project Overview
**App Name**: Drivers Hub
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
- **PWA Detection**: Automatic detection if Drivers Hub PWA is installed
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
  - Drivers Hub app name
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
- **App Name**: Drivers Hub
- **Mobile Optimization**: Touch-friendly interface
- **Responsive Design**: Adaptive layouts for all screen sizes
- **PWA Manifest**: Drivers Hub app-like experience configuration
- **Performance**: Fast loading and smooth animations
- **Gestures**: Native mobile gesture support
- **Typography**: Native font rendering
- **URL Association**: Register PWA to handle Drivers Hub domain URLs
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

🚨 Major Missing Features:
1. URL Structure & Deep Linking Issues
❌ Individual Task URLs: /project/:projectId/task/:taskId - Tasks can only be accessed via admin panel, not public URLs
❌ Individual Subtask URLs: /project/:projectId/task/:taskId/subtask/:subtaskId - No direct subtask access
❌ State Preservation in URLs: Expanded/collapsed states not preserved in URL parameters
❌ Task Sharing Links: No individual task links for driver communication
2. Homepage Missing Core Feature
❌ Daily Updates Section: The workplan specified a "Daily Updates Section" as a top-positioned functionality area on the homepage - this is completely missing
3. Header Navigation Issues
❌ Hamburger Menu & Side Navigation: The header has logo and title but missing the specified hamburger menu (3-line button) for side navigation
4. Image Handling System
❌ Image Display: Subtask images are not properly implemented
❌ Thumbnail System: No small fixed-size thumbnails
❌ Click to Expand: No click-to-expand full resolution functionality
❌ Image Upload: File upload exists in forms but actual image storage/display not working
5. PWA Advanced Features Missing
❌ Smart PWA Detection: No automatic detection if Drivers Hub PWA is installed
❌ Auto-Redirect to PWA: No automatic opening in app when PWA is installed
❌ "Open in App" Prompts: No conditional banner/prompt for non-PWA users
❌ URL Handler Registration: PWA not registered to handle domain URLs
❌ Offline Support: No basic offline capabilities for installed app
❌ Intent Filters: No handling for opening shared links directly in PWA
6. Architecture Deviation
⚠️ Storage System Changed: Originally planned for "Local File-Based Storage System" with JSON files, but implemented with Supabase (this is actually better, but different from original plan)
🔧 Configuration Issues:
1. URL Routing Inconsistency
Project pages use /project/[projectName] instead of /project/[projectId] as specified
Task access is only via admin routes, not public project routes
2. PWA Manifest Incomplete
Missing URL scope configuration for app association
No intent filters for URL handling
Service worker lacks offline caching implementation
3. Missing Service Worker Features
No URL interception for installed PWA
No basic caching for offline functionality
📋 Priority Implementation Order:
High Priority (Core UX Issues):
Daily Updates Section on homepage
Individual task URLs for public access
Hamburger menu & side navigation
Image handling system (upload, display, thumbnails)
Medium Priority (Enhanced PWA):
PWA detection & smart redirecting
URL state preservation for expand/collapse
Offline support with service worker caching
Lower Priority (Advanced Features):
Individual subtask URLs
Intent filters & URL handling
"Open in App" prompts
🎯 Most Critical Missing Item:
The Daily Updates Section on the homepage appears to be the most significant missing feature from the original vision, as it was specifically mentioned as a "top-positioned functionality area" and seems central to the driver workflow.
The current homepage goes straight to project selection, but the original plan envisioned a daily updates area first, then project selection below it.