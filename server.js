/*
 * Backend penyimpanan bersama untuk Oc1Dv Dashboard
 * ---------------------------------------------------
 * Tujuannya sederhana: semua orang yang membuka dashboard.html dan
 * disetel untuk memanggil server ini, akan membaca & menulis ke data
 * YANG SAMA. Jadi catatan, tabungan, log aktivitas, dll bisa dilihat
 * dan diubah bersama-sama.
 *
 * Cara pakai:
 *   1. Install Node.js versi 18 ke atas.
 *   2. Di folder ini jalankan: npm install
 *   3. (Opsional tapi disarankan) atur API key rahasia:
 *        - buat file .env berisi: API_KEY=isi-dengan-kata-sandi-bebas
 *   4. Jalankan: npm start
 *   5. Server jalan di http://localhost:4000 (atau PORT dari environment)
 *
 * Untuk membuat data BENAR-BENAR bisa diakses orang lain (bukan cuma
 * di HP/laptop kamu), server ini harus di-deploy ke layanan hosting
 * (lihat CARA_DEPLOY.md). Setelah itu, kamu akan dapat URL publik
 * (misalnya https://oc1dv-backend.onrender.com) untuk ditempel ke
 * dashboard.html.
 *
 * CATATAN JUJUR SOAL PENYIMPANAN:
 * Data disimpan ke file data.json di server ini. Di banyak layanan
 * hosting GRATIS, disk-nya bersifat sementara (ephemeral) - artinya
 * data BISA HILANG saat server di-redeploy atau restart otomatis.
 * Untuk pemakaian serius/jangka panjang, sebaiknya pakai storage
 * persisten berbayar, atau database terkelola (MongoDB Atlas,
 * Supabase, dll) - itu di luar cakupan server sederhana ini.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY || ''; // kosongkan berarti tanpa proteksi key
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '15mb' })); // dinaikkan karena galeri foto base64 bisa besar

// ---------------- penyimpanan sederhana berbasis file ----------------
function loadData(){
  try{
    if(fs.existsSync(DATA_FILE)){
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  }catch(err){
    console.error('Gagal membaca data.json:', err.message);
  }
  return {};
}
function saveData(data){
  try{
    fs.writeFileSync(DATA_FILE, JSON.stringify(data));
    return true;
  }catch(err){
    console.error('Gagal menulis data.json:', err.message);
    return false;
  }
}

let store = loadData();

// ---------------- proteksi API key opsional ----------------
function checkApiKey(req, res, next){
  if(!API_KEY) return next(); // tidak diaktifkan
  const provided = req.header('x-api-key');
  if(provided !== API_KEY){
    return res.status(401).json({ ok:false, reason:'API key salah atau tidak ada' });
  }
  next();
}

// ---------------- endpoint ----------------
app.get('/', (req, res)=>{
  res.send('Backend shared storage Oc1Dv Dashboard aktif.');
});

app.get('/api/data/:key', checkApiKey, (req, res)=>{
  const key = req.params.key;
  const value = store[key];
  if(value === undefined) return res.status(404).json({ ok:false, reason:'Key tidak ditemukan' });
  res.json({ ok:true, key, value });
});

app.post('/api/data/:key', checkApiKey, (req, res)=>{
  const key = req.params.key;
  const { value } = req.body;
  if(typeof value !== 'string'){
    return res.status(400).json({ ok:false, reason:'Body harus berisi { value: string }' });
  }
  store[key] = value;
  const saved = saveData(store);
  if(!saved) return res.status(500).json({ ok:false, reason:'Gagal menyimpan ke disk server' });
  res.json({ ok:true, key });
});

app.listen(PORT, ()=>{
  console.log(`Backend shared storage jalan di port ${PORT}`);
});
