const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'CSMS ver2 API 정상 동작 중',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ping', (req, res) => {
  res.send('pong');
});

module.exports = router;

