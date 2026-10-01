const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// GET & POST Login
router.get('/login', authController.showLoginForm);
router.post('/login', authController.login);

// Quick Demo Switch Login
router.get('/login/demo/:role', authController.demoLogin);

// Logout
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

module.exports = router;
