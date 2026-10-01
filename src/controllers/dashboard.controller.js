const prisma = require('../config/db');

const dashboardController = {
  index: async (req, res) => {
    try {
      const user = req.session.user;

      if (user.role === 'ADMIN') {
        // Data Statistik Admin
        const [
          totalUsers,
          totalTools,
          totalCategories,
          totalBorrowings,
          pendingCount,
          activeCount,
          returnedCount,
          damagedToolsCount,
          recentLogs,
          recentBorrowings
        ] = await Promise.all([
          prisma.user.count(),
          prisma.tool.count(),
          prisma.category.count(),
          prisma.borrowing.count(),
          prisma.borrowing.count({ where: { status: 'PENDING' } }),
          prisma.borrowing.count({ where: { status: 'APPROVED' } }),
          prisma.borrowing.count({ where: { status: 'RETURNED' } }),
          prisma.tool.count({ where: { kondisi: 'RUSAK' } }),
          prisma.activityLog.findMany({
            take: 8,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
          }),
          prisma.borrowing.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: { user: true, tool: true, toolman: true }
          })
        ]);

        // Total denda
        const dendaAggregate = await prisma.borrowing.aggregate({
          _sum: { denda: true }
        });
        const totalDenda = dendaAggregate._sum.denda || 0;

        return res.render('dashboard/admin', {
          title: 'Dashboard Kepala Lab (Admin)',
          user,
          stats: {
            totalUsers,
            totalTools,
            totalCategories,
            totalBorrowings,
            pendingCount,
            activeCount,
            returnedCount,
            damagedToolsCount,
            totalDenda
          },
          recentLogs,
          recentBorrowings,
          currentPage: 'dashboard'
        });
      }

      if (user.role === 'TOOLMAN') {
        // Data Statistik Toolman
        const [
          pendingApprovals,
          activeLoans,
          returnedToday,
          totalTools,
          recentPendingList,
          recentActiveList
        ] = await Promise.all([
          prisma.borrowing.count({ where: { status: 'PENDING' } }),
          prisma.borrowing.count({ where: { status: 'APPROVED' } }),
          prisma.borrowing.count({
            where: {
              status: 'RETURNED',
              tglKembaliReal: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          }),
          prisma.tool.count(),
          prisma.borrowing.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            include: { user: true, tool: true }
          }),
          prisma.borrowing.findMany({
            where: { status: 'APPROVED' },
            orderBy: { tglKembaliRencana: 'asc' },
            include: { user: true, tool: true }
          })
        ]);

        return res.render('dashboard/toolman', {
          title: 'Dashboard Toolman & Laboran',
          user,
          stats: {
            pendingApprovals,
            activeLoans,
            returnedToday,
            totalTools
          },
          recentPendingList,
          recentActiveList,
          currentPage: 'dashboard'
        });
      }

      // Role: PEMINJAM (Siswa / Guru)
      const [
        myPendingCount,
        myActiveCount,
        myReturnedCount,
        myBorrowings,
        availableTools
      ] = await Promise.all([
        prisma.borrowing.count({ where: { userId: user.id, status: 'PENDING' } }),
        prisma.borrowing.count({ where: { userId: user.id, status: 'APPROVED' } }),
        prisma.borrowing.count({ where: { userId: user.id, status: 'RETURNED' } }),
        prisma.borrowing.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 6,
          include: { tool: { include: { category: true } }, toolman: true }
        }),
        prisma.tool.findMany({
          where: { stok: { gt: 0 }, kondisi: 'BAIK' },
          take: 4,
          include: { category: true }
        })
      ]);

      return res.render('dashboard/peminjam', {
        title: 'Dashboard Peminjam Lab',
        user,
        stats: {
          myPendingCount,
          myActiveCount,
          myReturnedCount
        },
        myBorrowings,
        availableTools,
        currentPage: 'dashboard'
      });
    } catch (error) {
      console.error('Error saat memuat dashboard:', error);
      res.status(500).render('errors/500', {
        title: '500 - Internal Server Error',
        message: 'Gagal memuat halaman dashboard: ' + error.message,
        currentPage: 'error'
      });
    }
  }
};

module.exports = dashboardController;
