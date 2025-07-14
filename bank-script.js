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

let currentBankUser = null;
let playersRef = db.ref('players');
let transactionsRef = db.ref('transactions');
let lastTransaction = null; // For Undo functionality specific to bank app

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

// --- Theme Toggle ---
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
});

// --- Bank Control Logic ---
function initializeBankControl() {
    listenToPlayers();
    listenToTransactions(); // Listen to all transactions for history display
}

function listenToPlayers() {
    playersRef.on('value', (snapshot) => {
        const players = snapshot.val();
        renderPlayerBalances(players); // Display all player balances
        populatePlayerSelects(players); // Populate selects for bank control
    });
}

function renderPlayerBalances(players) {
    playerListGrid.innerHTML = ''; // Clear existing player cards
    if (!players) return;

    const playerList = Object.keys(players).map(uid => ({ uid, ...players[uid] }));
    playerList.sort((a, b) => a.displayName.localeCompare(b.displayName));

    playerList.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <h3>${player.displayName}</h3>
            <p>${formatMoney(player.balance)}</p>
        `;
        playerListGrid.appendChild(playerCard);
    });
}

function populatePlayerSelects(players) {
    bankPlayerSelect.innerHTML = '<option value="">เลือกผู้เล่น</option>'; // Always have a default option

    if (!players) return;

    const playerList = Object.keys(players).map(uid => ({ uid, ...players[uid] }));
    playerList.sort((a, b) => a.displayName.localeCompare(b.displayName));

    playerList.forEach(player => {
        const optionBank = document.createElement('option');
        optionBank.value = player.uid;
        optionBank.textContent = player.displayName;
        bankPlayerSelect.appendChild(optionBank);
    });
}

function listenToTransactions() {
    transactionHistoryDiv.innerHTML = '<p class="no-transactions-message">ยังไม่มีการทำรายการ</p>';

    transactionsRef.limitToLast(100).on('child_added', (snapshot) => {
        const transaction = snapshot.val();
        const noTransactionsMessage = transactionHistoryDiv.querySelector('.no-transactions-message');
        if (noTransactionsMessage) {
            noTransactionsMessage.remove();
        }
        addTransactionToLog(transaction);
    });

    transactionsRef.on('child_removed', (snapshot) => {
        const removedKey = snapshot.key;
        const logEntryToRemove = transactionHistoryDiv.querySelector(`[data-transaction-key="${removedKey}"]`);
        if (logEntryToRemove) {
            logEntryToRemove.remove();
            showSweetAlert('info', 'ธุรกรรมถูกย้อนกลับ', 'ธุรกรรมถูกย้อนกลับแล้ว!');
        }
        if (transactionHistoryDiv.children.length === 0) {
            transactionHistoryDiv.innerHTML = '<p class="no-transactions-message">ยังไม่มีการทำรายการ</p>';
        }
    });
}

function addTransactionToLog(transaction) {
    const transactionDiv = document.createElement('div');
    const timestamp = new Date(transaction.timestamp).toLocaleTimeString('th-TH');
    let description = '';
    switch (transaction.type) {
        case 'Transfer':
            description = `[${timestamp}] ${transaction.fromPlayerName} โอน ${formatMoney(transaction.amount)} ให้ ${transaction.toPlayerName}`;
            break;
        case 'BankToPlayer':
            description = `[${timestamp}] ธนาคารโอน ${formatMoney(transaction.amount)} ให้ ${transaction.toPlayerName} (โดย ${transaction.initiatorName})`;
            break;
        case 'PlayerToBank':
            description = `[${timestamp}] ${transaction.fromPlayerName} จ่าย ${formatMoney(transaction.amount)} ให้ธนาคาร (โดย ${transaction.initiatorName})`;
            break;
        case 'Reset':
            description = `[${timestamp}] เกมถูกรีเซ็ตโดย ${transaction.initiatorName}`;
            break;
        case 'Undo': // Specific undo log for visual clarity
            description = `[${timestamp}] ยกเลิกธุรกรรมก่อนหน้า: ${transaction.description} (โดย ${transaction.initiatorName})`;
            break;
        default:
            description = `[${timestamp}] ${transaction.description || 'ธุรกรรมไม่ทราบประเภท'}`;
    }
    transactionDiv.textContent = description;
    transactionDiv.setAttribute('data-transaction-key', transaction.key || '');
    if (transactionHistoryDiv.firstChild && transactionHistoryDiv.firstChild.classList.contains('no-transactions-message')) {
        transactionHistoryDiv.innerHTML = '';
        transactionHistoryDiv.appendChild(transactionDiv);
    } else if (transactionHistoryDiv.firstChild) {
        transactionHistoryDiv.insertBefore(transactionDiv, transactionHistoryDiv.firstChild);
    } else {
        transactionHistoryDiv.appendChild(transactionDiv);
    }
}

// Helper to log transactions to Firebase and Google Sheets
async function logTransaction(transactionData) {
    sendToGoogleSheets("Transactions", [
        new Date().toLocaleString('th-TH'), // Use local time string for Sheets, specific locale
        transactionData.fromPlayerName || 'N/A',
        transactionData.toPlayerName || 'N/A',
        transactionData.amount, // Send raw amount to Sheets
        transactionData.type,
        transactionData.description || '',
        transactionData.initiatorName || 'N/A',
        transactionData.key // Include key for Sheets if available
    ]);
}

// Helper to send data to Google Sheets
async function sendToGoogleSheets(sheetName, data) {
    if (GOOGLE_SHEETS_WEB_APP_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL" || !GOOGLE_SHEETS_WEB_APP_URL) {
        console.warn("GOOGLE_SHEETS_WEB_APP_URL has not been configured. Skipping Google Sheets logging.");
        return;
    }
    try {
        const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Apps Script GET/POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sheet: sheetName, data: data })
        });
        console.log(`Data sent to Google Sheets (sheet: ${sheetName}). Check Apps Script logs for confirmation.`);
    } catch (error) {
        console.error("Error sending data to Google Sheets:", error);
    }
}

// --- Bank Control Buttons ---

// Bank gives money to player
bankToPlayerBtn.addEventListener('click', async () => {
    const playerId = bankPlayerSelect.value;
    const amount = parseAmountInput(bankAmountInput.value);

    if (!playerId || amount <= 0) {
        showSweetAlert('warning', 'ข้อมูลไม่ถูกต้อง', 'กรุณาเลือกผู้เล่นและระบุจำนวนเงินที่ถูกต้อง');
        return;
    }

    try {
        const playerSnap = await playersRef.child(playerId).once('value');
        const player = playerSnap.val();

        if (!player) {
            showSweetAlert('error', 'ไม่พบผู้เล่น', 'ไม่พบข้อมูลผู้เล่นที่เลือก');
            return;
        }

        const newTransactionRef = transactionsRef.push();
        const transactionKey = newTransactionRef.key;

        const updates = {};
        updates[`players/${playerId}/balance`] = player.balance + amount;

        const transactionData = {
            type: 'BankToPlayer',
            fromPlayerId: 'Bank',
            fromPlayerName: 'ธนาคาร',
            toPlayerId: playerId,
            toPlayerName: player.displayName,
            amount: amount,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            key: transactionKey,
            initiatorName: currentBankUser ? currentBankUser.email.split('@')[0] : 'N/A'
        };
        updates[`transactions/${transactionKey}`] = transactionData;

        await db.ref().update(updates);

        lastTransaction = { key: transactionKey, data: transactionData };

        showSweetAlert('success', 'โอนเงินสำเร็จ!', `ธนาคารโอนเงิน ${formatMoney(amount)} ให้ ${player.displayName} สำเร็จแล้ว`);
        bankAmountInput.value = '';
        bankPlayerSelect.value = '';

        logTransaction(transactionData);

    } catch (error) {
        console.error("Error Bank to Player:", error);
        showSweetAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการโอนเงินจากธนาคาร: ' + error.message);
    }
});

// Player pays money to Bank
playerToBankBtn.addEventListener('click', async () => {
    const playerId = bankPlayerSelect.value;
    const amount = parseAmountInput(bankAmountInput.value);

    if (!playerId || amount <= 0) {
        showSweetAlert('warning', 'ข้อมูลไม่ถูกต้อง', 'กรุณาเลือกผู้เล่นและระบุจำนวนเงินที่ถูกต้อง');
        return;
    }

    try {
        const playerSnap = await playersRef.child(playerId).once('value');
        const player = playerSnap.val();

        if (!player) {
            showSweetAlert('error', 'ไม่พบผู้เล่น', 'ไม่พบข้อมูลผู้เล่นที่เลือก');
            return;
        }
        if (player.balance < amount) {
            showSweetAlert('error', 'ยอดเงินไม่พอ', `${player.displayName} มีเงินไม่พอจ่ายธนาคาร: ${formatMoney(player.balance)}`);
            return;
        }

        const newTransactionRef = transactionsRef.push();
        const transactionKey = newTransactionRef.key;

        const updates = {};
        updates[`players/${playerId}/balance`] = player.balance - amount;

        const transactionData = {
            type: 'PlayerToBank',
            fromPlayerId: playerId,
            fromPlayerName: player.displayName,
            toPlayerId: 'Bank',
            toPlayerName: 'ธนาคาร',
            amount: amount,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            key: transactionKey,
            initiatorName: currentBankUser ? currentBankUser.email.split('@')[0] : 'N/A'
        };
        updates[`transactions/${transactionKey}`] = transactionData;

        await db.ref().update(updates);

        lastTransaction = { key: transactionKey, data: transactionData };

        showSweetAlert('success', 'ทำรายการสำเร็จ!', `${player.displayName} จ่ายเงิน ${formatMoney(amount)} ให้ธนาคารสำเร็จแล้ว`);
        bankAmountInput.value = '';
        bankPlayerSelect.value = '';

        logTransaction(transactionData);

    } catch (error) {
        console.error("Error Player to Bank:", error);
        showSweetAlert('error', 'เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการจ่ายเงินให้ธนาคาร: ' + error.message);
    }
});

// --- History Section Toggle ---
historyBtn.addEventListener('click', () => {
    bankControlSection.style.display = 'none';
    historySection.style.display = 'flex';
});

backToBankControlBtn.addEventListener('click', () => {
    historySection.style.display = 'none';
    bankControlSection.style.display = 'flex';
});

// Undo Last Transaction
undoBtn.addEventListener('click', async () => {
    if (!lastTransaction) {
        showSweetAlert('info', 'ไม่พบรายการ', 'ไม่พบรายการล่าสุดที่สามารถย้อนกลับได้');
        return;
    }

    const transactionToUndo = lastTransaction.data;
    const transactionKey = lastTransaction.key;

    const { isConfirmed } = await Swal.fire({
        title: 'คุณแน่ใจหรือไม่?',
        text: `คุณต้องการย้อนกลับรายการ: ${transactionToUndo.description || transactionToUndo.type} ของ ${transactionToUndo.fromPlayerName || transactionToUndo.toPlayerName}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, ย้อนกลับ!',
        cancelButtonText: 'ยกเลิก'
    });

    if (!isConfirmed) {
        return;
    }

    try {
        const updates = {};

        let targetPlayerId = null;
        let targetPlayerBalance = 0;

        if (transactionToUndo.type === 'BankToPlayer') {
            targetPlayerId = transactionToUndo.toPlayerId;
            const snap = await playersRef.child(targetPlayerId).once('value');
            targetPlayerBalance = snap.val() ? snap.val().balance : 0;
            updates[`players/${targetPlayerId}/balance`] = targetPlayerBalance - transactionToUndo.amount; // Take back from player
        } else if (transactionToUndo.type === 'PlayerToBank') {
            targetPlayerId = transactionToUndo.fromPlayerId;
            const snap = await playersRef.child(targetPlayerId).once('value');
            targetPlayerBalance = snap.val() ? snap.val().balance : 0;
            updates[`players/${targetPlayerId}/balance`] = targetPlayerBalance + transactionToUndo.amount; // Give back to player
        } else {
            showSweetAlert('error', 'ไม่สามารถย้อนกลับได้', 'ไม่สามารถย้อนกลับธุรกรรมประเภทนี้ได้จากหน้าควบคุมธนาคาร (รองรับเฉพาะ BankToPlayer และ PlayerToBank)');
            return;
        }

        updates[`transactions/${transactionKey}`] = null; // Remove the original transaction record

        await db.ref().update(updates);

        // Log the undo action itself as a new transaction for audit
        const undoLogRef = transactionsRef.push();
        const undoLogKey = undoLogRef.key;
        const undoLogData = {
            type: 'Undo',
            description: `ย้อนกลับรายการ [${transactionToUndo.type}] สำหรับ ${transactionToUndo.fromPlayerName || transactionToUndo.toPlayerName} จำนวน ${formatMoney(transactionToUndo.amount)}`,
            originalTransactionKey: transactionKey,
            originalTransactionType: transactionToUndo.type,
            initiatorId: currentBankUser ? currentBankUser.uid : 'N/A',
            initiatorName: currentBankUser ? currentBankUser.email.split('@')[0] : 'Guest',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            key: undoLogKey
        };
        await undoLogRef.set(undoLogData);
        logTransaction(undoLogData); // Log undo to sheets

        lastTransaction = null; // Clear last transaction after undo
        showSweetAlert('success', 'ย้อนกลับสำเร็จ!', 'รายการถูกย้อนกลับเรียบร้อยแล้ว');
    } catch (error) {
        console.error("Error undoing transaction:", error);
        showSweetAlert('error', 'ย้อนกลับไม่สำเร็จ', 'เกิดข้อผิดพลาดในการย้อนกลับ: ' + error.message);
    }
});

// Reset Game
resetGameBtn.addEventListener('click', async () => {
    const { isConfirmed } = await Swal.fire({
        title: 'คุณแน่ใจหรือไม่?',
        text: 'คุณแน่ใจหรือไม่ที่ต้องการรีเซ็ตเกม? ยอดเงินผู้เล่นทั้งหมดจะถูกตั้งค่าเริ่มต้นและประวัติจะถูกล้าง!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, รีเซ็ตเกม!',
        cancelButtonText: 'ยกเลิก'
    });

    if (!isConfirmed) {
        return;
    }

    try {
        const playersSnapshot = await playersRef.once('value');
        const players = playersSnapshot.val();
        const playerUpdates = {};
        if (players) {
            Object.keys(players).forEach(uid => {
                playerUpdates[`${uid}/balance`] = 15000000;
            });
            await playersRef.update(playerUpdates);
        }

        await transactionsRef.remove();
        transactionHistoryDiv.innerHTML = '<p class="no-transactions-message">ยังไม่มีการทำรายการ</p>';

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
        await newTransactionRef.set(resetTransactionData);

        logTransaction(resetTransactionData);

        showSweetAlert('success', 'รีเซ็ตเกมสำเร็จ!', 'ยอดเงินผู้เล่นถูกตั้งค่าเริ่มต้นและประวัติถูกล้างแล้ว');
        lastTransaction = null;

    } catch (error) {
        console.error("Error resetting game:", error);
        showSweetAlert('error', 'รีเซ็ตไม่สำเร็จ', 'เกิดข้อผิดพลาดในการรีเซ็ตเกม: ' + error.message);
    }
});

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