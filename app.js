let currentKuisIndex = 0;
let kuisData = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchUserData();
    fetchTransactions();
    fetchKuisData();
});

function fetchUserData() {
    fetch('/api/user')
        .then(res => res.json())
        .then(user => {
            document.getElementById('txt-user').innerText = user.username;
            document.getElementById('txt-tele').innerText = user.telegram;
            document.getElementById('main-saldo').innerText = "Rp " + user.totalSaldo.toLocaleString();
            document.getElementById('sub-tarik').innerText = "Rp " + user.saldoPenarikan.toLocaleString();
            document.getElementById('sub-akun').innerText = "Rp " + user.saldoAkun.toLocaleString();
            document.getElementById('sub-plan').innerText = user.plan;
            document.getElementById('sub-limit').innerText = `${user.sisaTugas}/${user.limitHariIni}`;
            document.getElementById('sub-sisa').innerText = user.sisaTugas;
        });
}

function fetchTransactions() {
    fetch('/api/transactions')
        .then(res => res.json())
        .then(txs => {
            const list = document.getElementById('tx-list');
            list.innerHTML = '';
            txs.forEach(t => {
                const color = t.status === 'Success' ? 'text-emerald-400' : (t.status === 'Pending' ? 'text-yellow-400' : 'text-red-400');
                list.innerHTML += `
                    <div class="card-dark p-3 rounded-lg flex justify-between items-center text-xs">
                        <div>
                            <div class="font-bold">${t.tipe} - ${t.metode || 'Sistem'}</div>
                            <div class="text-[10px] text-gray-500">${t.tanggal} | ID: ${t.id}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold">Rp ${t.nominal.toLocaleString()}</div>
                            <div class="font-semibold ${color}">${t.status}</div>
                        </div>
                    </div>
                `;
            });
        });
}

function fetchKuisData() {
    fetch('/api/kuis').then(res => res.json()).then(data => { kuisData = data; });
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.replace('text-cyan-400', 'text-gray-500');
    });
    event.currentTarget.classList.replace('text-gray-500', 'text-cyan-400');
}

function switchWalletSub(sub) {
    ['wd', 'depo', 'riwayat'].forEach(s => document.getElementById(`wallet-${s}`).classList.add('hidden'));
    document.getElementById(`wallet-${sub}`).classList.remove('hidden');
    
    ['btn-sub-wd', 'btn-sub-depo', 'btn-sub-riwayat'].forEach(b => {
        document.getElementById(b).className = "py-2 text-xs font-bold rounded-lg text-center text-gray-400";
    });
    document.getElementById(`btn-sub-${sub}`).className = "py-2 text-xs font-bold rounded-lg text-center bg-cyan-400 text-black";
}

function loadKuisStep() {
    if (kuisData.length === 0) return alert("Kuis belum siap.");
    if (currentKuisIndex >= kuisData.length) {
        currentKuisIndex = 0;
    }
    
    const kuis = kuisData[currentKuisIndex];
    const wrapper = document.getElementById('quiz-wrapper');
    document.getElementById('btn-start-quiz').classList.add('hidden');
    
    let opsiHtml = kuis.opsi.map(o => `
        <button onclick="jawabKuis(${kuis.id}, '${o}')" class="w-full text-left bg-gray-800 border border-gray-700 hover:border-cyan-400 p-3 rounded-xl text-xs transition-all">
            ${o}
        </button>
    `).join('');

    wrapper.innerHTML = `
        <div class="space-y-3 animate-fade-in">
            <div class="text-xs text-gray-400 font-medium">Pertanyaan:</div>
            <p class="text-sm font-bold text-white bg-gray-950 p-3 rounded-xl border border-gray-800">${kuis.tanya}</p>
            <div class="grid grid-cols-1 gap-2 mt-2">${opsiHtml}</div>
        </div>
    `;
}

function jawabKuis(kuisId, jawaban) {
    fetch('/api/kuis/jawab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kuisId, jawaban })
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        fetchUserData();
        currentKuisIndex++;
        loadKuisStep();
    });
}

function submitTransaksi(tipe) {
    let payload = {};
    if (tipe === 'Withdraw') {
        payload = {
            tipe,
            nominal: document.getElementById('wd-nominal').value,
            metode: document.getElementById('wd-metode').value,
            namaAkun: document.getElementById('wd-nama').value,
            nomorAkun: document.getElementById('wd-nomor').value
        };
    } else {
        payload = {
            tipe,
            nominal: document.getElementById('depo-nominal').value,
            metode: document.getElementById('depo-metode').value
        };
    }

    if (!payload.nominal || payload.nominal <= 0) return alert("Isi nominal dengan benar!");

    fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        alert(`${tipe} Berhasil Diajukan! Status: Pending Menunggu Konfirmasi Admin.`);
        fetchUserData();
        fetchTransactions();
        switchWalletSub('riwayat');
    });
}

