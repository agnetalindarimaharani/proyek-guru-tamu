const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { isAuthenticated, authorize } = require('../middlewares/auth.middleware');

// Seluruh rute manajemen pengguna HANYA bisa diakses oleh role ADMIN
router.use(isAuthenticated, authorize('ADMIN'));

router.get('/', userController.index);
router.post('/create', userController.create);
router.post('/:id/update', userController.update);
router.post('/:id/delete', userController.delete);

module.exports = router;
