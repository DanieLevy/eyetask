# EyeTask - מערכת ניהול משימות נהגים

## 🎯 **סקירה כללית**

EyeTask הוא אפליקציית ניהול משימות בזמן אמת עבור נהגי Mobileye. המערכת מחליפה את הפצת המשימות המבוססת על PDF במערכת דיגיטלית מתקדמת עם תמיכה מלאה בעברית ו-RTL.

### ✨ **תכונות עיקריות**

- 🌐 **Progressive Web App (PWA)** - חוויית אפליקציה מקורית
- 🔄 **עדכונים בזמן אמת** - שינויים מיידיים לכל המשתמשים
- 📱 **Mobile-First Design** - מותאם לשימוש נייד
- 🔒 **מערכת הרשאות** - גישת מנהל מוגנת
- 📊 **אנליטיקה מתקדמת** - מעקב אחר שימוש וביצועים
- 🗂️ **ניהול פרויקטים** - ארגון משימות לפי פרויקטים
- 🎯 **מערכת עדיפויות** - סיווג משימות לפי חשיבות

## 🚀 **התחלה מהירה**

### דרישות מערכת

- Node.js 18+ 
- npm או yarn
- דפדפן מודרני עם תמיכה ב-PWA

### התקנה

```bash
# שכפול הפרויקט
git clone <repository-url>
cd eyetask

# התקנת תלויות
npm install

# הרצת שרת הפיתוח
npm run dev
```

האפליקציה תהיה זמינה בכתובת: `http://localhost:3000`

### פרטי התחברות למנהל

```
שם משתמש: admin
סיסמה: admin123
```

## 🏗️ **ארכיטקטורה**

### מבנה הפרויקט

```
eyetask/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── tasks/         # ניהול משימות
│   │   │   └── index.ts  # ניהול משימות
│   │   ├── subtasks/      # ניהול תת-משימות
│   │   │   └── index.ts  # ניהול תת-משימות
│   │   ├── projects/      # ניהול פרויקטים
│   │   │   └── index.ts  # ניהול פרויקטים
│   │   ├── auth/          # אימות
│   │   │   └── index.ts  # אימות
│   │   ├── analytics/     # אנליטיקה
│   │   └── admin/         # פונקציות מנהל
│   │       └── index.ts  # פונקציות מנהל
│   ├── admin/             # דפי מנהל
│   ├── project/           # דפי פרויקט
│   ├── globals.css        # עיצוב גלובלי
│   ├── layout.tsx         # Layout ראשי
│   └── page.tsx           # דף הבית
├── data/                  # אחסון JSON מקומי
│   ├── tasks.json         # נתוני משימות
│   ├── subtasks.json      # נתוני תת-משימות
│   ├── projects.json      # נתוני פרויקטים
│   ├── users.json         # נתוני משתמשים
│   ├── analytics.json     # נתוני אנליטיקה
│   └── settings.json      # הגדרות מערכת
├── lib/                   # ספריות עזר
│   ├── data.ts           # פונקציות ניהול נתונים
│   └── auth.ts           # פונקציות אימות
├── public/               # קבצים סטטיים
│   ├── manifest.json     # PWA Manifest
│   ├── sw.js            # Service Worker
│   └── icons/           # אייקונים
└── components.json       # הגדרות רכיבים
```

### טכנולוגיות

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4 עם תמיכה RTL
- **Authentication**: JWT + bcryptjs
- **Data Storage**: JSON Files (מקומי)
- **PWA**: Service Worker + Web App Manifest
- **Icons**: Lucide React

## 📱 **תכונות PWA**

### התקנה

1. פתח את האפליקציה בדפדפן
2. לחץ על "הוסף לדף הבית" או "התקן אפליקציה"
3. האפליקציה תותקן כאפליקציה מקורית

### תכונות אופליין

- שמירת נתונים בזיכרון מקומי
- גישה למשימות גם ללא חיבור לאינטרנט
- סנכרון אוטומטי כשהחיבור חוזר

## 🔐 **מערכת הרשאות**

### גישה ציבורית (נהגים)

- צפייה במשימות גלויות בלבד
- גישה לפרטי משימות ותת-משימות
- ניווט בין פרויקטים
- ללא צורך בהתחברות

### גישת מנהל

- ניהול מלא של משימות ותת-משימות
- שליטה בנראות משימות
- צפייה באנליטיקה ודוחות
- ניהול פרויקטים
- גישה ללוח בקרה

## 📊 **API Documentation**

### משימות (Tasks)

```typescript
GET    /api/tasks              # קבלת כל המשימות
POST   /api/tasks              # יצירת משימה חדשה (מנהל)
GET    /api/tasks/[id]         # קבלת משימה ספציפית
PUT    /api/tasks/[id]         # עדכון משימה (מנהל)
DELETE /api/tasks/[id]         # מחיקת משימה (מנהל)
PATCH  /api/tasks/[id]/visibility # שינוי נראות (מנהל)
```

### תת-משימות (Subtasks)

```typescript
GET    /api/tasks/[taskId]/subtasks # קבלת תת-משימות למשימה
POST   /api/tasks/[taskId]/subtasks # יצירת תת-משימה (מנהל)
GET    /api/subtasks/[id]           # קבלת תת-משימה ספציפית
PUT    /api/subtasks/[id]           # עדכון תת-משימה (מנהל)
DELETE /api/subtasks/[id]           # מחיקת תת-משימה (מנהל)
```

### פרויקטים (Projects)

```typescript
GET    /api/projects          # קבלת כל הפרויקטים
POST   /api/projects          # יצירת פרויקט חדש (מנהל)
```

### אימות (Authentication)

```typescript
POST   /api/auth/login        # התחברות מנהל
```

### אנליטיקה (Analytics)

```typescript
GET    /api/analytics         # קבלת נתוני אנליטיקה (מנהל)
POST   /api/analytics         # רישום ביקור
GET    /api/admin/dashboard   # נתוני לוח בקרה (מנהל)
```

## 🎨 **עיצוב ו-UX**

### תמיכה בעברית ו-RTL

- כיוון טקסט מימין לשמאל
- פונטים מותאמים לעברית
- ממשק משתמש מותאם תרבותית
- תמיכה בקלט עברית

### עיצוב רספונסיבי

- מותאם למובייל (Mobile-First)
- תמיכה בטאבלט ודסקטופ
- ממשק מגע ידידותי
- אנימציות חלקות

### נגישות

- תמיכה בקוראי מסך
- ניווט במקלדת
- ניגודיות צבעים מתאימה
- גדלי מגע מינימליים

## 🔧 **הגדרות ופיתוח**

### משתני סביבה

```env
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### סקריפטים

```bash
npm run dev      # הרצת שרת פיתוח
npm run build    # בניית גרסת ייצור
npm run start    # הרצת שרת ייצור
npm run lint     # בדיקת קוד
```

### הוספת נתונים

ניתן להוסיף נתונים ידנית על ידי עריכת הקבצים ב-`data/`:

1. `tasks.json` - משימות
2. `subtasks.json` - תת-משימות
3. `projects.json` - פרויקטים
4. `users.json` - משתמשים

## 📈 **מעקב ואנליטיקה**

### מדדים נתמכים

- סך ביקורים באתר
- משתמשים ייחודיים
- צפיות בדפים
- פעילות יומית
- משימות פופולריות

### דוחות

- לוח בקרה מנהל
- סטטיסטיקות בזמן אמת
- ניתוח שימוש במשימות
- מעקב אחר פרויקטים

## 🚀 **פריסה לייצור**

### Vercel (מומלץ)

```bash
# התחבר ל-Vercel
npx vercel login

# פרוס את הפרויקט
npx vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 **אבטחה**

### אמצעי אבטחה

- הצפנת סיסמאות עם bcrypt
- JWT tokens עם תפוגה
- הגנה על נתיבי מנהל
- ולידציה של קלט משתמש
- הגנה מפני CSRF

### המלצות

- שנה את סיסמת המנהל הדיפולטית
- השתמש ב-HTTPS בייצור
- הגדר JWT_SECRET חזק
- עדכן תלויות באופן קבוע

## 🤝 **תרומה לפרויקט**

### הנחיות פיתוח

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

### קוד סטנדרטים

- TypeScript חובה
- ESLint + Prettier
- קונבנציות שמות בעברית לממשק
- תיעוד קוד באנגלית

## 📞 **תמיכה**

### בעיות נפוצות

**האפליקציה לא נטענת:**
- בדוק שהשרת רץ על פורט 3000
- וודא שכל התלויות מותקנות

**בעיות התחברות מנהל:**
- וודא שהסיסמה נכונה (admin123)
- בדוק את קובץ users.json

**בעיות PWA:**
- וודא ש-manifest.json נגיש
- בדוק ש-service worker רשום

### יצירת קשר

- **Email**: support@mobileye.com
- **GitHub Issues**: [פתח issue חדש](https://github.com/your-repo/issues)

## 📄 **רישיון**

© 2025 Mobileye - EyeTask. כל הזכויות שמורות.

---

**EyeTask** - מערכת ניהול משימות מתקדמת לנהגי Mobileye 🚗👁️
