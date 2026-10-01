const prisma = require('../config/db');
const { logActivity } = require('../helpers/activityLog');

const categoryController = {
  // 1. Tampilkan Semua Kategori
  index: async (req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { id: 'asc' },
        include: {
          _count: {
            select: { tools: true }
          }
        }
      });

      res.render('categories/index', {
        title: 'Kategori Alat Laboratorium',
        categories,
        currentPage: 'categories',
        success: req.query.success || null,
        error: req.query.error || null
      });
    } catch (error) {
      console.error('Error category index:', error);
      res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat kategori: ' + error.message));
    }
  },

  // 2. Tambah Kategori Baru
  create: async (req, res) => {
    try {
      const { namaKategori } = req.body;

      if (!namaKategori || namaKategori.trim() === '') {
        return res.redirect('/categories?error=' + encodeURIComponent('Nama kategori wajib diisi!'));
      }

      const newCat = await prisma.category.create({
        data: {
          namaKategori: namaKategori.trim()
        }
      });

      await logActivity(
        req.session.user.id,
        'CREATE_CATEGORY',
        `Menambahkan kategori alat baru: ${newCat.namaKategori}`
      );

      res.redirect('/categories?success=' + encodeURIComponent(`Kategori "${newCat.namaKategori}" berhasil dibuat!`));
    } catch (error) {
      console.error('Error create category:', error);
      res.redirect('/categories?error=' + encodeURIComponent('Gagal membuat kategori: ' + error.message));
    }
  },

  // 3. Update Kategori
  update: async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { namaKategori } = req.body;

      if (!namaKategori || namaKategori.trim() === '') {
        return res.redirect('/categories?error=' + encodeURIComponent('Nama kategori tidak boleh kosong!'));
      }

      const updated = await prisma.category.update({
        where: { id },
        data: { namaKategori: namaKategori.trim() }
      });

      await logActivity(
        req.session.user.id,
        'UPDATE_CATEGORY',
        `Memperbarui kategori alat ID ${id} menjadi "${updated.namaKategori}"`
      );

      res.redirect('/categories?success=' + encodeURIComponent(`Kategori berhasil diperbarui menjadi "${updated.namaKategori}"!`));
    } catch (error) {
      console.error('Error update category:', error);
      res.redirect('/categories?error=' + encodeURIComponent('Gagal update kategori: ' + error.message));
    }
  },

  // 4. Hapus Kategori
  delete: async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const target = await prisma.category.findUnique({
        where: { id },
        include: { _count: { select: { tools: true } } }
      });

      if (!target) {
        return res.redirect('/categories?error=' + encodeURIComponent('Kategori tidak ditemukan.'));
      }

      if (target._count.tools > 0) {
        return res.redirect('/categories?error=' + encodeURIComponent(`Kategori "${target.namaKategori}" tidak dapat dihapus karena masih menampung ${target._count.tools} alat praktikum.`));
      }

      await prisma.category.delete({ where: { id } });

      await logActivity(
        req.session.user.id,
        'DELETE_CATEGORY',
        `Menghapus kategori alat: ${target.namaKategori}`
      );

      res.redirect('/categories?success=' + encodeURIComponent(`Kategori "${target.namaKategori}" berhasil dihapus!`));
    } catch (error) {
      console.error('Error delete category:', error);
      res.redirect('/categories?error=' + encodeURIComponent('Gagal menghapus kategori: ' + error.message));
    }
  }
};

module.exports = categoryController;
