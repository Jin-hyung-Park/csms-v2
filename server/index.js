const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import models to register schemas
require('./models/User');
require('./models/WorkSchedule');
require('./models/Store');
require('./models/Notification');
require('./models/Expense');
require('./models/FixedExpense');

// Routes
const authRoutes = require('./routes/auth');
const workScheduleRoutes = require('./routes/workSchedule');
const notificationRoutes = require('./routes/notification');
const employeeRoutes = require('./routes/employee');
const ownerRoutes = require('./routes/owner');
const expenseRoutes = require('./routes/expense');
const fixedExpenseRoutes = require('./routes/fixedExpense');
const storeRoutes = require('./routes/store');
const monthlySalaryRoutes = require('./routes/monthlySalary');

const app = express();

// Trust proxy - Nginx를 통한 프록시 요청 허용
app.set('trust proxy', true);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:3000',
    'http://convenience-store-frontend-1759642357.s3-website.ap-northeast-2.amazonaws.com'
  ],
  credentials: true
}));

// Rate limiting - 주차별 통계 API는 데이터 양이 많아서 제한 완화
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // production에서 200회로 증가
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 헬스 체크는 제한 제외
    return req.path === '/health';
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/work-schedule', workScheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/expense', expenseRoutes);
app.use('/api/fixed-expense', fixedExpenseRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/monthly-salary', monthlySalaryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app; 