# 🎯 Feedback & Support System Documentation

## 📋 Overview

A comprehensive, robust feedback and support ticketing system that allows users to submit feedback, questions, and support requests without authentication, while providing administrators with a full-featured management dashboard.

## 🏗️ System Architecture

### **User Side (Public Access)**
- ✅ **No Authentication Required** - Users can submit feedback without logging in
- ✅ **Smart Form Validation** - Real-time validation with Hebrew error messages
- ✅ **Subtask Integration** - Users can select specific subtasks when relevant
- ✅ **Multiple Contact Methods** - Name (required), email and phone (optional)
- ✅ **Rich Categorization** - 11 different categories and 8 issue types
- ✅ **Urgency Marking** - Users can mark tickets as urgent
- ✅ **Success Confirmation** - Clear confirmation with ticket number

### **Admin Side (Management Dashboard)**
- ✅ **Complete Ticket Management** - View, edit, update, delete tickets
- ✅ **Advanced Filtering** - Filter by status, category, priority, search terms
- ✅ **Real-time Statistics** - Comprehensive analytics and metrics
- ✅ **Response System** - Public and internal responses
- ✅ **Internal Notes** - Admin-only notes for collaboration
- ✅ **Status Management** - 7 different status levels
- ✅ **Priority System** - 5 priority levels with automatic assignment
- ✅ **Activity Logging** - Full audit trail integration

## 🚀 Features

### **Public Feedback Form** (`/feedback`)

#### **Form Fields:**
- **שם מלא** (Full Name) - Required
- **אימייל** (Email) - Optional, validated
- **טלפון** (Phone) - Optional
- **כותרת הפניה** (Title) - Required
- **תיאור מפורט** (Description) - Required
- **קטגוריה** (Category) - Required dropdown
- **סוג הפניה** (Issue Type) - Required dropdown
- **תת-משימה** (Subtask) - Conditional, appears when category is "subtask_related"
- **דחוף** (Urgent) - Optional checkbox

#### **Categories Available:**
1. **תמיכה כללית** (General Support)
2. **בעיה טכנית** (Technical Issue)
3. **בקשת פיצ'ר** (Feature Request)
4. **דיווח על באג** (Bug Report)
5. **קשור למשימה** (Task Related)
6. **קשור לתת-משימה** (Subtask Related)
7. **קשור לפרויקט** (Project Related)
8. **עזרה בחשבון** (Account Help)
9. **משוב** (Feedback)
10. **תלונה** (Complaint)
11. **הצעה** (Suggestion)

#### **Issue Types:**
1. **שאלה** (Question)
2. **בעיה** (Problem)
3. **בקשה** (Request)
4. **באג** (Bug)
5. **שיפור** (Improvement)
6. **תלונה** (Complaint)
7. **מחמאה** (Compliment)
8. **אחר** (Other)

### **Admin Dashboard** (`/admin/feedback`)

#### **Statistics Dashboard:**
- **Total Tickets** - Overall count with today's new tickets
- **Active Tickets** - New, assigned, and in-progress tickets
- **Resolution Rate** - Percentage of resolved/closed tickets
- **Average Resolution Time** - In hours
- **Status Breakdown** - Visual charts by status
- **Priority Breakdown** - Visual charts by priority
- **Customer Satisfaction** - Average rating (when implemented)

#### **Filtering & Search:**
- **Text Search** - Search by title, description, user name, or ticket number
- **Status Filters** - Quick filters for New, In Progress, Resolved
- **Advanced Filters** - Category, priority, date range, urgency
- **Real-time Updates** - Refresh button for latest data

#### **Ticket Management:**
- **List View** - Paginated table with key information
- **Detailed Modal** - Full ticket view with all details
- **Status Updates** - Change status with automatic logging
- **Priority Management** - Adjust priority levels
- **Response System** - Add public responses visible to users
- **Internal Notes** - Admin-only notes for team collaboration

## 🔧 Technical Implementation

### **Database Schema**

#### **FeedbackTicket Collection:**
```typescript
{
  _id: ObjectId,
  ticketNumber: string,        // Auto-generated (FB-2025-001)
  userName: string,
  userEmail?: string,
  userPhone?: string,
  title: string,
  description: string,
  category: FeedbackCategory,
  priority: FeedbackPriority,  // Auto-assigned based on category
  issueType: FeedbackIssueType,
  relatedTo?: {
    type: 'project' | 'task' | 'subtask',
    id: string,
    title: string
  },
  status: FeedbackStatus,
  assignedTo?: string,
  tags: string[],
  responses: FeedbackResponse[],
  internalNotes: FeedbackInternalNote[],
  createdAt: Date,
  updatedAt: Date,
  resolvedAt?: Date,
  closedAt?: Date,
  userAgent?: string,
  ipAddress?: string,
  isUrgent: boolean,
  customerSatisfaction?: number
}
```

#### **Status Workflow:**
1. **new** → **assigned** → **in_progress** → **resolved** → **closed**
2. Alternative paths: **cancelled**, **pending_user**

#### **Priority Auto-Assignment:**
- **Urgent** - If marked as urgent by user
- **High** - Bug reports and technical issues
- **Normal** - Default for most categories
- **Low** - Feature requests and suggestions

### **API Endpoints**

#### **Public Endpoints:**
- `GET /api/feedback/subtasks` - Get available subtasks for form
- `POST /api/feedback` - Create new feedback ticket

#### **Admin Endpoints:**
- `GET /api/feedback` - Get all tickets with filtering
- `GET /api/feedback/[id]` - Get specific ticket
- `PUT /api/feedback/[id]` - Update ticket
- `DELETE /api/feedback/[id]` - Delete ticket
- `POST /api/feedback/[id]/responses` - Add response
- `POST /api/feedback/[id]/notes` - Add internal note
- `GET /api/feedback/stats` - Get statistics

## 📱 User Experience & Activity Logging

All admin actions are logged for full audit trail and the system provides excellent Hebrew RTL support with mobile responsive design. 