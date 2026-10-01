const prisma = require('../config/db');

const reportController = {
  // Halaman Filter & Preview Laporan
  index: async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const where = {};

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (startDate || endDate) {
        where.tglPinjam = {};
        if (startDate) where.tglPinjam.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.tglPinjam.lte = end;
        }
      }

      const borrowings = await prisma.borrowing.findMany({
        where,
        include: {
          user: true,
          tool: { include: { category: true } },
          toolman: true
        },
        orderBy: { tglPinjam: 'desc' }
      });

      // Statistik ringkas
      const totalTransaksi = borrowings.length;
      const totalDenda = borrowings.reduce((acc, curr) => acc + (curr.denda || 0), 0);
      const totalSelesai = borrowings.filter(b => b.status === 'RETURNED').length;
      const totalAktif = borrowings.filter(b => b.status === 'APPROVED').length;

      res.render('reports/index', {
        title: 'Laporan Sirkulasi Peminjaman Sarpras Lab',
        borrowings,
        filters: {
          startDate: startDate || '',
          endDate: endDate || '',
          status: status || 'ALL'
        },
        stats: {
          totalTransaksi,
          totalDenda,
          totalSelesai,
          totalAktif
        },
        currentPage: 'reports'
      });
    } catch (error) {
      console.error('Error report index:', error);
      res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat laporan: ' + error.message));
    }
  },

  // Halaman Khusus Cetak / Print PDF (Clean Paper Print Layout)
  print: async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const where = {};

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (startDate || endDate) {
        where.tglPinjam = {};
        if (startDate) where.tglPinjam.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.tglPinjam.lte = end;
        }
      }

      const [borrowings, kepalaLab, toolman] = await Promise.all([
        prisma.borrowing.findMany({
          where,
          include: {
            user: true,
            tool: { include: { category: true } },
            toolman: true
          },
          orderBy: { tglPinjam: 'desc' }
        }),
        prisma.user.findFirst({ where: { role: 'ADMIN' } }),
        prisma.user.findFirst({ where: { role: 'TOOLMAN' } })
      ]);

      const totalDenda = borrowings.reduce((acc, curr) => acc + (curr.denda || 0), 0);

      res.render('reports/print', {
        title: 'Cetak Laporan Sirkulasi Sarpras Lab',
        borrowings,
        kepalaLab,
        toolman,
        filters: {
          startDate: startDate || '',
          endDate: endDate || '',
          status: status || 'ALL'
        },
        totalDenda,
        printDate: new Date()
      });
    } catch (error) {
      console.error('Error print report:', error);
      res.redirect('/reports?error=' + encodeURIComponent('Gagal mencetak laporan: ' + error.message));
    }
  }
};

module.exports = reportController;
