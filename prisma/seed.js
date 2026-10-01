const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding data Sarpras Lab RPL & Elektronika...');

  // 1. Bersihkan Data Lama
  await prisma.activityLog.deleteMany();
  await prisma.borrowing.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Database lama berhasil dibersihkan.');

  // 2. Hash Password Default
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Buat Data User (3 Level RBAC)
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      nama: 'Budi Santoso, S.Kom (Kepala Lab IT)',
      role: 'ADMIN',
      telepon: '0812-7890-1122'
    }
  });

  const toolmanUser = await prisma.user.create({
    data: {
      username: 'toolman',
      password: hashedPassword,
      nama: 'Ahmad Rizky (Toolman Lab)',
      role: 'TOOLMAN',
      telepon: '0821-3456-7890'
    }
  });

  const peminjamUser = await prisma.user.create({
    data: {
      username: 'peminjam',
      password: hashedPassword,
      nama: 'Muhammad Fajar (Siswa XII RPL 1)',
      role: 'PEMINJAM',
      nisn: '0061234567',
      telepon: '0857-1122-3344'
    }
  });

  const guruUser = await prisma.user.create({
    data: {
      username: 'guru_rpl',
      password: hashedPassword,
      nama: 'Dian Pratama, S.Pd (Guru Produktif RPL)',
      role: 'PEMINJAM',
      telepon: '0813-9988-7766'
    }
  });

  const siswaDua = await prisma.user.create({
    data: {
      username: 'siswa_siti',
      password: hashedPassword,
      nama: 'Siti Rahma (Siswa XII TEI 2)',
      role: 'PEMINJAM',
      nisn: '0067654321',
      telepon: '0898-7654-3210'
    }
  });

  console.log('✅ User demo (Admin, Toolman, Peminjam) berhasil dibuat.');

  // 4. Buat Kategori Alat
  const catJaringan = await prisma.category.create({
    data: { namaKategori: 'Jaringan Komputer' }
  });

  const catElektronika = await prisma.category.create({
    data: { namaKategori: 'Elektronika & IoT' }
  });

  const catMultimedia = await prisma.category.create({
    data: { namaKategori: 'Multimedia & Audio Visual' }
  });

  const catTools = await prisma.category.create({
    data: { namaKategori: 'Hardware & Hand Tools' }
  });

  console.log('✅ Kategori alat berhasil dibuat.');

  // 5. Buat Inventaris Alat Praktikum
  const toolMikrotik = await prisma.tool.create({
    data: {
      namaAlat: 'Mikrotik RouterBoard RB750r2 (hex lite)',
      spesifikasi: '5-Port Fast Ethernet 10/100, RouterOS Level 4, CPU 850MHz, 64MB RAM',
      stok: 8,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolLanTester = await prisma.tool.create({
    data: {
      namaAlat: 'Digital Cable Tester RJ45 / RJ11',
      spesifikasi: 'Auto-scan master & remote unit, LED indicator 1-8 pin + G',
      stok: 12,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolCrimping = await prisma.tool.create({
    data: {
      namaAlat: 'Tang Crimping RJ45 & RJ11 Cat5e/Cat6',
      spesifikasi: 'Modular Crimper 3-in-1 with wire stripper & cutting blade',
      stok: 15,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolSolder = await prisma.tool.create({
    data: {
      namaAlat: 'Solder Listrik 60W Adjustable Temp',
      spesifikasi: 'Ceramic heating element 200°C - 450°C + Dudukan Stand & Spons pembersih',
      stok: 10,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolMultimeter = await prisma.tool.create({
    data: {
      namaAlat: 'Digital Multimeter Sanwa CD800a',
      spesifikasi: 'Auto-ranging 4000 count, AC/DC Voltage, Resistance, Continuity Buzzer',
      stok: 6,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolArduino = await prisma.tool.create({
    data: {
      namaAlat: 'Arduino Uno R3 Starter Kit Kompleks',
      spesifikasi: 'ATmega328P DIP board, breadboard 830 titik, modul sensor lengkap, kabel jumper',
      stok: 10,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolProyektor = await prisma.tool.create({
    data: {
      namaAlat: 'Proyektor Epson EB-E500 3LCD',
      spesifikasi: '3300 ANSI Lumens, Resolusi XGA, HDMI & VGA Input, Kabel Power 5m',
      stok: 3,
      kondisi: 'BAIK',
      categoryId: catMultimedia.id
    }
  });

  const toolSwitch = await prisma.tool.create({
    data: {
      namaAlat: 'Switch Hub TP-Link TL-SG1016D 16-Port Gigabit',
      spesifikasi: '16-Port 10/100/1000 Mbps RJ45, Rackmount steel case, plug-and-play',
      stok: 4,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  console.log('✅ Master inventaris alat praktikum berhasil dibuat.');

  // 6. Buat Data Sirkulasi Peminjaman Awal
  const today = new Date();
  const besok = new Date(today);
  besok.setDate(today.getDate() + 1);

  const lusa = new Date(today);
  lusa.setDate(today.getDate() + 2);

  const kemarin = new Date(today);
  kemarin.setDate(today.getDate() - 1);

  const duaHariLalu = new Date(today);
  duaHariLalu.setDate(today.getDate() - 2);

  // Transaksi 1: PENDING - Siswa Fajar meminjam 1 unit Mikrotik
  await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolMikrotik.id,
      jumlah: 1,
      tglPinjam: today,
      tglKembaliRencana: besok,
      status: 'PENDING',
      catatan: 'Praktikum konfigurasi DHCP Server & Bandwidth Management di Lab RPL 2'
    }
  });

  // Transaksi 2: APPROVED - Siswa Siti meminjam 1 unit Tang Crimping (Stok dipotong 1)
  await prisma.borrowing.create({
    data: {
      userId: siswaDua.id,
      toolId: toolCrimping.id,
      jumlah: 1,
      tglPinjam: today,
      tglKembaliRencana: besok,
      status: 'APPROVED',
      toolmanId: toolmanUser.id,
      catatan: 'Tugas perakitan kabel Straight & Cross di meja praktikum'
    }
  });
  // Potong stok crimping karena sedang dipinjam
  await prisma.tool.update({
    where: { id: toolCrimping.id },
    data: { stok: 14 }
  });

  // Transaksi 3: RETURNED (BAIK) - Guru Dian meminjam Proyektor Epson
  await prisma.borrowing.create({
    data: {
      userId: guruUser.id,
      toolId: toolProyektor.id,
      jumlah: 1,
      tglPinjam: duaHariLalu,
      tglKembaliRencana: kemarin,
      tglKembaliReal: kemarin,
      status: 'RETURNED',
      kondisiKembali: 'BAIK',
      denda: 0,
      toolmanId: toolmanUser.id,
      catatan: 'Presentasi materi Sistem Operasi Jaringan di Ruang Teori RPL'
    }
  });

  // Transaksi 4: RETURNED (RUSAK) - Siswa mengembalikan solder dengan kondisi rusak dan dikenai denda
  await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolSolder.id,
      jumlah: 1,
      tglPinjam: duaHariLalu,
      tglKembaliRencana: kemarin,
      tglKembaliReal: kemarin,
      status: 'RETURNED',
      kondisiKembali: 'RUSAK',
      denda: 25000,
      toolmanId: toolmanUser.id,
      catatan: 'Praktikum rangkaian PCB elektronika daya. Catatan: Mata solder patah saat dipakai.'
    }
  });

  console.log('✅ Data transaksi awal (PENDING, APPROVED, RETURNED Baik, RETURNED Rusak) berhasil dibuat.');

  // 7. Buat Audit Log Aktifitas Awal
  const logs = [
    {
      userId: adminUser.id,
      aksi: 'INITIAL_SETUP',
      keterangan: 'Sistem diinisialisasi dengan master pengguna, kategori, dan 8 inventaris alat lab.',
      createdAt: duaHariLalu
    },
    {
      userId: guruUser.id,
      aksi: 'AJUKAN_PINJAM',
      keterangan: 'Mengajukan peminjaman Proyektor Epson EB-E500 1 unit.',
      createdAt: duaHariLalu
    },
    {
      userId: toolmanUser.id,
      aksi: 'SETUJUI_PINJAM',
      keterangan: 'Menyetujui peminjaman Proyektor Epson EB-E500 untuk Guru Dian Pratama.',
      createdAt: duaHariLalu
    },
    {
      userId: toolmanUser.id,
      aksi: 'TERIMA_KEMBALI',
      keterangan: 'Menerima pengembalian Proyektor Epson EB-E500. Kondisi: BAIK, Denda: Rp 0.',
      createdAt: kemarin
    },
    {
      userId: peminjamUser.id,
      aksi: 'AJUKAN_PINJAM',
      keterangan: 'Mengajukan peminjaman Solder Listrik 60W 1 unit.',
      createdAt: duaHariLalu
    },
    {
      userId: toolmanUser.id,
      aksi: 'SETUJUI_PINJAM',
      keterangan: 'Menyetujui peminjaman Solder Listrik 60W untuk Siswa Muhammad Fajar.',
      createdAt: duaHariLalu
    },
    {
      userId: toolmanUser.id,
      aksi: 'INSPEKSI_RUSAK',
      keterangan: 'Pemeriksaan fisik pengembalian Solder Listrik 60W: Ditemukan mata solder patah. Dikenakan denda penggantian Rp 25.000.',
      createdAt: kemarin
    },
    {
      userId: siswaDua.id,
      aksi: 'AJUKAN_PINJAM',
      keterangan: 'Mengajukan peminjaman Tang Crimping RJ45 & RJ11 1 unit.',
      createdAt: today
    },
    {
      userId: toolmanUser.id,
      aksi: 'SETUJUI_PINJAM',
      keterangan: 'Menyetujui peminjaman Tang Crimping RJ45 untuk Siti Rahma. Stok otomatis berkurang menjadi 14.',
      createdAt: today
    },
    {
      userId: peminjamUser.id,
      aksi: 'AJUKAN_PINJAM',
      keterangan: 'Mengajukan peminjaman Mikrotik RouterBoard RB750r2 1 unit untuk praktikum jaringan.',
      createdAt: today
    }
  ];

  for (const log of logs) {
    await prisma.activityLog.create({ data: log });
  }

  console.log('✅ Audit log sirkulasi laboratorium berhasil diisi.');
  console.log('🎉 Seeding database Sarpras Lab selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Gagal melakukan seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
