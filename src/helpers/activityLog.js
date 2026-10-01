const prisma = require('../config/db');

/**
 * Mencatat log aktivitas sistem laboratorium
 * @param {number|null} userId - ID pengguna yang melakukan aksi
 * @param {string} aksi - Kode aksi (contoh: LOGIN, AJUKAN_PINJAM, SETUJUI_PINJAM, INSPEKSI_RUSAK, dll)
 * @param {string} keterangan - Rincian deskriptif aktivitas
 */
async function logActivity(userId, aksi, keterangan) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId ? Number(userId) : null,
        aksi,
        keterangan
      }
    });
  } catch (error) {
    console.error('⚠️ Gagal menyimpan ActivityLog:', error.message);
  }
}

module.exports = { logActivity };
