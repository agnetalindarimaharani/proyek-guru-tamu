# DOKUMEN PENGUJIAN SISTEM (TEST_CASES.md)
## SISTEM INFORMASI PEMINJAMAN SARPRAS LAB RPL & ELEKTRONIKA
### STANDAR UJI KOMPETENSI KEAHLIAN (UKK) & INDUSTRI — SMK TELKOM

---

## 1. Ringkasan Eksekutif & Matriks Hak Akses (RBAC)

Sistem ini dibangun dengan arsitektur **Express.js MVC**, database **SQLite** dengan **Prisma ORM**, view engine **EJS** didukung **Tailwind CSS Light Dashboard**, serta proteksi keamanan berlapis menggunakan **Session-Based Middleware RBAC** 3 Level:
- 👑 **ADMIN (Kepala Lab Komputer / IT)**: Akses penuh CRUD Master Pengguna, Master Kategori, Master Inventaris Alat, Master Sirkulasi, dan Audit Log Laboratorium.
- 🛠️ **TOOLMAN (Toolman / Laboran Lab)**: Approval peminjaman, monitoring sirkulasi, inspeksi fisik alat kembali (Baik / Rusak / Hilang), penentuan denda kerusakan, dan cetak Berita Acara Laporan resmi.
- 🎓 **PEMINJAM (Siswa / Guru)**: Melihat katalog ketersediaan stok alat di lab, mengajukan permohonan pinjam alat praktikum, dan konfirmasi pengembalian alat ke meja Toolman.

---

## 2. Kredensial Akun Uji Coba (Demo Testing Accounts)

| Role | Username | Password | Nama Lengkap | Keterangan Akses |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `password123` | Budi Santoso, S.Kom (Kepala Lab IT) | Akses Penuh Super Admin |
| **TOOLMAN** | `toolman` | `password123` | Ahmad Rizky (Toolman Lab) | Approval, Inspeksi, Denda, Print |
| **PEMINJAM** | `peminjam` | `password123` | Muhammad Fajar (Siswa XII RPL 1) | Pengajuan & Konfirmasi Serah Alat |
| **PEMINJAM (Guru)** | `guru_rpl` | `password123` | Dian Pratama, S.Pd (Guru Produktif RPL) | Peminjaman Sarpras Mengajar |

> **Fitur Unggulan**: Tersedia tombol **"Fast Switch Demo Login (1-Klik)"** di halaman `/login` untuk mempermudah Asesor / Penguji UKK berpindah peran secara instan tanpa perlu mengetik manual.

---

## 3. Hasil Eksekusi 5 Skenario Pengujian Wajib

Seluruh 5 skenario pengujian di bawah ini telah diverifikasi dan **dinyatakan LULUS (PASS 100%)**:

### Skenario 1: Login User Sesuai Hak Akses (Admin, Toolman, Peminjam Siswa)
- **Tujuan**: Memastikan otentikasi berbasis session dan otorisasi RBAC 3 level bekerja dengan benar, serta mencegah akses ilegal (403 Forbidden).
- **Langkah Pengujian**:
  1. Akses halaman `/login`.
  2. Lakukan login menggunakan akun `admin` / `password123`.
  3. Verifikasi dashboard yang tampil adalah **Dashboard Kepala Lab (Admin)** dengan statistik inventaris dan menu CRUD master.
  4. Lakukan logout dan login dengan akun `toolman` / `password123`.
  5. Verifikasi dashboard yang tampil adalah **Meja Kerja Toolman & Laboran** dengan antrean approval permohonan pinjam.
  6. Lakukan logout dan login dengan akun `peminjam` / `password123`.
  7. Verifikasi portal siswa tampil dengan katalog alat dan riwayat peminjaman siswa.
  8. Uji keamanan: Coba buka `/users` saat login sebagai `peminjam`.
- **Hasil yang Diharapkan**:
  - Setiap pengguna diarahkan ke dashboard sesuai perannya.
  - Percobaan akses ilegal menghasilkan respons **HTTP 403 Forbidden** dengan halaman peringatan ramah pengguna.
- **Status Verifikasi**: ✅ **LULUS (PASS)**

---

### Skenario 2: Admin Menambah Inventaris Alat Baru (Mikrotik RouterBoard Stok 5 Unit)
- **Tujuan**: Memverifikasi fungsionalitas CRUD Inventaris Alat oleh Admin dan pencatatan riwayat audit log.
- **Langkah Pengujian**:
  1. Login sebagai `admin`.
  2. Buka menu **Inventaris Alat** (`/tools`).
  3. Klik tombol **"Tambah Alat Inventaris Baru"**.
  4. Input formulir:
     - **Nama Alat**: `Mikrotik RouterBoard RB951Ui-2HnD (Test Unit)`
     - **Kategori**: `Jaringan Komputer`
     - **Jumlah Stok Awal**: `5`
     - **Kondisi**: `BAIK`
     - **Spesifikasi**: `5-Port Fast Ethernet, Wireless 2.4GHz High Power, USB Port, CPU 600MHz`
  5. Klik **"Simpan ke Inventaris"**.
  6. Buka menu **Audit Log Lab** (`/logs`).
- **Hasil yang Diharapkan**:
  - Data alat tersimpan di database dengan stok 5 unit dan kondisi BAIK.
  - Muncul notifikasi sukses warna hijau di halaman inventaris.
  - Tercatat di Audit Log dengan aksi `CREATE_TOOL` oleh Admin.
- **Status Verifikasi**: ✅ **LULUS (PASS)**

---

### Skenario 3: Siswa Mengajukan Peminjaman 1 Unit Mikrotik untuk Praktikum Jaringan
- **Tujuan**: Memvalidasi permohonan peminjaman dari akun Siswa dengan status awal `PENDING`.
- **Langkah Pengujian**:
  1. Login sebagai `peminjam`.
  2. Buka menu **Katalog & Stok Alat** (`/catalog`).
  3. Temukan alat `Mikrotik RouterBoard RB951Ui-2HnD (Test Unit)`.
  4. Klik tombol **"Pinjam Alat"**.
  5. Isi data pengajuan:
     - **Jumlah Unit**: `1`
     - **Target Pengembalian**: Tanggal besok
     - **Keperluan**: `Praktikum jaringan routing dinamis OSPF di Lab Komputer RPL 1`
  6. Klik **"Kirim Pengajuan"**.
  7. Cek halaman **Peminjaman Saya** (`/borrowings`).
- **Hasil yang Diharapkan**:
  - Transaksi terbentuk di database dengan status `PENDING`.
  - Peminjam melihat badge status kuning **"MENUNGGU TOOLMAN"**.
  - Tercatat di Audit Log dengan aksi `AJUKAN_PINJAM`.
- **Status Verifikasi**: ✅ **LULUS (PASS)**

---

### Skenario 4: Toolman Menyetujui Peminjaman & Stok Alat Berkurang Menjadi 4 Unit
- **Tujuan**: Memverifikasi fungsionalitas persetujuan (approval) oleh Toolman dan pemotongan stok otomatis secara atomik (database transaction).
- **Langkah Pengujian**:
  1. Login sebagai `toolman`.
  2. Pada Dashboard atau menu **Sirkulasi & Persetujuan** (`/borrowings`), temukan permohonan pinjam dari siswa Muhammad Fajar.
  3. Periksa informasi ketersediaan stok alat di lab (stok awal 5 unit).
  4. Klik tombol hijau **"Setujui"** pada baris permohonan tersebut.
  5. Konfirmasi dialog persetujuan.
  6. Periksa status transaksi dan stok alat di menu `/catalog` atau `/tools`.
- **Hasil yang Diharapkan**:
  - Transaksi berubah status dari `PENDING` menjadi `APPROVED` (Sedang Dipinjam).
  - Kolom `toolmanId` terisi dengan ID akun Toolman penanggung jawab.
  - Stok fisik alat Mikrotik di laboratorium **otomatis berkurang dari 5 unit menjadi 4 unit**.
  - Tercatat di Audit Log dengan aksi `SETUJUI_PINJAM`.
- **Status Verifikasi**: ✅ **LULUS (PASS)**

---

### Skenario 5: Pengembalian Alat Kondisi Rusak, Hitung Denda, dan Verifikasi Audit Log
- **Tujuan**: Memvalidasi proses pengembalian alat di meja Toolman dengan pemeriksaan fisik (inspeksi), penghitungan denda kerusakan, dan verifikasi pencatatan audit log laboratorium.
- **Langkah Pengujian**:
  1. Siswa login dan mengklik **"Kembalikan ke Toolman"** pada transaksi peminjaman aktif.
  2. Toolman login dan membuka menu **Sirkulasi & Persetujuan** (`/borrowings`).
  3. Pada transaksi aktif tersebut, klik tombol **"Inspeksi Fisik & Kembali"**.
  4. Pada modal inspeksi fisik:
     - Pilih Hasil Inspeksi: `⚠️ RUSAK (Cacat fisik, patah, port rusak)`
     - Masukkan Nominal Denda: `Rp 35.000`
     - Isi Catatan Pemeriksaan Fisik: `Port Ethernet 1 longgar dan lecet pada casing akibat benturan saat praktikum`
  5. Klik tombol **"Simpan Hasil Inspeksi & Kembalikan"**.
  6. Buka menu **Laporan Sirkulasi** (`/reports`) dan **Audit Log** (`/logs`).
- **Hasil yang Diharapkan**:
  - Status peminjaman berubah menjadi `RETURNED`.
  - Field `kondisiKembali` terisi `RUSAK`.
  - Field `denda` terisi `35000`.
  - Tanggal pengembalian riil (`tglKembaliReal`) tercatat waktu saat ini.
  - Kas denda lab bertambah sebesar Rp 35.000.
  - Tercatat di Audit Log dengan aksi `INSPEKSI_RUSAK` memuat rincian nama siswa, alat, nominal denda, dan catatan kerusakan.
  - Laporan dapat dicetak resmi (PDF/Print) lengkap dengan tanda tangan Toolman & Kepala Lab.
- **Status Verifikasi**: ✅ **LULUS (PASS)**

---

## 4. Matriks Evaluasi 13 Fitur Spesifikasi

| No | Fitur Sistem | Target Role | Implementasi Rute & Controller | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Login & Logout Multi-Role | Admin, Toolman, Peminjam | `/login`, `/logout`, `/login/demo/:role` | ✅ 100% |
| 2 | CRUD Data Pengguna (User) | Admin | `GET/POST /users/*` | ✅ 100% |
| 3 | CRUD Inventaris Alat Praktikum | Admin | `GET/POST /tools/*` | ✅ 100% |
| 4 | CRUD Kategori Alat Lab | Admin | `GET/POST /categories/*` | ✅ 100% |
| 5 | CRUD Data Peminjaman & Sirkulasi | Admin | `GET/POST /borrowings/*` | ✅ 100% |
| 6 | Log Aktifitas Sistem Lab | Admin | `GET /logs` | ✅ 100% |
| 7 | Menyetujui (Approval) Peminjaman | Toolman | `POST /borrowings/:id/approve` | ✅ 100% |
| 8 | Memantau & Proses Pengembalian | Toolman | `GET/POST /borrowings/*` | ✅ 100% |
| 9 | Pemeriksaan Fisik & Input Denda | Toolman | `POST /borrowings/:id/return` | ✅ 100% |
| 10 | Mencetak Laporan Peminjaman (Print/PDF)| Toolman & Admin | `GET /reports/print` | ✅ 100% |
| 11 | Melihat Daftar & Stok Alat | Peminjam (Semua) | `GET /catalog` | ✅ 100% |
| 12 | Mengajukan Peminjaman Alat | Peminjam | `POST /borrowings/submit` | ✅ 100% |
| 13 | Mengembalikan Alat ke Meja Toolman | Peminjam | `POST /borrowings/:id/notify-return`| ✅ 100% |

---

## 5. Panduan Menjalankan Sistem Secara Mandiri

```bash
# 1. Masuk ke direktori proyek
cd c:\proyek-guru-tamu\workshop-day-2-smk-telkom

# 2. Sinkronisasi skema database SQLite (Prisma)
npx prisma db push

# 3. Jalankan Seeder data awal
node prisma/seed.js

# 4. Jalankan aplikasi web
npm run dev
# Atau: node src/server.js

# 5. Buka browser: http://localhost:3000
```
