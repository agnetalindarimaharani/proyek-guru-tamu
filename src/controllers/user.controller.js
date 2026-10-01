const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { logActivity } = require('../helpers/activityLog');

const userController = {
  // 1. Tampilkan Daftar Pengguna
  index: async (req, res) => {
    try {
      const { search, role } = req.query;
      const where = {};

      if (role && ['ADMIN', 'TOOLMAN', 'PEMINJAM'].includes(role)) {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { nama: { contains: search } },
          { username: { contains: search } },
          { nisn: { contains: search } }
        ];
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { borrowings: true }
          }
        }
      });

      res.render('users/index', {
        title: 'Manajemen Data Pengguna (User)',
        users,
        search: search || '',
        filterRole: role || '',
        currentPage: 'users',
        success: req.query.success || null,
        error: req.query.error || null
      });
    } catch (error) {
      console.error('Error user index:', error);
      res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat data pengguna: ' + error.message));
    }
  },

  // 2. Tambah Pengguna Baru
  create: async (req, res) => {
    try {
      const { username, password, nama, role, nisn, telepon } = req.body;

      if (!username || !password || !nama || !role) {
        return res.redirect('/users?error=' + encodeURIComponent('Field username, password, nama, dan role wajib diisi!'));
      }

      // Cek apakah username sudah ada
      const existing = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() }
      });

      if (existing) {
        return res.redirect('/users?error=' + encodeURIComponent(`Username "${username}" sudah digunakan.`));
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          username: username.trim().toLowerCase(),
          password: hashedPassword,
          nama: nama.trim(),
          role: role.toUpperCase(),
          nisn: nisn ? nisn.trim() : null,
          telepon: telepon ? telepon.trim() : null
        }
      });

      await logActivity(
        req.session.user.id,
        'CREATE_USER',
        `Menambahkan pengguna baru: ${newUser.nama} (${newUser.username}) dengan role ${newUser.role}`
      );

      res.redirect('/users?success=' + encodeURIComponent(`Pengguna ${newUser.nama} berhasil ditambahkan!`));
    } catch (error) {
      console.error('Error create user:', error);
      res.redirect('/users?error=' + encodeURIComponent('Gagal membuat user: ' + error.message));
    }
  },

  // 3. Update Pengguna
  update: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { nama, role, nisn, telepon, newPassword } = req.body;

      const dataToUpdate = {
        nama: nama.trim(),
        role: role.toUpperCase(),
        nisn: nisn ? nisn.trim() : null,
        telepon: telepon ? telepon.trim() : null
      };

      if (newPassword && newPassword.trim() !== '') {
        dataToUpdate.password = await bcrypt.hash(newPassword.trim(), 10);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: dataToUpdate
      });

      await logActivity(
        req.session.user.id,
        'UPDATE_USER',
        `Memperbarui profil pengguna: ${updated.nama} (${updated.username}) - Role: ${updated.role}`
      );

      res.redirect('/users?success=' + encodeURIComponent(`Data pengguna ${updated.nama} berhasil diperbarui!`));
    } catch (error) {
      console.error('Error update user:', error);
      res.redirect('/users?error=' + encodeURIComponent('Gagal update pengguna: ' + error.message));
    }
  },

  // 4. Hapus Pengguna
  delete: async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (id === req.session.user.id) {
        return res.redirect('/users?error=' + encodeURIComponent('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!'));
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: { _count: { select: { borrowings: true } } }
      });

      if (!targetUser) {
        return res.redirect('/users?error=' + encodeURIComponent('Pengguna tidak ditemukan.'));
      }

      await prisma.user.delete({
        where: { id }
      });

      await logActivity(
        req.session.user.id,
        'DELETE_USER',
        `Menghapus pengguna: ${targetUser.nama} (${targetUser.username})`
      );

      res.redirect('/users?success=' + encodeURIComponent(`Pengguna ${targetUser.nama} berhasil dihapus!`));
    } catch (error) {
      console.error('Error delete user:', error);
      res.redirect('/users?error=' + encodeURIComponent('Gagal menghapus pengguna: ' + error.message));
    }
  }
};

module.exports = userController;
