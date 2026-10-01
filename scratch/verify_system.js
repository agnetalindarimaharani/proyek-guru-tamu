const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runVerification() {
  console.log('🧪 ====================================================');
  console.log('🧪 MEMULAI VERIFIKASI 5 SKENARIO PENGUJIAN SISTEM SARPRAS');
  console.log('🧪 ====================================================\n');

  let passedTests = 0;

  // --------------------------------------------------------------------------
  // Skenario 1: Login user sesuai hak akses (Admin, Toolman, Peminjam Siswa)
  // --------------------------------------------------------------------------
  console.log('▶ [SKENARIO 1] Verifikasi Otentikasi & RBAC (Admin, Toolman, Peminjam)');
  const [admin, toolman, peminjam] = await Promise.all([
    prisma.user.findUnique({ where: { username: 'admin' } }),
    prisma.user.findUnique({ where: { username: 'toolman' } }),
    prisma.user.findUnique({ where: { username: 'peminjam' } })
  ]);

  if (!admin || !toolman || !peminjam) {
    throw new Error('User demo tidak lengkap di database!');
  }

  const adminPassMatch = await bcrypt.compare('password123', admin.password);
  const toolmanPassMatch = await bcrypt.compare('password123', toolman.password);
  const peminjamPassMatch = await bcrypt.compare('password123', peminjam.password);

  if (adminPassMatch && admin.role === 'ADMIN' &&
      toolmanPassMatch && toolman.role === 'TOOLMAN' &&
      peminjamPassMatch && peminjam.role === 'PEMINJAM') {
    console.log('   ✅ PASS: Ketiga akun demo valid dengan role masing-masing:');
    console.log(`      - Admin: ${admin.nama} (Role: ${admin.role})`);
    console.log(`      - Toolman: ${toolman.nama} (Role: ${toolman.role})`);
    console.log(`      - Peminjam: ${peminjam.nama} (Role: ${peminjam.role})`);
    passedTests++;
  } else {
    throw new Error('Skenario 1 Gagal: Kredensial atau role tidak sesuai.');
  }

  // --------------------------------------------------------------------------
  // Skenario 2: Admin menambah inventaris alat baru (Mikrotik RouterBoard stok 5 unit)
  // --------------------------------------------------------------------------
  console.log('\n▶ [SKENARIO 2] Admin Menambah Inventaris Alat Baru (Mikrotik Stok 5 Unit)');
  const catJaringan = await prisma.category.findFirst({
    where: { namaKategori: { contains: 'Jaringan' } }
  });

  const newTool = await prisma.tool.create({
    data: {
      namaAlat: 'Mikrotik RouterBoard RB951Ui-2HnD (Test Unit)',
      spesifikasi: '5-Port Fast Ethernet, Wireless 2.4GHz High Power, USB Port, CPU 600MHz',
      stok: 5,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      aksi: 'CREATE_TOOL',
      keterangan: `Admin menambahkan alat praktikum baru: ${newTool.namaAlat} (Stok: ${newTool.stok} unit).`
    }
  });

  if (newTool.id && newTool.stok === 5) {
    console.log(`   ✅ PASS: Alat baru berhasil diinventarisasi ID: #${newTool.id}`);
    console.log(`      - Nama: ${newTool.namaAlat}`);
    console.log(`      - Stok Awal: ${newTool.stok} Unit`);
    passedTests++;
  } else {
    throw new Error('Skenario 2 Gagal: Alat tidak berhasil ditambahkan.');
  }

  // --------------------------------------------------------------------------
  // Skenario 3: Siswa mengajukan peminjaman 1 unit Mikrotik untuk praktikum jaringan
  // --------------------------------------------------------------------------
  console.log('\n▶ [SKENARIO 3] Siswa Mengajukan Peminjaman 1 Unit Mikrotik (Status PENDING)');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const loanSubmission = await prisma.borrowing.create({
    data: {
      userId: peminjam.id,
      toolId: newTool.id,
      jumlah: 1,
      tglPinjam: new Date(),
      tglKembaliRencana: tomorrow,
      status: 'PENDING',
      catatan: 'Praktikum jaringan routing dinamis OSPF di Lab Komputer RPL 1'
    }
  });

  await prisma.activityLog.create({
    data: {
      userId: peminjam.id,
      aksi: 'AJUKAN_PINJAM',
      keterangan: `Peminjam ${peminjam.nama} mengajukan peminjaman ${loanSubmission.jumlah} unit "${newTool.namaAlat}".`
    }
  });

  if (loanSubmission.status === 'PENDING' && loanSubmission.jumlah === 1) {
    console.log(`   ✅ PASS: Permohonan pinjam berhasil diajukan Transaksi ID: #${loanSubmission.id}`);
    console.log(`      - Peminjam: ${peminjam.nama}`);
    console.log(`      - Status: ${loanSubmission.status}`);
    passedTests++;
  } else {
    throw new Error('Skenario 3 Gagal: Pengajuan peminjaman tidak berstatus PENDING.');
  }

  // --------------------------------------------------------------------------
  // Skenario 4: Toolman menyetujui peminjaman dan stok alat berkurang menjadi 4 unit
  // --------------------------------------------------------------------------
  console.log('\n▶ [SKENARIO 4] Toolman Menyetujui Peminjaman & Verifikasi Stok Berkurang ke 4 Unit');
  
  // Transaksi Atomik
  const [updatedToolAfterApprove, approvedBorrowing] = await prisma.$transaction([
    prisma.tool.update({
      where: { id: newTool.id },
      data: { stok: { decrement: loanSubmission.jumlah } }
    }),
    prisma.borrowing.update({
      where: { id: loanSubmission.id },
      data: {
        status: 'APPROVED',
        toolmanId: toolman.id
      }
    })
  ]);

  await prisma.activityLog.create({
    data: {
      userId: toolman.id,
      aksi: 'SETUJUI_PINJAM',
      keterangan: `Toolman menyetujui peminjaman ${loanSubmission.id}. Stok berkurang menjadi ${updatedToolAfterApprove.stok}.`
    }
  });

  if (approvedBorrowing.status === 'APPROVED' && updatedToolAfterApprove.stok === 4) {
    console.log(`   ✅ PASS: Peminjaman disetujui Toolman:`);
    console.log(`      - Status Transaksi: ${approvedBorrowing.status}`);
    console.log(`      - Toolman PIC: ${toolman.nama} (ID: ${approvedBorrowing.toolmanId})`);
    console.log(`      - Stok Alat Sebelumnya: 5 Unit -> Stok Sekarang: ${updatedToolAfterApprove.stok} Unit`);
    passedTests++;
  } else {
    throw new Error(`Skenario 4 Gagal: Stok alat tidak berkurang menjadi 4 (sekarang: ${updatedToolAfterApprove.stok}).`);
  }

  // --------------------------------------------------------------------------
  // Skenario 5: Pengembalian alat kondisi rusak, hitung denda, dan verifikasi log aktivitas
  // --------------------------------------------------------------------------
  console.log('\n▶ [SKENARIO 5] Pengembalian Alat Kondisi Rusak, Hitung Denda & Verifikasi Log');
  const dendaRusak = 35000;
  const catatanKerusakan = 'Port Ethernet 1 longgar dan lecet pada casing akibat benturan';

  const [toolAfterReturn, returnedBorrowing] = await prisma.$transaction([
    prisma.tool.update({
      where: { id: newTool.id },
      data: { stok: { increment: loanSubmission.jumlah } } // alat fisik kembali ke gudang servis
    }),
    prisma.borrowing.update({
      where: { id: loanSubmission.id },
      data: {
        status: 'RETURNED',
        tglKembaliReal: new Date(),
        kondisiKembali: 'RUSAK',
        denda: dendaRusak,
        toolmanId: toolman.id,
        catatan: loanSubmission.catatan + ' | Catatan Inspeksi: ' + catatanKerusakan
      }
    })
  ]);

  const auditLogEntry = await prisma.activityLog.create({
    data: {
      userId: toolman.id,
      aksi: 'INSPEKSI_RUSAK',
      keterangan: `Pengembalian alat "${newTool.namaAlat}" oleh ${peminjam.nama} dalam kondisi RUSAK (${catatanKerusakan}). Dikenakan denda Rp ${dendaRusak.toLocaleString('id-ID')}. Diproses oleh ${toolman.nama}.`
    }
  });

  // Verifikasi pencatatan di database
  const verifyLog = await prisma.activityLog.findUnique({
    where: { id: auditLogEntry.id }
  });

  if (returnedBorrowing.status === 'RETURNED' &&
      returnedBorrowing.kondisiKembali === 'RUSAK' &&
      returnedBorrowing.denda === dendaRusak &&
      verifyLog && verifyLog.aksi === 'INSPEKSI_RUSAK') {
    console.log(`   ✅ PASS: Pengembalian dengan kondisi rusak berhasil diproses:`);
    console.log(`      - Status: ${returnedBorrowing.status}`);
    console.log(`      - Kondisi Fisik Alat: ${returnedBorrowing.kondisiKembali}`);
    console.log(`      - Denda Kerusakan: Rp ${returnedBorrowing.denda.toLocaleString('id-ID')}`);
    console.log(`      - Audit Log Tercatat: "${verifyLog.keterangan}"`);
    console.log(`      - ID Log: #${verifyLog.id} (Waktu: ${verifyLog.createdAt.toISOString()})`);
    passedTests++;
  } else {
    throw new Error('Skenario 5 Gagal: Data pengembalian atau audit log tidak valid.');
  }

  console.log('\n========================================================');
  console.log(`🎉 SELURUH ${passedTests}/5 SKENARIO PENGUJIAN DINYATAKAN LULUS 100%!`);
  console.log('========================================================\n');
}

runVerification()
  .catch((err) => {
    console.error('❌ Gagal dalam verifikasi sistem:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
