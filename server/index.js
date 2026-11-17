import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import { authRouter } from './routes/auth.js';
import { attendanceRouter } from './routes/attendance.js';
import { leaveRouter } from './routes/leave_requests.js';
import { announcementsRouter } from './routes/announcements.js';
import { feedbackRouter } from './routes/feedbacks.js';
import { notificationsRouter } from './routes/notifications.js';
import { gradebookRouter } from './routes/gradebook.js';
import { assignmentsRouter } from './routes/assignments.js';
import { labQueueRouter } from './routes/lab_queue.js';
import { flashQuizRouter } from './routes/flash_quiz.js';
import { aiMindmapsRouter } from './routes/ai_mindmaps.js';
import { groupProjectsRouter } from './routes/group_projects.js';
import { drlRiskRouter } from './routes/drl_risk.js';
import { classroomLiveRouter } from './routes/classroom_live.js';
import { gamificationRouter } from './routes/gamification.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS?.trim();
const parsedAllowedOrigins = !rawAllowedOrigins || rawAllowedOrigins === '*'
  ? '*'
  : rawAllowedOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
const corsOrigin = parsedAllowedOrigins === '*' || parsedAllowedOrigins.length === 0
  ? '*'
  : parsedAllowedOrigins;

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(self "*"), camera=(self "*"), microphone=(self "*"), display-capture=(self "*")');
  res.setHeader('Feature-Policy', "geolocation 'self' *; camera 'self' *; microphone 'self' *; display-capture 'self' *");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Initialize SQLite database
initDatabase();

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/leave-requests', leaveRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/feedbacks', feedbackRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/gradebook', gradebookRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/lab-queue', labQueueRouter);
app.use('/api/flash-quiz', flashQuizRouter);
app.use('/api/ai-mindmaps', aiMindmapsRouter);
app.use('/api/group-projects', groupProjectsRouter);
app.use('/api/drl-risk', drlRiskRouter);
app.use('/api/classroom-live', classroomLiveRouter);
app.use('/api/gamification', gamificationRouter);

// Root health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'EG Education Platform API',
    version: '2.4.0',
    database: 'SQLite (node:sqlite native)',
    modules: [
      'auth', 'attendance', 'leave-requests', 'announcements',
      'feedbacks', 'notifications', 'gradebook', 'assignments',
      'lab-queue', 'flash-quiz', 'leave-ai-makeup', 'ai-mindmaps',
      'group-projects', 'drl-risk', 'classroom-live', 'gamification'
    ],
    timestamp: new Date().toISOString()
  });
});

// API-scoped 404 Handler (must stay after all /api routes and /api/health)
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Đường dẫn API "${req.originalUrl}" không tồn tại trên máy chủ!`
  });
});

// Serve built frontend static files (Unified Production Server)
const distPath = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distPath, 'index.html');
const staticMiddleware = express.static(distPath, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
});

app.use((req, res, next) => {
  if (fs.existsSync(indexHtmlPath)) {
    return staticMiddleware(req, res, next);
  }
  return next();
});

// SPA Fallback for client-side routes (Express 5 regex wildcard)
app.get(/.*/, (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }
  return res.status(404).json({
    success: false,
    message: 'Frontend dist/ chưa được build!'
  });
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 EG Education Backend Server running on: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  if (fs.existsSync(indexHtmlPath)) {
    console.log(`🌐 Frontend SPA Static Serving: http://localhost:${PORT}/ (from ${distPath})`);
  }
  console.log(`🔑 Auth Endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`📡 Attendance API: http://localhost:${PORT}/api/attendance`);
  console.log(`📋 Leave Requests: http://localhost:${PORT}/api/leave-requests`);
  console.log(`📢 Announcements: http://localhost:${PORT}/api/announcements`);
  console.log(`💬 Feedbacks: http://localhost:${PORT}/api/feedbacks`);
  console.log(`🔔 Notifications: http://localhost:${PORT}/api/notifications`);
  console.log(`📊 Gradebook API: http://localhost:${PORT}/api/gradebook`);
  console.log(`📚 Assignments API: http://localhost:${PORT}/api/assignments`);
  console.log(`💻 Lab Queue FIFO: http://localhost:${PORT}/api/lab-queue`);
  console.log(`⚡ Live Flash Quiz 45s: http://localhost:${PORT}/api/flash-quiz`);
  console.log(`=======================================================`);
});
