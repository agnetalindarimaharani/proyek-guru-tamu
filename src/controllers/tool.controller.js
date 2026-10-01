const prisma = require('../config/db');
const { logActivity } = require('../helpers/activityLog');

const toolController = {
  // 1. Tampilkan Daftar Inventaris Alat (Admin & Toolman View)
  index: async (req, res) => {
    try {
      const { search, categoryId, kondisi } = req.query;
      const where = {};

      if (categoryId) {
        where.categoryId = parseInt(categoryId);
      }

      if (kondisi && ['BAIK', 'RUSAK'].includes(kondisi)) {
        where.kondisi = kondisi;
      }

      if (search) {
        where.OR = [
          { namaAlat: { contains: search } },
          { spesifikasi: { contains: search } }
        ];
      }

      const [tools, categories] = await Promise.all([
        prisma.tool.findMany({
          where,
          include: { category: true },
          orderBy: { id: 'desc' }
        }),
        prisma.category.findMany({ orderBy: { namaKategori: 'asc' } })
      ]);

      res.render('tools/index', {
        title: 'Inventaris Sarana Alat Praktikum',
        tools,
        categories,
        search: search || '',
        filterCategoryId: categoryId || '',
        filterKondisi: kondisi || '',
        currentPage: 'tools',
        success: req.query.success || null,
        error: req.query.error || null
      });
    } catch (error) {
      console.error('Error tool index:', error);
      res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat inventaris: ' + error.message));
    }
  },

  // 2. Tampilan Katalog Alat untuk Peminjam (Siswa / Guru)
  catalog: async (req, res) => {
    try {
      const { search, categoryId } = req.query;
      const where = {};

      if (categoryId) {
        where.categoryId = parseInt(categoryId);
      }

      if (search) {
        where.OR = [
          { namaAlat: { contains: search } },
          { spesifikasi: { contains: search } }
        ];
      }

      const [tools, categories] = await Promise.all([
        prisma.tool.findMany({
          where,
          include: { category: true },
          orderBy: { stok: 'desc' }
        }),
        prisma.category.findMany({ orderBy: { namaKategori: 'asc' } })
      ]);

      res.render('tools/catalog', {
        title: 'Katalog Alat Praktikum Lab',
        tools,
        categories,
        search: search || '',
        filterCategoryId: categoryId || '',
        currentPage: 'catalog',
        success: req.query.success || null,
        error: req.query.error || null
      });
    } catch (error) {
      console.error('Error tool catalog:', error);
      res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat katalog alat: ' + error.message));
    }
  },

  // 3. Tambah Alat Baru (Admin)
  create: async (req, res) => {
    try {
      const { namaAlat, spesifikasi, stok, kondisi, categoryId } = req.body;

      if (!namaAlat || !spesifikasi || !stok || !categoryId) {
        return res.redirect('/tools?error=' + encodeURIComponent('Semua field wajib diisi!'));
      }

      const parsedStok = parseInt(stok);
      const parsedCatId = parseInt(categoryId);

      if (isNaN(parsedStok) || parsedStok < 0) {
        return res.redirect('/tools?error=' + encodeURIComponent('Stok harus berupa angka >= 0'));
      }

      const newTool = await prisma.tool.create({
        data: {
          namaAlat: namaAlat.trim(),
          spesifikasi: spesifikasi.trim(),
          stok: parsedStok,
          kondisi: kondisi || 'BAIK',
          categoryId: parsedCatId
        },
        include: { category: true }
      });

      await logActivity(
        req.session.user.id,
        'CREATE_TOOL',
        `Menambahkan inventaris alat baru: ${newTool.namaAlat} (Kategori: ${newTool.category.namaKategori}, Stok: ${newTool.stok} unit, Kondisi: ${newTool.kondisi})`
      );

      res.redirect('/tools?success=' + encodeURIComponent(`Alat praktikum "${newTool.namaAlat}" berhasil ditambahkan ke inventaris!`));
    } catch (error) {
      console.error('Error create tool:', error);
      res.redirect('/tools?error=' + encodeURIComponent('Gagal menambahkan alat: ' + error.message));
    }
  },

  // 4. Update Alat (Admin)
  update: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { namaAlat, spesifikasi, stok, kondisi, categoryId } = req.body;

      const parsedStok = parseInt(stok);
      const parsedCatId = parseInt(categoryId);

      const updated = await prisma.tool.update({
        where: { id },
        data: {
          namaAlat: namaAlat.trim(),
          spesifikasi: spesifikasi.trim(),
          stok: parsedStok,
          kondisi: kondisi || 'BAIK',
          categoryId: parsedCatId
        },
        include: { category: true }
      });

      await logActivity(
        req.session.user.id,
        'UPDATE_TOOL',
        `Memperbarui inventaris alat ID ${id}: ${updated.namaAlat} (Stok: ${updated.stok}, Kondisi: ${updated.kondisi})`
      );

      res.redirect('/tools?success=' + encodeURIComponent(`Inventaris "${updated.namaAlat}" berhasil diperbarui!`));
    } catch (error) {
      console.error('Error update tool:', error);
      res.redirect('/tools?error=' + encodeURIComponent('Gagal memperbarui alat: ' + error.message));
    }
  },

  // 5. Hapus Alat (Admin)
  delete: async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const tool = await prisma.tool.findUnique({
        where: { id },
        include: { _count: { select: { borrowings: true } } }
      });

      if (!tool) {
        return res.redirect('/tools?error=' + encodeURIComponent('Alat tidak ditemukan.'));
      }

      // Cek apakah ada transaksi peminjaman aktif
      const activeBorrowings = await prisma.borrowing.count({
        where: {
          toolId: id,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (activeBorrowings > 0) {
        return res.redirect('/tools?error=' + encodeURIComponent(`Alat "${tool.namaAlat}" tidak dapat dihapus karena sedang dalam proses peminjaman/persetujuan aktif (${activeBorrowings} transaksi).`));
      }

      await prisma.tool.delete({ where: { id } });

      await logActivity(
        req.session.user.id,
        'DELETE_TOOL',
        `Menghapus alat inventaris: ${tool.namaAlat}`
      );

      res.redirect('/tools?success=' + encodeURIComponent(`Alat "${tool.namaAlat}" berhasil dihapus!`));
    } catch (error) {
      console.error('Error delete tool:', error);
      res.redirect('/tools?error=' + encodeURIComponent('Gagal menghapus alat: ' + error.message));
    }
  }
};

module.exports = toolController;
