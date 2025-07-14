// bank-script.js

// 1. Firebase Configuration (Replace with your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyDfBeA7qrEiJT8gXIwjkuVI4ENt1qpNJ88",
    authDomain: "monopoly-bank-145e1.firebaseapp.com",
    projectId: "monopoly-bank-145e1",
    storageBucket: "monopoly-bank-145e1.firebasestorage.app",
    messagingSenderId: "776402836745",
    appId: "1:776402836745:web:afcbd0d24ffcb0b0a047d8",
    databaseURL: "https://monopoly-bank-145e1-default-rtdb.firebaseio.com/" // If using Realtime Database
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database(); // Using Realtime Database

// 2. Google Apps Script Web App URL (Replace with your deployed URL)
const GOOGLE_SHEETS_WEB_APP_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; // Use the same URL as script.js

// DOM Elements
const appHeader = document.querySelector('.app-header');
const bankIdSpan = document.getElementById('bankId');
const bankIdentifierSpan = document.getElementById('bankIdentifier');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const logoutBtn = document.getElementById('logoutBtn');

const authSection = document.getElementById('authSection');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn'); // For initial bank user creation

const bankControlSection = document.getElementById('bankControlSection');
const bankPlayerSelect = document.getElementById('bankPlayerSelect');
const bankAmountInput = document.getElementById('bankAmount');
const bankToPlayerBtn = document.getElementById('bankToPlayerBtn');
const playerToBankBtn = document.getElementById('playerToBankBtn');

const playerListGrid = document.getElementById('playerList');

// History Section Elements
const historySection = document.getElementById('historySection');
const transactionHistoryDiv = document.getElementById('transactionHistory');
const backToBankControlBtn = document.getElementById('backToBankControlBtn');
const historyBtn = document.getElementById('historyBtn'); // Button to open history

const resetGameBtn = document.getElementById('resetGameBtn');
const undoBtn = document.getElementById('undoBtn');

// Card Draw Elements
const drawTreasureCardBtn = document.getElementById('drawTreasureCardBtn');
const drawWhatCardBtn = document.getElementById('drawWhatCardBtn');

let currentBankUser = null;
let playersRef = db.ref('players');
let transactionsRef = db.ref('transactions');
let lastTransaction = null; // For Undo functionality specific to bank app

// --- Card Definitions ---
const treasureCards = [
    { text: "ได้รับเงิน ฿200,000", amount: 200000 },
    { text: "จ่ายค่าปรับธนาคาร ฿100,000", amount: -100000 },
    { text: "ได้รับเงินปันผลหุ้น ฿50,000", amount: 50000 },
    { text: "ธนาคารจ่ายให้คุณ ฿1,000,000", amount: 1000000 },
    { text: "วันนี้วันเกิด! ได้รับเงินจากผู้เล่นทุกคน ฿100,000", action: "collectFromAll", amountPerPlayer: 100000 },
    { text: "จ่ายค่าซ่อมบ้านและโรงแรม: บ้านละ ฿50,000 โรงแรมละ ฿200,000", action: "payPerHouseHotel", houseCost: 50000, hotelCost: 200000 },
    { text: "ได้รับเงิน ฿500,000", amount: 500000 },
    { text: "เสียภาษี ฿200,000", amount: -200000 },
    { text: "ธนาคารให้เงินคุณ ฿150,000", amount: 150000 },
    { text: "จ่ายค่าปรับความเร็ว ฿50,000", amount: -50000 }
];

const whatCards = [
    { text: "ไปคุก!", action: "goToJail" },
    { text: "เดินหน้า 3 ช่อง" },
    { text: "ถอยหลัง 2 ช่อง" },
    { text: "ได้ออกคุกฟรี!" },
    { text: "ต้องจ่ายค่าบำรุงรักษา" },
    { text: "ได้รับเงินจากการลงทุน ฿1,000,000", amount: 1000000 },
    { text: "เสียเงินให้ธนาคาร ฿50,000", amount: -50000 },
    { text: "ไปที่ช่องเริ่มต้น (Go)" },
    { text: "โอนเงินให้ผู้เล่นที่จนที่สุด ฿100,000", action: "payPoorest", amount: -100000 },
    { text: "รับเงินจากผู้เล่นที่รวยที่สุด ฿200,000", action: "collectRichest", amount: 200000 }
];

// --- SweetAlert2 Helper Function ---
function showSweetAlert(icon, title, text) {
    Swal.fire({
        icon: icon,
        title: title,
        text: text,
        confirmButtonText: 'ตกลง'
    });
}

// --- Helper Functions for Amount Handling ---

// Helper function to parse amount input (supports 'K' for thousands)
function parseAmountInput(inputString) {
    const cleanedString = String(inputString).trim().toUpperCase();
    let amount = parseFloat(cleanedString);

    if (isNaN(amount)) {
        return 0;
    }

    if (cleanedString.endsWith('K')) {
        amount *= 1000;
    } else if (cleanedString.endsWith('M')) {
        amount *= 1000000;
    }
    return Math.floor(amount);
}

// Helper function to format money for display (e.g., 15000000 -> ฿15,000,000)
function formatMoney(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '฿0';
    }
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}


// --- Authentication and UI State Management ---
auth.onAuthStateChanged(user => {
    if (user) {
        if (currentBankUser === null) {
            showSweetAlert('success', 'เข้าสู่ระบบสำเร็จ!', `ยินดีต้อนรับผู้ควบคุม ${user.email.split('@')[0]}`);
        }
        currentBankUser = user;
        bankIdSpan.textContent = user.email.split('@')[0]; // Display username from email
        bankIdentifierSpan.style.display = 'inline';
        authSection.style.display = 'none';
        bankControlSection.style.display = 'flex'; // Show bank control section
        historySection.style.display = 'none'; // Ensure history section is hidden initially
        logoutBtn.style.display = 'inline-block';
        initializeBankControl();
    } else {
        currentBankUser = null;
        bankIdSpan.textContent = '';
        bankIdentifierSpan.style.display = 'none';
        authSection.style.display = 'flex';
        bankControlSection.style.display = 'none';
        historySection.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
});

loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        showSweetAlert('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        return;
    }
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            showSweetAlert('error', 'เข้าสู่ระบบไม่สำเร็จ', error.message);
        });
});

// Register button for bank user - typically only used once for initial setup
registerBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        showSweetAlert('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        return;
    }
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            // Optionally store bank user specific data
            db.ref('bankUsers').child(user.uid).set({
                email: user.email,
                displayName: user.email.split('@')[0]
            }).then(() => {
                showSweetAlert('success', 'ลงทะเบียนผู้ควบคุมสำเร็จ!', `ยินดีต้อนรับ ${user.email.split('@')[0]}`);
            }).catch(error => {
                console.error("Error creating bank user profile:", error);
                showSweetAlert('error', 'สร้างโปรไฟล์ไม่สำเร็จ', `ลงทะเบียนสำเร็จ แต่สร้างโปรไฟล์ไม่สำเร็จ: ${error.message}`);
            });
        })
        .catch(error => {
            showSweetAlert('error', 'ลงทะเบียนไม่สำเร็จ', error.message);
        });
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// --- Bank Control Functions ---
function initializeBankControl() {
    playersRef.on('value', (snapshot) => {
        const players = snapshot.val();
        renderPlayerList(players);
        populatePlayerSelect(players);
    });

    transactionsRef.on('value', (snapshot) => {
        const transactions = snapshot.val();
        renderTransactionHistory(transactions);
    });
}

function renderPlayerList(players) {
    playerListGrid.innerHTML = ''; // Clear current list
    if (players) {
        Object.keys(players).forEach(uid => {
            const player = players[uid];
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            playerCard.innerHTML = `
                <h3>${player.name}</h3>
                <p>฿${player.balance.toLocaleString('th-TH')}</p>
            `;
            playerListGrid.appendChild(playerCard);
        });
    } else {
        playerListGrid.innerHTML = '<p class="no-players-message">ยังไม่มีผู้เล่น</p>';
    }
}

function populatePlayerSelect(players) {
    bankPlayerSelect.innerHTML = '<option value="">เลือกผู้เล่น</option>'; // Default option
    if (players) {
        Object.keys(players).forEach(uid => {
            const player = players[uid];
            const option = document.createElement('option');
            option.value = uid;
            option.textContent = player.name;
            bankPlayerSelect.appendChild(option);
        });
    }
}

async function handleBankTransaction(type) {
    const selectedPlayerUid = bankPlayerSelect.value;
    const amount = parseAmountInput(bankAmountInput.value);

    if (!selectedPlayerUid || !amount) {
        showSweetAlert('warning', 'ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกผู้เล่นและระบุจำนวนเงิน');
        return;
    }

    if (amount <= 0) {
        showSweetAlert('warning', 'จำนวนเงินไม่ถูกต้อง', 'จำนวนเงินต้องมากกว่า 0');
        return;
    }

    try {
        const playerSnapshot = await playersRef.child(selectedPlayerUid).once('value');
        const player = playerSnapshot.val();

        if (!player) {
            showSweetAlert('error', 'ไม่พบผู้เล่น', 'ไม่พบข้อมูลผู้เล่นที่เลือก');
            return;
        }

        let newBalance = player.balance;
        let description = '';

        if (type === 'bankToPlayer') {
            newBalance += amount;
            description = `ธนาคารจ่ายให้ ${player.name} จำนวน ${formatMoney(amount)}`;
        } else if (type === 'playerToBank') {
            if (player.balance < amount) {
                showSweetAlert('error', 'ยอดเงินไม่พอ', `${player.name} มีเงินไม่พอที่จะจ่าย ${formatMoney(amount)}`);
                return;
            }
            newBalance -= amount;
            description = `${player.name} จ่ายให้ธนาคาร จำนวน ${formatMoney(amount)}`;
        }

        await playersRef.child(selectedPlayerUid).update({ balance: newBalance });

        const transactionData = {
            type: type === 'bankToPlayer' ? 'Bank to Player' : 'Player to Bank',
            sender: type === 'bankToPlayer' ? 'Bank' : player.name,
            receiver: type === 'bankToPlayer' ? player.name : 'Bank',
            amount: amount,
            description: description,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            initiatorId: currentBankUser ? currentBankUser.uid : 'N/A',
            initiatorName: currentBankUser ? currentBankUser.email.split('@')[0] : 'Guest'
        };

        await logTransaction(transactionData);

        showSweetAlert('success', 'ทำรายการสำเร็จ!', description);
        bankAmountInput.value = ''; // Clear amount input
        bankPlayerSelect.value = ''; // Clear player selection

    } catch (error) {
        console.error("Error handling bank transaction:", error);
        showSweetAlert('error', 'ทำรายการไม่สำเร็จ', 'เกิดข้อผิดพลาดในการทำรายการ: ' + error.message);
    }
}

bankToPlayerBtn.addEventListener('click', () => handleBankTransaction('bankToPlayer'));
playerToBankBtn.addEventListener('click', () => handleBankTransaction('playerToBank'));

// --- Transaction History ---
function renderTransactionHistory(transactions) {
    transactionHistoryDiv.innerHTML = ''; // Clear current history
    if (transactions) {
        // Convert to array and sort by timestamp descending
        const transactionList = Object.keys(transactions).map(key => ({
            ...transactions[key],
            key: key
        })).sort((a, b) => b.timestamp - a.timestamp);

        lastTransaction = transactionList.length > 0 ? transactionList[0] : null;
        updateUndoButtonState();

        transactionList.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';

            const date = new Date(transaction.timestamp).toLocaleString('th-TH');
            let amountText = '';
            if (transaction.amount) {
                amountText = ` (${formatMoney(transaction.amount)})`;
            }

            transactionItem.innerHTML = `
                <p><strong>${date}</strong></p>
                <p><strong>ประเภท:</strong> ${transaction.type}</p>
                <p><strong>รายละเอียด:</strong> ${transaction.description || 'N/A'}${amountText}</p>
                ${transaction.sender && transaction.receiver ? `<p><strong>จาก:</strong> ${transaction.sender} <strong>ถึง:</strong> ${transaction.receiver}</p>` : ''}
                <p><strong>โดย:</strong> ${transaction.initiatorName || 'ไม่ระบุ'}</p>
                <p class="transaction-key-small">ID: ${transaction.key}</p>
            `;
            transactionHistoryDiv.appendChild(transactionItem);
        });
    } else {
        transactionHistoryDiv.innerHTML = '<p class="no-transactions-message">ยังไม่มีการทำรายการ</p>';
        lastTransaction = null;
        updateUndoButtonState();
    }
}

async function logTransaction(transactionData) {
    try {
        // Add to Firebase Realtime Database
        const newTransactionRef = transactionsRef.push();
        const transactionKey = newTransactionRef.key;
        const dataToSave = { ...transactionData, key: transactionKey };
        await newTransactionRef.set(dataToSave);
        console.log("Transaction logged to Firebase:", dataToSave);
        lastTransaction = dataToSave; // Update last transaction for undo
        updateUndoButtonState();

        // Log to Google Sheets
        sendToGoogleSheets("Transactions", [
            new Date(dataToSave.timestamp).toLocaleString('th-TH'),
            dataToSave.sender || 'N/A',
            dataToSave.receiver || 'N/A',
            dataToSave.amount || 0,
            dataToSave.type || 'N/A',
            dataToSave.description || 'N/A',
            dataToSave.initiatorName || 'N/A',
            dataToSave.key
        ]);

    } catch (error) {
        console.error("Error logging transaction:", error);
        showSweetAlert('error', 'บันทึกธุรกรรมไม่สำเร็จ', 'เกิดข้อผิดพลาดในการบันทึกธุรกรรม: ' + error.message);
    }
}

function updateUndoButtonState() {
    if (lastTransaction && lastTransaction.type !== 'Reset' && lastTransaction.type !== 'Card Draw') {
        undoBtn.disabled = false;
    } else {
        undoBtn.disabled = true;
    }
}

historyBtn.addEventListener('click', () => {
    bankControlSection.style.display = 'none';
    historySection.style.display = 'flex';
});

backToBankControlBtn.addEventListener('click', () => {
    historySection.style.display = 'none';
    bankControlSection.style.display = 'flex';
});

// --- Undo Functionality ---
undoBtn.addEventListener('click', async () => {
    if (!lastTransaction) {
        showSweetAlert('info', 'ไม่มีรายการให้ย้อนกลับ', 'ไม่พบรายการธุรกรรมล่าสุดที่สามารถย้อนกลับได้');
        return;
    }

    if (lastTransaction.type === 'Reset' || lastTransaction.type === 'Card Draw') {
        showSweetAlert('warning', 'ไม่สามารถย้อนกลับได้', 'รายการรีเซ็ตหรือการสุ่มการ์ดไม่สามารถย้อนกลับได้ด้วยฟังก์ชันนี้');
        return;
    }

    // Confirm with user
    const result = await Swal.fire({
        title: 'ยืนยันการย้อนกลับ?',
        text: `คุณต้องการย้อนกลับรายการ "${lastTransaction.description}" นี้หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ย้อนกลับ!',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        try {
            const playerUid = lastTransaction.type === 'Bank to Player' ? await getPlayerUidFromName(lastTransaction.receiver) : await getPlayerUidFromName(lastTransaction.sender);
            if (!playerUid) {
                showSweetAlert('error', 'ย้อนกลับไม่สำเร็จ', 'ไม่พบผู้เล่นที่เกี่ยวข้อง');
                return;
            }

            const playerSnapshot = await playersRef.child(playerUid).once('value');
            const player = playerSnapshot.val();
            if (!player) {
                showSweetAlert('error', 'ย้อนกลับไม่สำเร็จ', 'ไม่พบข้อมูลผู้เล่น');
                return;
            }

            let newBalance = player.balance;
            const reversedAmount = lastTransaction.amount;
            let undoDescription = '';

            if (lastTransaction.type === 'Bank to Player') {
                newBalance -= reversedAmount; // Take money back from player
                undoDescription = `ย้อนกลับ: ธนาคารหักเงิน ${player.name} จำนวน ${formatMoney(reversedAmount)}`;
            } else if (lastTransaction.type === 'Player to Bank') {
                newBalance += reversedAmount; // Give money back to player
                undoDescription = `ย้อนกลับ: ธนาคารจ่ายเงิน ${player.name} จำนวน ${formatMoney(reversedAmount)}`;
            }

            await playersRef.child(playerUid).update({ balance: newBalance });

            // Remove the last transaction from Firebase
            await transactionsRef.child(lastTransaction.key).remove();

            // Log the undo action itself
            const undoTransactionData = {
                type: 'Undo',
                description: undoDescription,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                initiatorId: currentBankUser ? currentBankUser.uid : 'N/A',
                initiatorName: currentBankUser ? currentBankUser.email.split('@')[0] : 'Guest',
                originalTransactionKey: lastTransaction.key // Reference to the undone transaction
            };
            await logTransaction(undoTransactionData);

            showSweetAlert('success', 'ย้อนกลับสำเร็จ!', undoDescription);
            lastTransaction = null; // Clear last transaction after undo
            updateUndoButtonState();

        } catch (error) {
            console.error("Error during undo:", error);
            showSweetAlert('error', 'ย้อนกลับไม่สำเร็จ', 'เกิดข้อผิดพลาดในการย้อนกลับรายการ: ' + error.message);
        }
    }
});

// Helper to get Player UID from Name (for undo)
async function getPlayerUidFromName(playerName) {
    const snapshot = await playersRef.once('value');
    const players = snapshot.val();
    if (players) {
        for (const uid in players) {
            if (players[uid].name === playerName) {
                return uid;
            }
        }
    }
    return null;
}

// --- Reset Game Functionality ---
resetGameBtn.addEventListener('click', async () => {
    const result = await Swal.fire({
        title: 'ยืนยันการรีเซ็ตเกม?',
        text: "คุณต้องการรีเซ็ตยอดเงินผู้เล่นทั้งหมดเป็น ฿15,000,000 และล้างประวัติธุรกรรมทั้งหมดหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, รีเซ็ต!',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        await resetGame();
    }
});

async function resetGame() {
    if (!currentBankUser) {
        showSweetAlert('error', 'เข้าสู่ระบบก่อน', 'กรุณาเข้าสู่ระบบในฐานะผู้ควบคุมธนาคารเพื่อรีเซ็ตเกม');
        return;
    }

    try {
        // 1. Reset all player balances to default
        const playersSnapshot = await playersRef.once('value');
        const players = playersSnapshot.val();
        const playerUpdates = {};
        if (players) {
            Object.keys(players).forEach(uid => {
                playerUpdates[`${uid}/balance`] = 15000000; // Default Monopoly starting balance
            });
            await playersRef.update(playerUpdates);
        }

        // 2. Clear all existing transactions
        await transactionsRef.remove();
        transactionHistoryDiv.innerHTML = '<p class="no-transactions-message">ยังไม่มีการทำรายการ</p>'; // Clear UI history immediately

        // 3. Generate a key for the reset transaction and add it
        const newTransactionRef = transactionsRef.push();
        const transactionKey = newTransactionRef.key;
        const resetTransactionData = {
            type: 'Reset',
            description: 'เกมถูกรีเซ็ต',
            initiatorId: currentBankUser ? currentBankUser.uid : 'N/A',
            initiatorName: currentBankUser ? currentBankUser.email.split('@')[0] : 'Guest',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            key: transactionKey
        };
        await newTransactionRef.set(resetTransactionData); // Add the reset log

        // Log the reset event to Google Sheets
        sendToGoogleSheets("Transactions", [
            new Date().toLocaleString('th-TH'),
            'System', 'System', 0, 'Reset', 'All balances reset and history cleared',
            resetTransactionData.initiatorName,
            resetTransactionData.key
        ]);

        showSweetAlert('success', 'รีเซ็ตเกมสำเร็จ!', 'ยอดเงินผู้เล่นถูกตั้งค่าเริ่มต้นและประวัติถูกล้างแล้ว');
        lastTransaction = null; // Clear last transaction
        updateUndoButtonState();

    } catch (error) {
        console.error("Error resetting game:", error);
        showSweetAlert('error', 'รีเซ็ตไม่สำเร็จ', 'เกิดข้อผิดพลาดในการรีเซ็ตเกม: ' + error.message);
    }
}

// --- Theme Toggle ---
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    // Save preference to localStorage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Apply saved theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

// --- Card Drawing Logic ---
function drawCardDisplayOnly(cardType, cardDeck) {
    if (cardDeck.length === 0) {
        showSweetAlert('info', 'หมดแล้ว!', 'ไม่มีการ์ดให้สุ่มแล้วในกองนี้');
        return;
    }

    const randomIndex = Math.floor(Math.random() * cardDeck.length);
    const card = cardDeck[randomIndex];

    let cardText = card.text;
    if (card.amount !== undefined) {
        cardText += ` (ผลลัพธ์: ${formatMoney(card.amount)})`;
    } else if (card.action === "collectFromAll") {
        cardText += ` (ผลลัพธ์: ได้รับเงินจากผู้เล่นทุกคน)`;
    } else if (card.action === "payPerHouseHotel") {
        cardText += ` (ผลลัพธ์: จ่ายค่าซ่อมถนน)`;
        if (card.houseCost || card.hotelCost) {
            cardText += ` (บ้านละ ${formatMoney(card.houseCost || 0)}, โรงแรมละ ${formatMoney(card.hotelCost || 0)})`;
        }
    }

    showSweetAlert('info', `${cardType === 'treasure' ? 'การ์ดสมบัติ' : 'การ์ดอะไรเอ่ย'}!`, cardText);

    // --- ส่วนโค้ดใหม่ที่เพิ่มเข้ามาเพื่อบันทึกประวัติธุรกรรมการสุ่มการ์ด ---
    const newTransactionRef = transactionsRef.push(); // สร้าง Transaction ID ใหม่
    const transactionKey = newTransactionRef.key; // ดึง Transaction ID

    // สร้างข้อมูลธุรกรรมสำหรับ Firebase Realtime Database
    const transactionData = {
        type: 'Card Draw', // ประเภทธุรกรรม: สุ่มการ์ด
        description: `สุ่ม${cardType === 'treasure' ? 'การ์ดสมบัติ' : 'การ์ดอะไรเอ่ย'}: ${card.text}`, // รายละเอียด
        amount: card.amount || 0, // จำนวนเงินที่เกี่ยวข้อง (ถ้ามี)
        player: 'System', // ระบุว่าเป็น System หรือ Bank Controller
        timestamp: firebase.database.ServerValue.TIMESTAMP, // เวลาปัจจุบันจาก Firebase Server
        initiatorId: currentBankUser ? currentBankUser.uid : 'N/A', // UID ของผู้ดูแลธนาคาร (ถ้าเข้าสู่ระบบ)
        initiatorName: currentBankUser ? currentBankUser.email.split('@')[0] : 'Guest', // ชื่อผู้ดูแลธนาคาร
        key: transactionKey // Transaction ID
    };

    // บันทึกธุรกรรมลง Firebase Realtime Database
    newTransactionRef.set(transactionData)
        .then(() => {
            console.log("Card draw transaction logged to Firebase:", transactionData);
            // Optionally, update lastTransaction and undo button state if card draws should be undoable
            // lastTransaction = transactionData;
            // updateUndoButtonState();
        })
        .catch(error => {
            console.error("Error logging card draw to Firebase:", error);
        });

    // บันทึกธุรกรรมลง Google Sheets (เรียกใช้ฟังก์ชัน sendToGoogleSheets ที่มีอยู่แล้ว)
    sendToGoogleSheets("Transactions", [
        new Date().toLocaleString('th-TH'), // วันที่และเวลา
        'System', // ผู้ส่ง
        'System', // ผู้รับ
        transactionData.amount, // จำนวนเงิน
        'Card Draw', // ประเภท
        `สุ่ม${cardType === 'treasure' ? 'การ์ดสมบัติ' : 'การ์ดอะไรเอ่ย'}: ${card.text}`, // รายละเอียด
        transactionData.initiatorName, // ผู้ริเริ่ม
        transactionData.key // Transaction ID
    ]);
    // --- สิ้นสุดส่วนโค้ดใหม่ ---
}

drawTreasureCardBtn.addEventListener('click', () => drawCardDisplayOnly('treasure', treasureCards));
drawWhatCardBtn.addEventListener('click', () => drawCardDisplayOnly('what', whatCards));


// --- Theme Toggle ---
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    // Save preference to localStorage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Apply saved theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
});