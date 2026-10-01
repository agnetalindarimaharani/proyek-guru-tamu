const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { logActivity } = require('../helpers/activityLog');

const authController = {
  // Menampilkan Halaman Login
  showLoginForm: (req, res) => {
    if (req.session && req.session.user) {
      return res.redirect('/dashboard');
    }
    res.render('auth/login', {
      title: 'Login - Sarpras Lab RPL & Elektronika',
      error: req.query.error || null,
      success: req.query.success || null
    });
  },

  // Memproses Login Manual
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.render('auth/login', {
          title: 'Login - Sarpras Lab RPL & Elektronika',
          error: 'Username dan password wajib diisi!',
          success: null
        });
      }

      const user = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() }
      });

      if (!user) {
        return res.render('auth/login', {
          title: 'Login - Sarpras Lab RPL & Elektronika',
          error: 'Username tidak terdaftar di sistem laboratorium!',
          success: null
        });
      }

      // Verifikasi Password menggunakan bcrypt
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render('auth/login', {
          title: 'Login - Sarpras Lab RPL & Elektronika',
          error: 'Password salah! Periksa kembali kredensial Anda.',
          success: null
        });
      }

      // Set Session Pengguna
      req.session.user = {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nisn: user.nisn,
        telepon: user.telepon
      };

      // Catat Log Aktivitas
      await logActivity(user.id, 'LOGIN', `Pengguna ${user.nama} (${user.role}) berhasil masuk ke sistem.`);

      return res.redirect('/dashboard');
    } catch (error) {
      console.error('Error saat login:', error);
      return res.render('auth/login', {
        title: 'Login - Sarpras Lab RPL & Elektronika',
        error: 'Terjadi kesalahan sistem saat proses otentikasi.',
        success: null
      });
    }
  },

  // Fitur Quick Demo Login (Sangat mempermudah penguji/asesor UKK)
  demoLogin: async (req, res) => {
    try {
      const targetRole = req.params.role.toUpperCase();
      let targetUsername = 'admin';

      if (targetRole === 'TOOLMAN') targetUsername = 'toolman';
      if (targetRole === 'PEMINJAM') targetUsername = 'peminjam';

      const user = await prisma.user.findUnique({
        where: { username: targetUsername }
      });

      if (!user) {
        return res.redirect('/login?error=' + encodeURIComponent(`Akun demo ${targetRole} tidak ditemukan.`));
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        nisn: user.nisn,
        telepon: user.telepon
      };

      await logActivity(user.id, 'DEMO_LOGIN', `Pengguna ${user.nama} masuk menggunakan tombol Fast Switch Demo (${user.role}).`);
      return res.redirect('/dashboard');
    } catch (error) {
      console.error('Error demo login:', error);
      return res.redirect('/login?error=' + encodeURIComponent('Gagal masuk menggunakan akun demo.'));
    }
  },

  // Memproses Logout
  logout: async (req, res) => {
    try {
      if (req.session && req.session.user) {
        await logActivity(req.session.user.id, 'LOGOUT', `Pengguna ${req.session.user.nama} keluar dari sistem.`);
        req.session.destroy((err) => {
          if (err) console.error('Gagal destroy session:', err);
          res.redirect('/login?success=' + encodeURIComponent('Anda telah berhasil keluar dari sistem.'));
        });
      } else {
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error saat logout:', error);
      res.redirect('/login');
    }
  }
};

module.exports = authController;
