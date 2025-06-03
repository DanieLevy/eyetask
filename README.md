# EyeTask - מערכת ניהול משימות נהגים

## 🎯 **סקירה כללית**

EyeTask הוא אפליקציית ניהול משימות בזמן אמת עבור נהגי Mobileye. המערכת מחליפה את הפצת המשימות המבוססת על PDF במערכת דיגיטלית מתקדמת עם תמיכה מלאה בעברית ו-RTL.

### ✨ **תכונות עיקריות**

- 🌐 **Progressive Web App (PWA)** - חוויית אפליקציה מקורית
- 🔄 **עדכונים בזמן אמת** - שינויים מיידיים לכל המשתמשים
- 📱 **Mobile-First Design** - מותאם לשימוש נייד
- 🔒 **מערכת הרשאות** - גישת מנהל מוגנת עם JWT
- 📊 **אנליטיקה מתקדמת** - מעקב אחר שימוש וביצועים
- 🗂️ **ניהול פרויקטים** - ארגון משימות לפי פרויקטים
- 🎯 **מערכת עדיפויות** - סיווג משימות לפי חשיבות
- 🛡️ **אבטחה מתקדמת** - Rate limiting, הצפנה, ו-validation מקיף
- 📝 **לוגים מפורטים** - מערכת לוגים מתקדמת לדיבוג ותחזוקה
- 🔍 **Health Monitoring** - מעקב אחר בריאות המערכת

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

## 🏗️ **ארכיטקטורה מתקדמת**

### מבנה הפרויקט

```
eyetask/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes עם Error Handling מתקדם
│   │   ├── health/        # Health Check Endpoint
│   │   ├── tasks/         # ניהול משימות
│   │   ├── subtasks/      # ניהול תת-משימות
│   │   ├── projects/      # ניהול פרויקטים
│   │   ├── auth/          # אימות עם Rate Limiting
│   │   ├── analytics/     # אנליטיקה ומדדים
│   │   └── admin/         # פונקציות מנהל
│   ├── admin/             # דפי מנהל
│   ├── project/           # דפי פרויקט
│   ├── globals.css        # עיצוב גלובלי RTL
│   ├── layout.tsx         # Layout ראשי עם PWA
│   └── page.tsx           # דף הבית רספונסיבי
├── data/                  # אחסון JSON מקומי
│   ├── tasks.json         # נתוני משימות
│   ├── subtasks.json      # נתוני תת-משימות
│   ├── projects.json      # נתוני פרויקטים
│   ├── users.json         # נתוני משתמשים (מוצפנים)
│   ├── analytics.json     # נתוני אנליטיקה
│   └── settings.json      # הגדרות מערכת
├── lib/                   # ספריות עזר מתקדמות
│   ├── data.ts           # פונקציות ניהול נתונים + Validation
│   ├── auth.ts           # פונקציות אימות + Rate Limiting
│   ├── logger.ts         # מערכת לוגים מתקדמת
│   └── middleware.ts     # Middleware לAPI + Error Handling
├── public/               # קבצים סטטיים
│   ├── manifest.json     # PWA Manifest
│   ├── sw.js            # Service Worker
│   └── icons/           # אייקונים
└── components.json       # הגדרות רכיבים
```

### טכנולוגיות

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4 עם תמיכה RTL מלאה
- **Authentication**: JWT + bcryptjs + Rate Limiting
- **Data Storage**: JSON Files עם Backup אוטומטי
- **Logging**: מערכת לוגים מתקדמת עם הקשר
- **Error Handling**: טיפול שגיאות מקיף עם Recovery
- **PWA**: Service Worker + Web App Manifest
- **Icons**: Lucide React
- **Security**: Input validation, CORS, Rate limiting

## 🛡️ **אבטחה ו-Error Handling**

### תכונות אבטחה

- **JWT Authentication** - אימות מאובטח עם תפוגה
- **Password Hashing** - הצפנת סיסמאות עם bcrypt
- **Rate Limiting** - הגבלת קצב בקשות לפי IP ומשתמש
- **Input Validation** - בדיקת נתונים מקיפה
- **CORS Protection** - הגנה מפני Cross-Origin attacks
- **Request Sanitization** - ניקוי נתוני קלט
- **Error Masking** - הסתרת פרטים רגישים בשגיאות

### מערכת Error Handling

```typescript
// דוגמה לטיפול בשגיאות
try {
  const result = await riskyOperation();
  logger.info('Operation successful', 'CONTEXT', { result });
} catch (error) {
  if (error instanceof AppError) {
    logger.error('Application error', 'CONTEXT', { 
      statusCode: error.statusCode,
      context: error.context 
    }, error);
    throw error;
  } else {
    logger.error('Unexpected error', 'CONTEXT', undefined, error as Error);
    throw new AppError('Operation failed', 500, 'CONTEXT');
  }
}
```

### סוגי שגיאות

- **AppError** - שגיאות יישום מוגדרות
- **ValidationError** - שגיאות validation של נתונים
- **AuthError** - שגיאות אימות והרשאה
- **RateLimitError** - שגיאות הגבלת קצב
- **DataError** - שגיאות בגישה לנתונים

## 📝 **מערכת לוגים מתקדמת**

### רמות לוגים

- **ERROR** - שגיאות קריטיות
- **WARN** - אזהרות ובעיות פוטנציאליות
- **INFO** - מידע כללי על פעילות המערכת
- **DEBUG** - מידע מפורט לדיבוג (פיתוח בלבד)

### קטגוריות לוגים

- **API** - בקשות ותגובות API
- **AUTH** - פעילות אימות והרשאה
- **DATA** - פעולות על בסיס הנתונים
- **HEALTH** - בדיקות בריאות המערכת
- **RATE_LIMIT** - הגבלות קצב
- **VALIDATION** - בדיקות validation

### דוגמה ללוגים

```
2025-01-01T12:00:00.000Z INFO  [API] API Request [req_123] { method: 'POST', url: '/api/auth/login' }
2025-01-01T12:00:00.100Z WARN  [AUTH] Login rate limit exceeded { username: 'test', attempts: 6 }
2025-01-01T12:00:00.200Z ERROR [DATA] Data read error { file: 'tasks.json' }
```

## 🔍 **Health Monitoring**

### Health Check Endpoint

```bash
GET /api/health
```

מחזיר מידע מפורט על:
- סטטוס המערכת הכללי
- זיכרון ו-CPU
- בדיקות קבצי נתונים
- זמן פעילות
- גרסה וסביבה

### דוגמה לתגובה

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": { "formatted": "2d 3h 45m 12s" },
    "memory": { "used": 45, "total": 128, "usage": 35 },
    "system": {
      "dataDirectory": true,
      "tasksFile": true,
      "analyticsFile": true
    }
  }
}
```

## 📱 **תכונות PWA מתקדמות**

### התקנה

1. פתח את האפליקציה בדפדפן
2. לחץ על "הוסף לדף הבית" או "התקן אפליקציה"
3. האפליקציה תותקן כאפליקציה מקורית

### תכונות אופליין

- שמירת נתונים בזיכרון מקומי
- גישה למשימות גם ללא חיבור לאינטרנט
- סנכרון אוטומטי כשהחיבור חוזר
- עדכונים אוטומטיים של האפליקציה

## 🔐 **מערכת הרשאות מתקדמת**

### גישה ציבורית (נהגים)

- צפייה במשימות גלויות בלבד
- גישה לפרטי משימות ותת-משימות
- ניווט בין פרויקטים
- ללא צורך בהתחברות
- Rate limiting מגביל 100 בקשות ל-15 דקות

### גישת מנהל

- ניהול מלא של משימות ותת-משימות
- שליטה בנראות משימות
- צפייה באנליטיקה ודוחות
- ניהול פרויקטים
- גישה ללוח בקרה
- JWT עם תפוגה של 7 ימים
- Rate limiting מתקדם עם Brute Force Protection

## 📊 **API Documentation מתקדם**

### Response Format

כל תגובות ה-API משתמשות בפורמט אחיד:

```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "message": string,
  "timestamp": string,
  "requestId": string
}
```

### משימות (Tasks)

```typescript
GET    /api/tasks              # קבלת כל המשימות + פילטרים
POST   /api/tasks              # יצירת משימה חדשה (מנהל)
GET    /api/tasks/[id]         # קבלת משימה ספציפית
PUT    /api/tasks/[id]         # עדכון משימה (מנהל)
DELETE /api/tasks/[id]         # מחיקת משימה (מנהל)
PATCH  /api/tasks/[id]/visibility # שינוי נראות (מנהל)
```

### תת-משימות (Subtasks)

```typescript
GET    /api/tasks/[id]/subtasks # קבלת תת-משימות למשימה
POST   /api/tasks/[id]/subtasks # יצירת תת-משימה (מנהל)
GET    /api/subtasks/[id]       # קבלת תת-משימה ספציפית
PUT    /api/subtasks/[id]       # עדכון תת-משימה (מנהל)
DELETE /api/subtasks/[id]       # מחיקת תת-משימה (מנהל)
```

### בריאות המערכת

```typescript
GET    /api/health             # בדיקת בריאות המערכת
```

### אימות (Authentication)

```typescript
POST   /api/auth/login         # התחברות מנהל עם Rate Limiting
```

### אנליטיקה (Analytics)

```typescript
GET    /api/analytics          # קבלת נתוני אנליטיקה (מנהל)
POST   /api/analytics          # רישום ביקור
GET    /api/admin/dashboard    # נתוני לוח בקרה (מנהל)
```

## 🎨 **עיצוב ו-UX מתקדם**

### תמיכה בעברית ו-RTL

- כיוון טקסט מימין לשמאל
- פונטים מותאמים לעברית
- ממשק משתמש מותאם תרבותית
- תמיכה בקלט עברית
- אייקונים מותאמים ל-RTL

### עיצוב רספונסיבי

- מותאם למובייל (Mobile-First)
- תמיכה בטאבלט ודסקטופ
- ממשק מגע ידידותי
- אנימציות חלקות ונגישות
- Performance מותאם

### נגישות

- תמיכה בקוראי מסך
- ניווט במקלדת
- ניגודיות צבעים מתאימה
- גדלי מגע מינימליים (44px)
- ARIA labels מלאים

## 🔧 **הגדרות ופיתוח מתקדם**

### משתני סביבה

```env
# Security
JWT_SECRET=your-super-secure-secret-key
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info

# Rate Limiting
MAX_REQUESTS_PER_IP=100
RATE_LIMIT_WINDOW_MS=900000

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Performance
MAX_MEMORY_USAGE_PERCENT=90
```

### סקריפטים

```bash
npm run dev      # הרצת שרת פיתוח
npm run build    # בניית גרסת ייצור
npm run start    # הרצת שרת ייצור
npm run lint     # בדיקת קוד
npm run type-check # בדיקת TypeScript
```

### Debug Mode

```bash
# הפעלת Debug logging
LOG_LEVEL=debug npm run dev

# בדיקת Health Check
curl http://localhost:3000/api/health
```

### הוספת נתונים

ניתן להוסיף נתונים ידנית על ידי עריכת הקבצים ב-`data/`:

1. `tasks.json` - משימות עם validation מלא
2. `subtasks.json` - תת-משימות עם קשר למשימה האב
3. `projects.json` - פרויקטים עם בדיקת duplicates
4. `users.json` - משתמשים עם הצפנת סיסמאות

### Backup System

המערכת יוצרת אוטומטית גיבויים לפני כל שינוי:
- `tasks.json.backup.{timestamp}`
- `subtasks.json.backup.{timestamp}`
- וכו'

## 📈 **מעקב ואנליטיקה מתקדמת**

### מדדים נתמכים

- סך ביקורים באתר
- משתמשים ייחודיים
- צפיות בדפים
- פעילות יומית
- משימות פופולריות
- זמני תגובה API
- שגיאות ו-Metrics

### דוחות בזמן אמת

- לוח בקרה מנהל
- סטטיסטיקות בזמן אמת
- ניתוח שימוש במשימות
- מעקב אחר פרויקטים
- Performance Metrics

### API Metrics

```json
{
  "requests": { "/api/tasks": 1547 },
  "errors": { "/api/auth/login": 12 },
  "responseTimes": {
    "/api/tasks": { "average": 45, "min": 12, "max": 234 }
  }
}
```

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

### הגדרות ייצור

```env
NODE_ENV=production
JWT_SECRET=your-production-secret-key
LOG_LEVEL=warn
ALLOWED_ORIGINS=https://yourdomain.com
```

## 🔒 **אבטחה לייצור**

### אמצעי אבטחה

- הצפנת סיסמאות עם bcrypt
- JWT tokens עם תפוגה
- הגנה על נתיבי מנהל
- ולידציה מקיפה של קלט משתמש
- הגנה מפני CSRF
- Rate Limiting מתקדם
- CORS מוגדר
- Input Sanitization
- Error Information Leakage Prevention

### המלצות ייצור

- שנה את סיסמת המנהל הדיפולטית
- השתמש ב-HTTPS בייצור
- הגדר JWT_SECRET חזק (32+ תווים)
- עדכן תלויות באופן קבוע
- הפעל compression ו-security headers
- הגדר monitoring ו-alerting
- השתמש ב-reverse proxy (nginx/cloudflare)

## 🤝 **תרומה לפרויקט**

### הנחיות פיתוח

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

### קוד סטנדרטים

- TypeScript חובה עם strict mode
- ESLint + Prettier
- קונבנציות שמות בעברית לממשק
- תיעוד קוד באנגלית
- Error Handling חובה בכל function
- Logging לכל פעולה משמעותית
- Tests לפונקציות קריטיות

### Testing

```bash
npm run test          # הרצת טסטים
npm run test:watch    # מצב watch
npm run test:coverage # בדיקת כיסוי
```

## 📞 **תמיכה ו-Debugging**

### בעיות נפוצות

**האפליקציה לא נטענת:**
```bash
# בדוק את הלוגים
npm run dev

# בדוק Health Check
curl http://localhost:3000/api/health
```

**בעיות התחברות מנהל:**
```bash
# בדוק את הלוגים
LOG_LEVEL=debug npm run dev

# בדוק Rate Limiting
curl -v http://localhost:3000/api/auth/login
```

**בעיות PWA:**
```bash
# בדוק Service Worker
console.log('SW registered:', await navigator.serviceWorker.getRegistrations())

# בדוק Manifest
curl http://localhost:3000/manifest.json
```

### Debug Tools

- **Health Check**: `GET /api/health`
- **Detailed Logs**: `LOG_LEVEL=debug`
- **Memory Usage**: בדיקה דרך Health endpoint
- **API Metrics**: זמינים בלוח הבקרה
- **Error Tracking**: לוגים מפורטים עם Request ID

### Performance Monitoring

```bash
# בדיקת זיכרון
curl http://localhost:3000/api/health | jq '.data.memory'

# בדיקת Response Times
curl -w "@curl-format.txt" http://localhost:3000/api/tasks
```

### יצירת קשר

- **Email**: support@mobileye.com
- **GitHub Issues**: [פתח issue חדש](https://github.com/your-repo/issues)
- **Debug Info**: צרף תמיד לוגים ו-Health Check output

## 📄 **רישיון**

© 2025 Mobileye - EyeTask. כל הזכויות שמורות.

---

**EyeTask v2.0** - מערכת ניהול משימות מתקדמת עם Error Handling מקיף, Security מתקדם, ו-Monitoring כולל לנהגי Mobileye 🚗👁️
