const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const healthRouter = require('./routes/health.route');
const authRouter = require('./routes/auth.route');
const employeeRouter = require('./routes/employee.route');
const ownerRouter = require('./routes/owner.route');
const workScheduleRouter = require('./routes/workSchedule.route');

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
});

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    name: 'CSMS ver2 API',
    docs: '/api/docs',
    status: 'ok',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/employee', employeeRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/work-schedule', workScheduleRouter);

app.use((req, res) => {
  res.status(404).json({ message: '요청하신 리소스를 찾을 수 없습니다.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || '서버 오류가 발생했습니다.' });
  next();
});

module.exports = app;

