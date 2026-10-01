const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const prisma = require('./config/db');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const toolRoutes = require('./routes/tool.routes');
const borrowingRoutes = require('./routes/borrowing.routes');
const reportRoutes = require('./routes/report.routes');
const logRoutes = require('./routes/log.routes');

const app = express();
let currentPort = Number(process.env.PORT) || 3000;

// 1. Konfigurasi View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 2. Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 3. Konfigurasi Express Session (Session-based Auth & RBAC)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sarpras-lab-rpl-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 jam
    }
  })
);

// 4. Global Template Helpers & Variables
app.use((req, res, next) => {
  res.locals.appName = 'SARPRAS LAB RPL & ELEKTRONIKA';
  res.locals.schoolName = 'SMK Telkom';
  res.locals.user = req.session ? req.session.user : null;

  // Helper Format Rupiah
  res.locals.formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  // Helper Format Tanggal
  res.locals.formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper Format Tanggal & Jam
  res.locals.formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  next();
});

// 5. Mount Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/', toolRoutes);
app.use('/borrowings', borrowingRoutes);
app.use('/reports', reportRoutes);
app.use('/logs', logRoutes);

// 6. 404 Route Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Halaman Tidak Ditemukan',
    user: req.session ? req.session.user : null,
    currentPage: '404'
  });
});

// 7. Error 500 Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).render('errors/500', {
    title: '500 - Kesalahan Server',
    message: err.message,
    user: req.session ? req.session.user : null,
    currentPage: '500'
  });
});

// 8. Graceful Shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n🛑 Server Express & Prisma dimatikan.');
  process.exit(0);
});

// 9. Fungsi Start Server dengan Auto Port Fallback
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('=======================================================');
    console.log('🔬 SISTEM PEMINJAMAN SARPRAS LAB RPL & ELEKTRONIKA');
    console.log('🏫 Standar UKK / Industri — SMK Telkom');
    console.log(`🌐 Akses Server: http://localhost:${port}`);
    console.log('=======================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} sedang digunakan oleh aplikasi lain. Mencoba port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}

startServer(currentPort);

module.exports = app;
