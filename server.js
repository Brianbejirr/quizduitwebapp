const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.json');

if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        user: {
            username: "kntgloco",
            telegram: "@kntnggstc",
            totalSaldo: 11857,
            saldoPenarikan: 11600,
            saldoAkun: 257,
            plan: "Bronze",
            limitHariIni: 30,
            sisaTugas: 30,
            streak: 0,
            status: "active",
            referralCode: "121716A6A1",
            totalReferral: 1,
            totalRewardReferral: 0
        },
        transactions: [
            { id: "TX001", tipe: "Withdraw", nominal: 50000, status: "Success", tanggal: "2026-07-14" }
        ],
        kuisList: [
            { id: 1, tanya: "Berapa hasil dari 5 + 5?", opsi: ["8", "9", "10", "11"], jawab: "10", reward: 650 },
            { id: 2, tanya: "Apa singkatan dari RPL?", opsi: ["Rekayasa Perangkat Lunak", "Rumah Pangan Lestari", "Rencana Penataan Lingkungan"], jawab: "Rekayasa Perangkat Lunak", reward: 650 },
            { id: 3, tanya: "Mata uang resmi Indonesia adalah?", opsi: ["Ringgit", "Rupiah", "Dollar"], jawab: "Rupiah", reward: 650 }
        ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

app.get('/api/user', (req, res) => res.json(readDB().user));
app.get('/api/transactions', (req, res) => res.json(readDB().transactions));
app.get('/api/kuis', (req, res) => res.json(readDB().kuisList));

app.post('/api/kuis/jawab', (req, res) => {
    const db = readDB();
    const { kuisId, jawaban } = req.body;
    const kuis = db.kuisList.find(k => k.id === kuisId);
    
    if (!kuis) return res.status(404).json({ message: "Kuis tidak ditemukan" });
    if (db.user.sisaTugas <= 0) return res.status(400).json({ message: "Limit tugas hari ini habis!" });

    let benar = kuis.jawab === jawaban;
    if (benar) {
        db.user.saldoPenarikan += db.user.plan === "Bronze" ? 650 : 100;
        db.user.totalSaldo = db.user.saldoPenarikan + db.user.saldoAkun;
    }
    db.user.sisaTugas -= 1;
    writeDB(db);
    
    res.json({ benar, user: db.user, message: benar ? "Jawaban Benar! +Rp " + kuis.reward : "Jawaban Salah!" });
});

app.post('/api/transaksi', (req, res) => {
    const db = readDB();
    const { tipe, nominal, metode, namaAkun, nomorAkun } = req.body;
    
    if (tipe === "Withdraw" && db.user.saldoPenarikan < nominal) {
        return res.status(400).json({ message: "Saldo penarikan tidak mencukupi!" });
    }
    
    const newTx = {
        id: "TX" + Date.now().toString().slice(-6),
        tipe, nominal: parseInt(nominal), metode, namaAkun, nomorAkun,
        status: "Pending", tanggal: new Date().toISOString().split('T')[0]
    };
    
    if (tipe === "Withdraw") {
        db.user.saldoPenarikan -= parseInt(nominal);
        db.user.totalSaldo = db.user.saldoPenarikan + db.user.saldoAkun;
    }
    
    db.transactions.unshift(newTx);
    writeDB(db);
    res.json({ success: true, user: db.user, tx: newTx });
});

app.post('/api/admin/action', (req, res) => {
    const db = readDB();
    const { txId, action } = req.body;
    const tx = db.transactions.find(t => t.id === txId);
    if (!tx) return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    
    tx.status = action;
    if (action === "Success" && tx.tipe === "Deposit") {
        db.user.saldoAkun += tx.nominal;
        db.user.totalSaldo = db.user.saldoPenarikan + db.user.saldoAkun;
    } else if (action === "Rejected" && tx.tipe === "Withdraw") {
        db.user.saldoPenarikan += tx.nominal;
        db.user.totalSaldo = db.user.saldoPenarikan + db.user.saldoAkun;
    }
    writeDB(db);
    res.json({ success: true, transactions: db.transactions });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
