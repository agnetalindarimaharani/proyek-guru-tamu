const prisma = require('../config/db');

const logController = {
  index: async (req, res) => {
    try {
      const { search, aksi } = req.query;
      const where = {};

      if (aksi && aksi !== 'ALL') {
        where.aksi = aksi;
      }

      if (search) {
        where.OR = [
          { keterangan: { contains: search } },
          { user: { nama: { contains: search } } },
          { user: { username: { contains: search } } }
        ];
      }

      const [logs, distinctAksi] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 100 // Ambil 100 log terakhir
        }),
        prisma.activityLog.findMany({
          distinct: ['aksi'],
          select: { aksi: true }
        })
      ]);

      res.render('logs/index', {
        title: 'Audit Log Aktifitas Sirkulasi Laboratorium',
        logs,
        distinctAksi: distinctAksi.map(a => a.aksi),
        filterAksi: aksi || 'ALL',
        search: search || '',
        currentPage: 'logs'
      });
    } catch (error) {
      console.error('Error log index:', error);
      res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat log aktifitas: ' + error.message));
    }
  }
};

module.exports = logController;
