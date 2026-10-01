const express = require('express');
const router = express.Router();
const toolController = require('../controllers/tool.controller');
const { isAuthenticated, authorize } = require('../middlewares/auth.middleware');

// 1. Katalog Alat Praktikum (Bisa diakses oleh semua pengguna yang sudah login)
router.get('/catalog', isAuthenticated, toolController.catalog);

// 2. Manajemen Inventaris Alat (HANYA role ADMIN yang dapat melakukan CRUD master alat)
router.get('/tools', isAuthenticated, authorize('ADMIN'), toolController.index);
router.post('/tools/create', isAuthenticated, authorize('ADMIN'), toolController.create);
router.post('/tools/:id/update', isAuthenticated, authorize('ADMIN'), toolController.update);
router.post('/tools/:id/delete', isAuthenticated, authorize('ADMIN'), toolController.delete);

module.exports = router;
