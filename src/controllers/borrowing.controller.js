const prisma = require('../config/db');
const { logActivity } = require('../helpers/activityLog');

const borrowingController = {
  // 1. Daftar Peminjaman (Admin: Semua, Toolman: Sirkulasi Aktif, Peminjam: Milik Sendiri)
  index: async (req, res) => {
    try {
      const user = req.session.user;
      const { status, toolId, search } = req.query;
      const where = {};

      // Filter berdasarkan role
      if (user.role === 'PEMINJAM') {
        where.userId = user.id;
      }

      if (status && ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED'].includes(status)) {
        where.status = status;
      }

      if (toolId) {
        where.toolId = parseInt(toolId);
      }

      if (search) {
        where.OR = [
          { user: { nama: { contains: search } } },
          { user: { username: { contains: search } } },
          { tool: { namaAlat: { contains: search } } }
        ];
      }

      const [borrowings, tools, usersList] = await Promise.all([
        prisma.borrowing.findMany({
          where,
          include: {
            user: true,
            tool: { include: { category: true } },
            toolman: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.tool.findMany({ orderBy: { namaAlat: 'asc' } }),
        user.role === 'ADMIN' ? prisma.user.findMany({ orderBy: { nama: 'asc' } }) : []
      ]);

      res.render('borrowings/index', {
        title: 'Data Sirkulasi Peminjaman & Pengembalian',
        borrowings,
        tools,
        usersList,
        filterStatus: status || '',
        filterToolId: toolId || '',
        search: search || '',
        currentPage: 'borrowings',
        success: req.query.success || null,
        error: req.query.error || null
      });
    } catch (error) {
      console.error('Error borrowing index:', error);
      res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat sirkulasi: ' + error.message));
    }
  },

  // 2. Form & Proses Pengajuan Pinjam Alat (Peminjam: Siswa / Guru)
  submitBorrow: async (req, res) => {
    try {
      const user = req.session.user;
      const { toolId, jumlah, tglKembaliRencana, catatan } = req.body;

      if (!toolId || !tglKembaliRencana) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Pilih alat dan tentukan tanggal pengembalian!'));
      }

      const parsedToolId = parseInt(toolId);
      const parsedJumlah = parseInt(jumlah) || 1;

      if (parsedJumlah < 1) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Jumlah pinjam minimal 1 unit!'));
      }

      // Cek ketersediaan stok alat di database
      const tool = await prisma.tool.findUnique({
        where: { id: parsedToolId },
        include: { category: true }
      });

      if (!tool) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Alat praktikum tidak ditemukan!'));
      }

      if (tool.kondisi !== 'BAIK') {
        return res.redirect('/borrowings?error=' + encodeURIComponent(`Alat ${tool.namaAlat} berstatus RUSAK dan tidak dapat dipinjam.`));
      }

      if (tool.stok < parsedJumlah) {
        return res.redirect('/borrowings?error=' + encodeURIComponent(`Stok tidak mencukupi! Tersedia hanya ${tool.stok} unit.`));
      }

      // Buat transaksi baru dengan status PENDING
      const borrowing = await prisma.borrowing.create({
        data: {
          userId: user.id,
          toolId: parsedToolId,
          jumlah: parsedJumlah,
          tglPinjam: new Date(),
          tglKembaliRencana: new Date(tglKembaliRencana),
          status: 'PENDING',
          catatan: catatan ? catatan.trim() : 'Praktikum Laboratorium'
        }
      });

      // Catat Activity Log
      await logActivity(
        user.id,
        'AJUKAN_PINJAM',
        `Peminjam ${user.nama} mengajukan peminjaman ${parsedJumlah} unit "${tool.namaAlat}" (Status: PENDING).`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent(`Permohonan peminjaman ${tool.namaAlat} berhasil diajukan! Menunggu persetujuan Toolman.`));
    } catch (error) {
      console.error('Error submit borrow:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal mengajukan pinjaman: ' + error.message));
    }
  },

  // 3. Approval Peminjaman (Toolman)
  approve: async (req, res) => {
    try {
      const toolman = req.session.user;
      const id = parseInt(req.params.id);

      const borrowing = await prisma.borrowing.findUnique({
        where: { id },
        include: { tool: true, user: true }
      });

      if (!borrowing) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Data transaksi tidak ditemukan.'));
      }

      if (borrowing.status !== 'PENDING') {
        return res.redirect('/borrowings?error=' + encodeURIComponent(`Transaksi ini sudah berstatus ${borrowing.status}.`));
      }

      // Verifikasi stok alat saat ini sebelum disetujui
      if (borrowing.tool.stok < borrowing.jumlah) {
        return res.redirect('/borrowings?error=' + encodeURIComponent(`Gagal menyetujui! Stok alat tersisa ${borrowing.tool.stok}, sedangkan yang diajukan ${borrowing.jumlah}.`));
      }

      // Transaksi Atomik: Potong stok alat dan update status transaksi menjadi APPROVED
      const [updatedTool, updatedBorrowing] = await prisma.$transaction([
        prisma.tool.update({
          where: { id: borrowing.toolId },
          data: { stok: { decrement: borrowing.jumlah } }
        }),
        prisma.borrowing.update({
          where: { id },
          data: {
            status: 'APPROVED',
            toolmanId: toolman.id
          }
        })
      ]);

      // Catat Audit Log
      await logActivity(
        toolman.id,
        'SETUJUI_PINJAM',
        `Toolman ${toolman.nama} menyetujui peminjaman ${borrowing.jumlah} unit "${borrowing.tool.namaAlat}" untuk ${borrowing.user.nama}. Stok alat berkurang menjadi ${updatedTool.stok} unit.`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent(`Peminjaman disetujui! Stok "${borrowing.tool.namaAlat}" kini berkurang menjadi ${updatedTool.stok} unit.`));
    } catch (error) {
      console.error('Error approve borrowing:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal menyetujui peminjaman: ' + error.message));
    }
  },

  // 4. Tolak Peminjaman (Toolman)
  reject: async (req, res) => {
    try {
      const toolman = req.session.user;
      const id = parseInt(req.params.id);
      const { alasan } = req.body;

      const borrowing = await prisma.borrowing.findUnique({
        where: { id },
        include: { tool: true, user: true }
      });

      if (!borrowing || borrowing.status !== 'PENDING') {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Transaksi tidak valid atau bukan status PENDING.'));
      }

      await prisma.borrowing.update({
        where: { id },
        data: {
          status: 'REJECTED',
          toolmanId: toolman.id,
          catatan: (borrowing.catatan ? borrowing.catatan + ' | ' : '') + `Alasan Penolakan: ${alasan || 'Tidak disetujui toolman'}`
        }
      });

      await logActivity(
        toolman.id,
        'TOLAK_PINJAM',
        `Toolman ${toolman.nama} menolak permohonan pinjam "${borrowing.tool.namaAlat}" oleh ${borrowing.user.nama}. Alasan: ${alasan || '-'}`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent('Permohonan peminjaman berhasil ditolak.'));
    } catch (error) {
      console.error('Error reject borrowing:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal menolak peminjaman: ' + error.message));
    }
  },

  // 5. Inspeksi Fisik & Pengembalian Alat (Toolman)
  processReturn: async (req, res) => {
    try {
      const toolman = req.session.user;
      const id = parseInt(req.params.id);
      const { kondisiKembali, denda, catatanKondisi } = req.body;

      const parsedDenda = parseInt(denda) || 0;

      const borrowing = await prisma.borrowing.findUnique({
        where: { id },
        include: { tool: true, user: true }
      });

      if (!borrowing) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Data peminjaman tidak ditemukan.'));
      }

      if (borrowing.status !== 'APPROVED') {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Hanya peminjaman dengan status APPROVED yang dapat diproses pengembaliannya.'));
      }

      // Siapkan transaksi database
      const operations = [];

      // Update data Borrowing
      operations.push(
        prisma.borrowing.update({
          where: { id },
          data: {
            status: 'RETURNED',
            tglKembaliReal: new Date(),
            kondisiKembali: kondisiKembali || 'BAIK',
            denda: parsedDenda,
            toolmanId: toolman.id,
            catatan: (borrowing.catatan ? borrowing.catatan + ' | ' : '') + (catatanKondisi ? `Inspeksi Fisik: ${catatanKondisi}` : '')
          }
        })
      );

      // Logika Stok & Kondisi Fisik Alat:
      // - Jika BAIK: kembalikan stok alat (+ borrowing.jumlah)
      // - Jika RUSAK: alat tetap masuk tetapi dicatat kondisi rusak atau stok tetap disesuaikan dengan status rusak
      // - Jika HILANG: stok tidak dikembalikan (karena hilang) dan dikenakan denda
      if (kondisiKembali === 'BAIK') {
        operations.push(
          prisma.tool.update({
            where: { id: borrowing.toolId },
            data: { stok: { increment: borrowing.jumlah } }
          })
        );
      } else if (kondisiKembali === 'RUSAK') {
        // Jika rusak, alat dikembalikan ke gudang servis lab (stok ditambah tetapi kondisi alat di-flag atau dicatat)
        operations.push(
          prisma.tool.update({
            where: { id: borrowing.toolId },
            data: { stok: { increment: borrowing.jumlah } }
          })
        );
      }

      await prisma.$transaction(operations);

      // Catat log aktifitas laboratorium secara detail
      const logAksi = kondisiKembali === 'RUSAK' ? 'INSPEKSI_RUSAK' : (kondisiKembali === 'HILANG' ? 'INSPEKSI_HILANG' : 'TERIMA_KEMBALI');
      const logDesc = `Pengembalian ${borrowing.jumlah} unit "${borrowing.tool.namaAlat}" oleh ${borrowing.user.nama}. Kondisi fisik: ${kondisiKembali}. Denda: Rp ${parsedDenda.toLocaleString('id-ID')}. Catatan: ${catatanKondisi || 'Normal'}. Diproses oleh Toolman: ${toolman.nama}.`;

      await logActivity(toolman.id, logAksi, logDesc);

      res.redirect('/borrowings?success=' + encodeURIComponent(`Pengembalian berhasil diproses! Kondisi: ${kondisiKembali}. Denda: Rp ${parsedDenda.toLocaleString('id-ID')}.`));
    } catch (error) {
      console.error('Error process return:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal memproses pengembalian: ' + error.message));
    }
  },

  // 6. Konfirmasi Kembalikan ke Meja Toolman (Aksi dari Peminjam / Siswa)
  notifyReturn: async (req, res) => {
    try {
      const user = req.session.user;
      const id = parseInt(req.params.id);

      const borrowing = await prisma.borrowing.findUnique({
        where: { id },
        include: { tool: true }
      });

      if (!borrowing || borrowing.userId !== user.id) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Akses ditolak atau data tidak sesuai.'));
      }

      if (borrowing.status !== 'APPROVED') {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Alat belum disetujui atau sudah dikembalikan.'));
      }

      await prisma.borrowing.update({
        where: { id },
        data: {
          catatan: (borrowing.catatan ? borrowing.catatan + ' | ' : '') + `[Peminjam konfirmasi alat telah diserahkan di meja Toolman Lab pada ${new Date().toLocaleTimeString('id-ID')}]`
        }
      });

      await logActivity(
        user.id,
        'KONFIRMASI_PENGEMBALIAN',
        `Peminjam ${user.nama} telah mengembalikan fisik "${borrowing.tool.namaAlat}" ke meja piket Toolman Lab.`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent('Konfirmasi serah alat terkirim! Silakan tunggu Toolman memeriksa kondisi fisik alat di meja praktikum.'));
    } catch (error) {
      console.error('Error notify return:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal mengirim konfirmasi: ' + error.message));
    }
  },

  // 7. Tambah Transaksi Langsung (Admin Manual Input)
  adminCreate: async (req, res) => {
    try {
      const admin = req.session.user;
      const { userId, toolId, jumlah, tglKembaliRencana, status, catatan } = req.body;

      const parsedUserId = parseInt(userId);
      const parsedToolId = parseInt(toolId);
      const parsedJumlah = parseInt(jumlah) || 1;

      const tool = await prisma.tool.findUnique({ where: { id: parsedToolId } });
      if (!tool) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Alat tidak ditemukan.'));
      }

      // Jika langsung di-set APPROVED oleh Admin, potong stok
      if (status === 'APPROVED') {
        if (tool.stok < parsedJumlah) {
          return res.redirect('/borrowings?error=' + encodeURIComponent(`Stok tidak cukup! Tersisa ${tool.stok} unit.`));
        }
        await prisma.tool.update({
          where: { id: parsedToolId },
          data: { stok: { decrement: parsedJumlah } }
        });
      }

      const newBorrowing = await prisma.borrowing.create({
        data: {
          userId: parsedUserId,
          toolId: parsedToolId,
          jumlah: parsedJumlah,
          tglPinjam: new Date(),
          tglKembaliRencana: new Date(tglKembaliRencana),
          status: status || 'APPROVED',
          toolmanId: admin.id,
          catatan: catatan ? catatan.trim() : 'Input langsung oleh Admin'
        },
        include: { user: true, tool: true }
      });

      await logActivity(
        admin.id,
        'ADMIN_CREATE_BORROWING',
        `Admin menginput transaksi peminjaman langsung: ${newBorrowing.jumlah} unit "${newBorrowing.tool.namaAlat}" untuk ${newBorrowing.user.nama} (Status: ${newBorrowing.status}).`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent('Transaksi peminjaman berhasil ditambahkan oleh Admin!'));
    } catch (error) {
      console.error('Error admin create borrowing:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal membuat transaksi: ' + error.message));
    }
  },

  // 8. Hapus Transaksi (Admin)
  delete: async (req, res) => {
    try {
      const admin = req.session.user;
      const id = parseInt(req.params.id);

      const borrowing = await prisma.borrowing.findUnique({
        where: { id },
        include: { tool: true, user: true }
      });

      if (!borrowing) {
        return res.redirect('/borrowings?error=' + encodeURIComponent('Transaksi tidak ditemukan.'));
      }

      // Jika statusnya APPROVED (sedang dipinjam), kembalikan stok alatnya agar tidak hilang
      if (borrowing.status === 'APPROVED') {
        await prisma.tool.update({
          where: { id: borrowing.toolId },
          data: { stok: { increment: borrowing.jumlah } }
        });
      }

      await prisma.borrowing.delete({ where: { id } });

      await logActivity(
        admin.id,
        'ADMIN_DELETE_BORROWING',
        `Admin menghapus data transaksi ID ${id} (${borrowing.tool.namaAlat} dipinjam oleh ${borrowing.user.nama}).`
      );

      res.redirect('/borrowings?success=' + encodeURIComponent('Transaksi peminjaman berhasil dihapus!'));
    } catch (error) {
      console.error('Error delete borrowing:', error);
      res.redirect('/borrowings?error=' + encodeURIComponent('Gagal menghapus transaksi: ' + error.message));
    }
  }
};

module.exports = borrowingController;
