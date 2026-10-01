const express = require('express');
const router = express.Router();
const borrowingController = require('../controllers/borrowing.controller');
const { isAuthenticated, authorize } = require('../middlewares/auth.middleware');

// Seluruh rute peminjaman membutuhkan status login
router.use(isAuthenticated);

// 1. Tampilkan Daftar Sirkulasi Peminjaman (Admin: Semua, Toolman: Semua/Sirkulasi, Peminjam: Milik Sendiri)
router.get('/', borrowingController.index);

// 2. Pengajuan Pinjam Alat (Peminjam: Siswa / Guru)
router.post('/submit', authorize('PEMINJAM', 'ADMIN'), borrowingController.submitBorrow);

// 3. Konfirmasi Serahkan ke Meja Toolman (Peminjam)
router.post('/:id/notify-return', authorize('PEMINJAM'), borrowingController.notifyReturn);

// 4. Approval Peminjaman (Khusus Toolman)
router.post('/:id/approve', authorize('TOOLMAN'), borrowingController.approve);

// 5. Penolakan Peminjaman (Khusus Toolman)
router.post('/:id/reject', authorize('TOOLMAN'), borrowingController.reject);

// 6. Proses Pengembalian & Cek Fisik / Denda (Khusus Toolman)
router.post('/:id/return', authorize('TOOLMAN'), borrowingController.processReturn);

// 7. Input Langsung & Hapus Peminjaman (Khusus Admin)
router.post('/admin-create', authorize('ADMIN'), borrowingController.adminCreate);
router.post('/:id/delete', authorize('ADMIN'), borrowingController.delete);

module.exports = router;
