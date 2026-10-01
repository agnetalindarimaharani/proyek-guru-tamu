/**
 * Middleware untuk memastikan pengguna sudah login
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login?error=' + encodeURIComponent('Silakan login terlebih dahulu untuk mengakses sistem.'));
}

/**
 * Middleware untuk membatasi akses berdasarkan Role (RBAC)
 * @param  {...string} roles - Daftar role yang diizinkan (ADMIN, TOOLMAN, PEMINJAM)
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login?error=' + encodeURIComponent('Sesi Anda telah berakhir. Silakan login kembali.'));
    }

    const userRole = req.session.user.role;
    if (roles.length > 0 && !roles.includes(userRole)) {
      return res.status(403).render('errors/403', {
        title: '403 - Akses Ditolak',
        message: `Role Anda (${userRole}) tidak memiliki izin untuk mengakses halaman ini.`,
        user: req.session.user,
        currentPage: '403'
      });
    }

    next();
  };
}

module.exports = {
  isAuthenticated,
  authorize
};
