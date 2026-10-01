const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const { isAuthenticated, authorize } = require('../middlewares/auth.middleware');

// Log Audit Aktivitas Lab HANYA dapat diakses oleh Admin (Kepala Lab)
router.use(isAuthenticated, authorize('ADMIN'));

router.get('/', logController.index);

module.exports = router;
