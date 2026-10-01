const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { isAuthenticated, authorize } = require('../middlewares/auth.middleware');

// Seluruh rute kategori alat HANYA bisa diakses oleh role ADMIN
router.use(isAuthenticated, authorize('ADMIN'));

router.get('/', categoryController.index);
router.post('/create', categoryController.create);
router.post('/:id/update', categoryController.update);
router.post('/:id/delete', categoryController.delete);

module.exports = router;
