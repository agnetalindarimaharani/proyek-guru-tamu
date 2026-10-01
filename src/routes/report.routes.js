const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { isAuthenticated, authorize } = require('../middlewares/auth.middleware');

// Laporan peminjaman dapat diakses dan dicetak oleh Toolman dan Admin (Kepala Lab)
router.use(isAuthenticated, authorize('TOOLMAN', 'ADMIN'));

router.get('/', reportController.index);
router.get('/print', reportController.print);

module.exports = router;
