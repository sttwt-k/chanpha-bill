import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, X, FileText, Download, 
  TrendingUp, Calendar, Settings, PieChart, 
  CreditCard, Wallet, Landmark, 
  AlertCircle, ArrowRightLeft, ArrowRight, 
  Filter, RefreshCw, Database, Cloud
} from 'lucide-react';

// Firebase Imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, query, limit, 
  onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, orderBy, getDocs 
} from 'firebase/firestore';

// --- 🔴 ส่วนตั้งค่า FIREBASE (ใส่ค่า Config ของคุณตรงนี้) ---
const firebaseConfig = {
  apiKey: "AIzaSyCj5ZWEVjQJC9DM3X2oTacbbkSXYPXopNQ",
  authDomain: "chanpha-bill-db.firebaseapp.com",
  projectId: "chanpha-bill-db",
  storageBucket: "chanpha-bill-db.firebasestorage.app",
  messagingSenderId: "839581764938",
  appId: "1:839581764938:web:c9c0865febcc9ffdab05b3",
  measurementId: "G-NSVB9G7S6R"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// --- Constants ---

const BANK_COLORS = {
  KBANK: { name: 'กสิกรไทย (KBANK)', color: '#138f2d', bg: 'bg-[#138f2d]' },
  SCB: { name: 'ไทยพาณิชย์ (SCB)', color: '#4e2e7f', bg: 'bg-[#4e2e7f]' },
  BBL: { name: 'กรุงเทพ (BBL)', color: '#1e4598', bg: 'bg-[#1e4598]' },
  KTB: { name: 'กรุงไทย (KTB)', color: '#1ba5e1', bg: 'bg-[#1ba5e1]' },
  BAY: { name: 'กรุงศรี (BAY)', color: '#fec43b', bg: 'bg-[#fec43b]' },
  TTB: { name: 'ทีทีบี (ttb)', color: '#0056ff', bg: 'bg-[#0056ff]' },
  GSB: { name: 'ออมสิน (GSB)', color: '#eb198d', bg: 'bg-[#eb198d]' },
  OTHER: { name: 'อื่นๆ', color: '#64748b', bg: 'bg-slate-500' }
};

const INITIAL_CATEGORIES = {
  income: ['ขายสินค้า', 'ค่าบริการ', 'ดอกเบี้ยรับ', 'เงินคืน', 'อื่นๆ'],
  expense: ['ซื้อสินค้า', 'ค่าเดินทาง', 'ค่าสาธารณูปโภค', 'เงินเดือน', 'ค่าเช่า', 'ค่าโฆษณา', 'อาหาร & เครื่องดื่ม', 'วัสดุสิ้นเปลือง', 'ภาษี', 'ดอกเบี้ยจ่าย', 'อื่นๆ']
};

export default function App() {
  const [activeTab, setActiveTab] = useState('expense');
  
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [externalApps, setExternalApps] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isSyncFormOpen, setIsSyncFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({});
  const [useVatCalc, setUseVatCalc] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [accountFormData, setAccountFormData] = useState({});
  const [editingAccountId, setEditingAccountId] = useState(null);
  
  const [syncFormData, setSyncFormData] = useState({
     collectionName: 'orders',
     amountField: 'totalPrice',
     dateField: 'createdAt',
     descField: 'orderId'
  });

  const [newCatName, setNewCatName] = useState('');
  const [catTypeToEdit, setCatTypeToEdit] = useState('expense');
  const [settingSubTab, setSettingSubTab] = useState('category');

  useEffect(() => {
    setIsLoading(true);

    const qTrans = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(500));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setIsLoading(false);
    });

    const qAcc = query(collection(db, 'accounts'));
    const unsubAcc = onSnapshot(qAcc, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(data.sort((a,b) => a.name.localeCompare(b.name)));
    });

    const unsubCat = onSnapshot(doc(db, 'settings', 'categories'), (doc) => {
      if (doc.exists()) {
        setCategories(doc.data());
      } else {
        setDoc(doc.ref, INITIAL_CATEGORIES);
      }
    });

    // Load External Apps config from LocalStorage (It's local config)
    const savedApps = localStorage.getItem('chanpha-external-apps');
    if (savedApps) setExternalApps(JSON.parse(savedApps));

    return () => {
      unsubTrans();
      unsubAcc();
      unsubCat();
    };
  }, []);

  // Save external apps to local storage when changed
  useEffect(() => {
    localStorage.setItem('chanpha-external-apps', JSON.stringify(externalApps));
  }, [externalApps]);

  const generateBillNo = (type) => {
    const prefix = type === 'income' ? 'INC' : type === 'expense' ? 'EXP' : 'TRF';
    const sameTypeTrans = transactions.filter(t => t.type === type && t.billNo.startsWith(prefix));
    let maxNum = 0;
    sameTypeTrans.forEach(t => {
      const parts = t.billNo.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1]);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const getAccountBalance = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;
    
    let balance = account.initialBalance || 0;
    
    transactions.forEach(t => {
      if (t.status === 'completed') {
        if (t.type === 'income') {
           if (t.accountId === accountId) balance += t.amount;
        } else if (t.type === 'expense') {
           if (t.accountId === accountId) balance -= t.amount;
        } else if (t.type === 'transfer') {
           if (t.accountId === accountId) balance -= t.amount;
           if (t.targetAccountId === accountId) balance += t.amount;
        }
      }
    });

    if (account.type === 'credit') {
       let usedAmount = 0;
       transactions.forEach(t => {
         if (t.status === 'completed') {
           if (t.type === 'expense' && t.accountId === accountId) usedAmount += t.amount;
           if (t.type === 'transfer' && t.targetAccountId === accountId) usedAmount -= t.amount;
         }
       });
       return (account.creditLimit || 0) - usedAmount;
    }
    
    return balance;
  };

  const getUniqueMonths = () => {
    const months = new Set();
    const current = new Date().toISOString().slice(0, 7);
    months.add(current);
    transactions.forEach(t => months.add(t.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  };

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- Sync Logic ---

  const performSync = async () => {
    if (externalApps.length === 0) return alert('กรุณาเพิ่มการเชื่อมต่อ (Config) ก่อนครับ');
    
    setIsSyncing(true);
    setSyncStatus('กำลังเริ่มเชื่อมต่อ...');
    
    const defaultAccount = accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id;
    let newTransactionsCount = 0;

    try {
      for (const appConfig of externalApps) {
        setSyncStatus(`กำลังดึงข้อมูลจาก ${appConfig.name}...`);
        
        let firebaseOptions;
        try {
            firebaseOptions = JSON.parse(appConfig.config);
        } catch (e) {
            console.error(e);
            setSyncStatus(`Config ของ ${appConfig.name} ไม่ถูกต้อง`);
            continue;
        }

        let firebaseApp;
        try {
            const existingApps = getApps();
            const found = existingApps.find(app => app.name === appConfig.id);
            if (found) {
                firebaseApp = found;
            } else {
                firebaseApp = initializeApp(firebaseOptions, appConfig.id);
            }
        } catch (e) {
            console.error("Init Error", e);
            setSyncStatus(`Error init ${appConfig.name}`);
            continue;
        }

        const extDb = getFirestore(firebaseApp);
        const q = query(collection(extDb, appConfig.collectionName), limit(50)); 
        
        let snapshot;
        try {
             snapshot = await getDocs(q);
        } catch (err) {
            console.error("Fetch Error", err);
            continue;
        }

        const newTrans = [];

        snapshot.forEach(doc => {
           const data = doc.data();
           const externalId = doc.id;
           
           const exists = transactions.some(t => t.externalId === externalId && t.syncedFrom === appConfig.name);
           if (exists) return;

           const rawAmount = data[appConfig.amountField];
           const rawDate = data[appConfig.dateField];
           const rawDesc = data[appConfig.descField];

           const amount = parseFloat(String(rawAmount)) || 0;
           
           let dateStr = new Date().toISOString().split('T')[0];
           if (rawDate) {
               if (typeof rawDate === 'object' && 'toDate' in rawDate && typeof rawDate.toDate === 'function') {
                   dateStr = rawDate.toDate().toISOString().split('T')[0];
               } else if (typeof rawDate === 'string') {
                   dateStr = rawDate.split('T')[0];
               }
           }

           const desc = rawDesc ? String(rawDesc) : `รายการจาก ${appConfig.name}`;

           if (amount > 0) {
               newTrans.push({
                   type: 'income',
                   date: dateStr,
                   billNo: '', 
                   description: desc,
                   category: 'ขายสินค้า',
                   amount: amount,
                   paymentMethod: 'transfer',
                   accountId: defaultAccount || null,
                   note: `Synced from ${appConfig.name} (${externalId})`,
                   status: 'completed',
                   syncedFrom: appConfig.name,
                   externalId: externalId,
                   createdAt: new Date()
               });
           }
        });

        if (newTrans.length > 0) {
            // Loop add
            for (const t of newTrans) {
               const randomSuffix = Math.floor(Math.random() * 1000);
               t.billNo = `INC-SYNC-${randomSuffix}`; 
               await addDoc(collection(db, 'transactions'), t);
            }
            newTransactionsCount += newTrans.length;
        }
      }
      setSyncStatus(`เสร็จสิ้น! เพิ่มรายการใหม่ ${newTransactionsCount} รายการ`);
    } catch (error) {
       console.error(error);
       setSyncStatus('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
       setIsSyncing(false);
       setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  // --- Handlers ---

  const initTransactionForm = (transaction, typeOverride) => {
    if (transaction) {
      setFormData(transaction);
      setEditingId(transaction.id);
      setUseVatCalc(!!transaction.vatAmount && transaction.vatAmount > 0);
    } else {
      const currentType = typeOverride || (activeTab === 'income' ? 'income' : activeTab === 'expense' ? 'expense' : 'transfer');
      const compatibleAccount = accounts.find(a => a.type === 'cash');
      
      setFormData({
        type: currentType,
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        paymentMethod: 'cash',
        amount: 0,
        preTaxAmount: 0,
        vatAmount: 0,
        category: currentType === 'transfer' ? 'โอนเงิน/ชำระหนี้' : categories[currentType][0],
        description: currentType === 'transfer' ? 'โอนเงินระหว่างบัญชี' : '',
        billNo: generateBillNo(currentType),
        accountId: compatibleAccount?.id || '',
        targetAccountId: ''
      });
      setEditingId(null);
      setUseVatCalc(false);
    }
    setShowConfirmModal(false);
    setIsFormOpen(true);
  };

  const handlePaymentMethodChange = (method) => {
    setFormData(prev => {
      let acc;
      if (method === 'credit') acc = accounts.find(a => a.type === 'credit');
      else if (method === 'transfer') acc = accounts.find(a => a.type === 'bank');
      else acc = accounts.find(a => a.type === 'cash');

      return {
          ...prev,
          paymentMethod: method,
          accountId: acc ? acc.id : ''
      };
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (['amount', 'preTaxAmount', 'vatAmount'].includes(name)) {
        updated[name] = parseFloat(value) || 0;
      }
      if (useVatCalc && name === 'preTaxAmount') {
         const preTax = parseFloat(value) || 0;
         updated.vatAmount = preTax * 0.07;
         updated.amount = preTax + updated.vatAmount;
      } else if (useVatCalc && name === 'vatAmount') {
         updated.amount = (updated.preTaxAmount || 0) + (parseFloat(value) || 0);
      }
      return updated;
    });
  };

  const saveExternalApp = () => {
      if (!syncFormData.config) return alert("กรุณาใส่ Config");
      try {
          JSON.parse(syncFormData.config); 
      } catch (e) {
          return alert('Config JSON ไม่ถูกต้อง');
      }

      const newApp = {
          id: `app_${Date.now()}`,
          name: syncFormData.name || 'External App',
          config: syncFormData.config,
          collectionName: syncFormData.collectionName || 'orders',
          amountField: syncFormData.amountField || 'total',
          dateField: syncFormData.dateField || 'createdAt',
          descField: syncFormData.descField || 'id'
      };

      setExternalApps(prev => [...prev, newApp]);
      setIsSyncFormOpen(false);
      setSyncFormData({
         collectionName: 'orders',
         amountField: 'totalPrice',
         dateField: 'createdAt',
         descField: 'orderId',
         config: ''
      });
  };

  const validateAndPreview = (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) return alert('กรุณาระบุจำนวนเงิน');
    if (!formData.description) return alert('กรุณาระบุรายการ');
    if (formData.type === 'transfer') {
       if (formData.accountId === formData.targetAccountId) return alert('บัญชีต้นทางและปลายทางต้องไม่เหมือนกัน');
       if (!formData.targetAccountId) return alert('กรุณาระบุบัญชีปลายทาง');
    }
    if (formData.type !== 'transfer' && !formData.accountId) {
       return alert('กรุณาเลือกบัญชี/ช่องทางชำระเงิน');
    }
    setShowConfirmModal(true);
  };

  const saveTransaction = async () => {
    const payload = {
        type: formData.type || 'expense',
        date: formData.date || new Date().toISOString().split('T')[0],
        billNo: formData.billNo || '',
        description: formData.description || '',
        category: formData.category || 'อื่นๆ',
        amount: formData.amount || 0,
        paymentMethod: formData.paymentMethod || 'cash',
        status: formData.status || 'completed',
        note: formData.note || '',
        accountId: formData.accountId || null,
        targetAccountId: formData.targetAccountId || null,
        payee: formData.payee || null,
        originalBillNo: formData.originalBillNo || null,
        preTaxAmount: formData.preTaxAmount || 0,
        vatAmount: formData.vatAmount || 0,
        syncedFrom: formData.syncedFrom || null,
        externalId: formData.externalId || null,
        updatedAt: new Date()
    };

    try {
      if (editingId) {
          await updateDoc(doc(db, 'transactions', editingId), payload);
      } else {
          payload.createdAt = new Date();
          await addDoc(collection(db, 'transactions'), payload);
      }
      setShowConfirmModal(false);
      setIsFormOpen(false);
      setEditingId(null);
    } catch (error) {
      alert("Error saving: " + error);
    }
  };

  const deleteTransaction = async (id) => {
    if (confirm('ยืนยันการลบรายการนี้?')) {
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (error) {
        alert("Error deleting: " + error);
      }
    }
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    if (!accountFormData.name) return;

    const payload = {
      name: accountFormData.name || 'New Account',
      type: accountFormData.type || 'cash',
      color: accountFormData.color || '#64748b',
      bankName: accountFormData.bankName || null,
      initialBalance: Number(accountFormData.initialBalance) || 0,
      creditLimit: Number(accountFormData.creditLimit) || 0,
      accountNumber: accountFormData.accountNumber || null,
      cutOffDay: Number(accountFormData.cutOffDay) || 0,
      dueDay: Number(accountFormData.dueDay) || 0
    };

    if (payload.type === 'bank' && payload.bankName) {
       const bankKey = Object.keys(BANK_COLORS).find(k => k === payload.bankName);
       if (bankKey) payload.color = BANK_COLORS[bankKey].color;
    }

    try {
      if (editingAccountId) {
          await updateDoc(doc(db, 'accounts', editingAccountId), payload);
      } else {
          await addDoc(collection(db, 'accounts'), payload);
      }
      setIsAccountFormOpen(false);
      setEditingAccountId(null);
    } catch (error) {
      alert("Error saving account: " + error);
    }
  };

  const deleteAccount = async (id) => {
    if(confirm('ลบบัญชี?')) {
      try {
        await deleteDoc(doc(db, 'accounts', id));
      } catch (error) {
        alert("Error deleting: " + error);
      }
    }
  };

  const updateCategory = async (newCategories) => {
    try {
      await setDoc(doc(db, 'settings', 'categories'), newCategories);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Export ---
  const exportToCSV = (filterType) => {
    const dataToExport = transactions.filter(t => t.date.startsWith(selectedMonth) && (filterType === 'all' ? true : t.type === filterType));
    const headers = ["Type", "Date", "Bill No", "Original Bill", "Payee", "Description", "Category", "Amount", "Account", "Status"];
    const csvContent = [headers.join(","), ...dataToExport.map(t => [t.type, t.date, t.billNo, t.originalBillNo || '', t.payee || '', `"${t.description}"`, t.category, t.amount, accounts.find(a => a.id === t.accountId)?.name || '', t.status].join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${selectedMonth}_${filterType}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- Derived Data ---
  
  const filteredTransactions = transactions
    .filter(t => t.date.startsWith(selectedMonth))
    .filter(t => showPendingOnly ? t.status === 'pending' : true)
    .filter(t => (activeTab === 'income' || activeTab === 'expense') ? t.type === activeTab : true)
    .sort((a, b) => {
       if (!sortConfig) return 0;
       const aVal = a[sortConfig.key];
       const bVal = b[sortConfig.key];
       if (aVal === bVal) return 0;
       return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  
  const totalIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(selectedMonth)).reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth)).reduce((acc, curr) => acc + curr.amount, 0);

  const expenseByCategory = useMemo(() => {
    const groups = {};
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(selectedMonth)).forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [transactions, selectedMonth]);

  const renderStatusBadge = (status) => (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
      {status === 'completed' ? 'สำเร็จ/จ่ายแล้ว' : 'รอดำเนินการ'}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md">
                <FileText size={20} />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight text-slate-900 block leading-tight">Chanpha Bill</span>
                <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1"><Cloud size={10} /> Online Mode (JSX)</span>
              </div>
            </div>
            
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
               {['income', 'expense', 'wallets', 'summary'].map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? (tab === 'income' ? 'bg-white text-emerald-600 shadow-sm' : tab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : tab === 'wallets' ? 'bg-white text-blue-600 shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-gray-500 hover:text-gray-700'}`}>
                   {tab === 'income' ? 'รายรับ' : tab === 'expense' ? 'รายจ่าย' : tab === 'wallets' ? 'กระเป๋าตัง' : 'สรุปภาพรวม'}
                 </button>
               ))}
               <button onClick={() => setActiveTab('settings')} className={`px-3 py-1.5 rounded-lg ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                 <Settings size={16} />
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
             <div className="flex flex-col items-center">
                <RefreshCw className="animate-spin text-slate-900 mb-2" size={32} />
                <p className="text-sm font-medium text-slate-600">กำลังเชื่อมต่อฐานข้อมูล...</p>
             </div>
          </div>
        )}

        {/* Controls */}
        {activeTab !== 'wallets' && activeTab !== 'settings' && (
           <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
             <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                <Calendar size={18} className="ml-2 text-gray-500" />
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-medium text-slate-700 outline-none pr-2 py-1">
                   {getUniqueMonths().map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
             {activeTab !== 'summary' && (
                <button onClick={() => setShowPendingOnly(!showPendingOnly)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${showPendingOnly ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                   <Filter size={14} /> {showPendingOnly ? 'แสดงทั้งหมด' : 'แสดงเฉพาะรอดำเนินการ'}
                </button>
             )}
           </div>
        )}

        {/* ... (All other components follow below, essentially the same structure but without types) */}
        
        {/* === WALLETS TAB === */}
        {activeTab === 'wallets' && (
          <div className="animate-in fade-in">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Wallet className="text-blue-600" /> บัญชีและการเงิน</h2>
              <div className="flex gap-2">
                 <button onClick={() => initTransactionForm(undefined, 'transfer')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200"><ArrowRightLeft size={16} /> โอน / จ่าย / ฝาก</button>
                 <button onClick={() => { setAccountFormData({ type: 'bank', color: '#1e293b', initialBalance: 0 }); setEditingAccountId(null); setIsAccountFormOpen(true); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 flex items-center gap-2"><Plus size={16} /> เพิ่มบัญชี</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(acc => {
                const balance = getAccountBalance(acc.id);
                const isCredit = acc.type === 'credit';
                return (
                  <div key={acc.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative group">
                    <div className="h-2 w-full absolute top-0" style={{ backgroundColor: acc.color }}></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600">{acc.type === 'bank' ? <Landmark size={20} /> : acc.type === 'credit' ? <CreditCard size={20} /> : <Wallet size={20} />}</div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setAccountFormData(acc); setEditingAccountId(acc.id); setIsAccountFormOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 size={14} /></button>
                          <button onClick={() => deleteAccount(acc.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-1">{acc.name}</h3>
                      {acc.type === 'bank' && <p className="text-sm text-gray-500 mb-4">{acc.bankName} • {acc.accountNumber}</p>}
                      <div className="border-t pt-4">
                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">{isCredit ? 'วงเงินคงเหลือ' : 'ยอดเงินคงเหลือ'}</p>
                        <p className={`text-2xl font-bold ${balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>฿{balance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {accounts.length === 0 && !isLoading && (
                <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                   <p>ยังไม่มีบัญชีเริ่มต้น</p>
                   <button onClick={() => { setAccountFormData({ type: 'cash', color: '#64748b', initialBalance: 0 }); setIsAccountFormOpen(true); }} className="text-indigo-600 font-medium mt-2 hover:underline">เพิ่มกระเป๋าตังค์แรกของคุณ</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === SETTINGS TAB === */}
        {activeTab === 'settings' && (
           <div className="max-w-3xl mx-auto animate-in fade-in">
             <div className="flex gap-4 mb-6">
                <button onClick={() => setSettingSubTab('category')} className={`px-4 py-2 rounded-lg font-medium ${settingSubTab === 'category' ? 'bg-slate-900 text-white' : 'bg-white text-gray-600'}`}>จัดการหมวดหมู่</button>
                <button onClick={() => setSettingSubTab('sync')} className={`px-4 py-2 rounded-lg font-medium ${settingSubTab === 'sync' ? 'bg-slate-900 text-white' : 'bg-white text-gray-600'}`}>เชื่อมต่อข้อมูลภายนอก (Sync)</button>
             </div>

             {settingSubTab === 'category' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-lg mb-4">จัดการหมวดหมู่</h3>
                  <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setCatTypeToEdit('income')} className={`flex-1 py-2 text-sm font-medium rounded-md ${catTypeToEdit === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}>รายรับ</button>
                    <button onClick={() => setCatTypeToEdit('expense')} className={`flex-1 py-2 text-sm font-medium rounded-md ${catTypeToEdit === 'expense' ? 'bg-white shadow-sm text-rose-600' : 'text-gray-500'}`}>รายจ่าย</button>
                  </div>
                  <div className="flex gap-2 mb-4">
                      <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="เพิ่มหมวดหมู่ใหม่..." className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none" />
                      <button onClick={() => { 
                        if(!newCatName.trim()) return; 
                        const newCats = {...categories, [catTypeToEdit]: [...categories[catTypeToEdit], newCatName]};
                        setCategories(newCats);
                        updateCategory(newCats);
                        setNewCatName(''); 
                      }} className="bg-slate-900 text-white px-4 rounded-lg">เพิ่ม</button>
                  </div>
                  <div className="space-y-2">
                      {categories[catTypeToEdit].map((c) => (
                        <div key={c} className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>{c}</span>
                        <button onClick={() => { 
                          if(confirm('ลบ?')) {
                             const newCats = {...categories, [catTypeToEdit]: categories[catTypeToEdit].filter((x) => x !== c)};
                             setCategories(newCats);
                             updateCategory(newCats);
                          }
                        }} className="text-gray-400 hover:text-red-500"><X size={16} /></button></div>
                      ))}
                  </div>
                </div>
             ) : (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Database size={20} /> แหล่งข้อมูลที่เชื่อมต่อ</h3>
                            <button onClick={() => { setSyncFormData({}); setIsSyncFormOpen(true); }} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={16} /> เพิ่มการเชื่อมต่อ</button>
                        </div>
                        {externalApps.length === 0 ? (
                            <div className="text-center py-8 text-indigo-200 bg-white/5 rounded-xl border border-white/10">
                                <p>ยังไม่มีการเชื่อมต่อกับ Firebase ภายนอก</p>
                                <p className="text-xs mt-1 opacity-70">เพิ่ม Config เพื่อดึงข้อมูลจากเว็บ Resort/Flour ของคุณ</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {externalApps.map(app => (
                                    <div key={app.id} className="flex justify-between items-center bg-white/10 p-4 rounded-xl border border-white/10">
                                        <div>
                                            <h4 className="font-bold">{app.name}</h4>
                                            <p className="text-xs text-indigo-200 mt-0.5">Collection: <span className="font-mono bg-black/20 px-1 rounded">{app.collectionName}</span></p>
                                        </div>
                                        <button onClick={() => setExternalApps(p => p.filter(x => x.id !== app.id))} className="text-indigo-200 hover:text-white"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                           {isSyncing ? <RefreshCw className="animate-spin" size={32} /> : <ArrowRightLeft size={32} />}
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2">Sync ข้อมูลตอนนี้</h3>
                        <p className="text-gray-500 text-sm mb-6 max-w-md">ระบบจะดึงข้อมูลใหม่จากแหล่งข้อมูลที่เชื่อมต่อไว้ เข้ามาบันทึกใน "รายรับ" โดยอัตโนมัติ (ข้ามรายการที่เคยดึงมาแล้ว)</p>
                        
                        {syncStatus && <p className="text-sm font-medium text-indigo-600 mb-4 bg-indigo-50 px-3 py-1 rounded-full">{syncStatus}</p>}
                        
                        <button 
                           onClick={performSync}
                           disabled={isSyncing || externalApps.length === 0}
                           className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSyncing ? 'กำลัง Sync...' : 'Start Sync'}
                        </button>
                    </div>
                </div>
             )}
           </div>
        )}

        {/* ... (Summary and Income/Expense Lists) ... */}
        {activeTab === 'summary' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-200 text-white">
                 <p className="text-emerald-100 font-medium mb-1">รายรับ ({selectedMonth})</p>
                 <h3 className="text-3xl font-bold">฿{totalIncome.toLocaleString()}</h3>
               </div>
               <div className="bg-rose-600 p-6 rounded-2xl shadow-lg shadow-rose-200 text-white">
                 <p className="text-rose-100 font-medium mb-1">รายจ่าย ({selectedMonth})</p>
                 <h3 className="text-3xl font-bold">฿{totalExpense.toLocaleString()}</h3>
               </div>
               <div className="bg-slate-800 p-6 rounded-2xl shadow-lg shadow-slate-300 text-white">
                 <p className="text-slate-300 font-medium mb-1">กำไรสุทธิ</p>
                 <h3 className="text-3xl font-bold">฿{(totalIncome - totalExpense).toLocaleString()}</h3>
               </div>
             </div>
             {/* Charts */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><TrendingUp size={20} /> เปรียบเทียบรายรับ-รายจ่าย</h3>
                <div className="h-64 flex items-end justify-center gap-12 px-8 pb-4 relative">
                  <div className="absolute inset-0 border-b border-l border-gray-100 z-0"></div>
                  <div className="relative z-10 w-24 flex flex-col items-center group">
                    <span className="mb-2 font-bold text-rose-600">฿{totalExpense.toLocaleString()}</span>
                    <div className="w-full bg-rose-500 rounded-t-lg transition-all relative" style={{ height: `${totalIncome + totalExpense > 0 ? (totalExpense / (totalIncome + totalExpense) * 200) : 0}px` }}></div>
                    <span className="mt-3 text-sm font-medium text-gray-500">รายจ่าย</span>
                  </div>
                  <div className="relative z-10 w-24 flex flex-col items-center group">
                    <span className="mb-2 font-bold text-emerald-600">฿{totalIncome.toLocaleString()}</span>
                    <div className="w-full bg-emerald-500 rounded-t-lg transition-all" style={{ height: `${totalIncome + totalExpense > 0 ? (totalIncome / (totalIncome + totalExpense) * 200) : 0}px` }}></div>
                     <span className="mt-3 text-sm font-medium text-gray-500">รายรับ</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><PieChart size={20} /> สัดส่วนค่าใช้จ่าย (Top 5)</h3>
                 <div className="space-y-4">
                   {expenseByCategory.slice(0, 5).map(([cat, amount], idx) => {
                     const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                     return (
                       <div key={cat}>
                         <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-gray-700">{idx+1}. {cat}</span>
                           <span className="text-gray-500">{percent.toFixed(1)}% (฿{amount.toLocaleString()})</span>
                         </div>
                         <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div></div>
                       </div>
                     );
                   })}
                   {expenseByCategory.length === 0 && <p className="text-center text-gray-400 py-10">ไม่มีข้อมูลรายจ่ายในเดือนนี้</p>}
                 </div>
              </div>
            </div>
            {/* Export */}
            <div className="flex flex-wrap gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 items-center justify-between">
              <div><span className="font-bold text-gray-700 block">ส่งออกข้อมูลเดือน {selectedMonth}</span></div>
              <div className="flex gap-2">
                 <button onClick={() => exportToCSV('income')} className="px-4 py-2 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 text-sm font-medium flex gap-2 items-center"><Download size={16} /> รายรับ</button>
                 <button onClick={() => exportToCSV('expense')} className="px-4 py-2 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 text-sm font-medium flex gap-2 items-center"><Download size={16} /> รายจ่าย</button>
                 <button onClick={() => exportToCSV('all')} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium flex gap-2 items-center"><Download size={16} /> ทั้งหมด</button>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'income' || activeTab === 'expense') && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${activeTab === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>{activeTab === 'income' ? 'รายการรายรับ' : 'รายการรายจ่าย'}</h2>
                <p className="text-gray-500 text-sm mt-1">ยอดรวมเดือน {selectedMonth}: ฿{(activeTab === 'income' ? totalIncome : totalExpense).toLocaleString()}</p>
              </div>
              <button onClick={() => initTransactionForm()} className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl shadow-lg transition-transform active:scale-95 ${activeTab === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}><Plus size={20} /> <span className="font-medium hidden sm:inline">เพิ่มรายการ</span></button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold cursor-pointer">
                                <th className="px-6 py-4 w-28" onClick={() => handleSort('billNo')}>เลขที่บิล</th>
                                <th className="px-6 py-4 w-28" onClick={() => handleSort('date')}>วันที่</th>
                                <th className="px-6 py-4" onClick={() => handleSort('description')}>รายการ</th>
                                <th className="px-6 py-4 text-right" onClick={() => handleSort('amount')}>จำนวนเงิน</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{t.billNo}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{t.date}</td>
                                    <td className="px-6 py-4">
                                        <span className="block text-sm font-medium text-slate-900">{t.description}</span>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.category}</span>
                                            {t.syncedFrom && <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1"><RefreshCw size={8}/> {t.syncedFrom}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-900">฿{t.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">{renderStatusBadge(t.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => initTransactionForm(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                                            <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-gray-400 hover:text-rose-600 rounded"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

      </main>

      {/* Sync Config Modal */}
      {isSyncFormOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsSyncFormOpen(false)} />
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="text-lg font-bold">เพิ่มการเชื่อมต่อ Firebase</h3>
                   <button onClick={() => setIsSyncFormOpen(false)}><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="label">ชื่อแอป (สำหรับแสดงผล)</label>
                        <input value={syncFormData.name || ''} onChange={e => setSyncFormData({...syncFormData, name: e.target.value})} placeholder="เช่น Resort App" className="input-field" />
                    </div>
                    <div>
                        <label className="label">Firebase Config JSON</label>
                        <textarea 
                           value={syncFormData.config || ''} 
                           onChange={e => setSyncFormData({...syncFormData, config: e.target.value})} 
                           placeholder={'{ "apiKey": "...", "authDomain": "...", "projectId": "..." }'} 
                           rows={5}
                           className="input-field font-mono text-xs" 
                        />
                        <p className="text-xs text-gray-400 mt-1">คัดลอกได้จาก Firebase Console {'>'} Project Settings {'>'} General {'>'} Your apps</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Collection Name</label>
                            <input value={syncFormData.collectionName || ''} onChange={e => setSyncFormData({...syncFormData, collectionName: e.target.value})} placeholder="orders" className="input-field" />
                        </div>
                        <div>
                            <label className="label">Amount Field</label>
                            <input value={syncFormData.amountField || ''} onChange={e => setSyncFormData({...syncFormData, amountField: e.target.value})} placeholder="totalPrice" className="input-field" />
                        </div>
                        <div>
                            <label className="label">Date Field</label>
                            <input value={syncFormData.dateField || ''} onChange={e => setSyncFormData({...syncFormData, dateField: e.target.value})} placeholder="createdAt" className="input-field" />
                        </div>
                        <div>
                            <label className="label">Description Field</label>
                            <input value={syncFormData.descField || ''} onChange={e => setSyncFormData({...syncFormData, descField: e.target.value})} placeholder="orderId" className="input-field" />
                        </div>
                    </div>
                    <button onClick={saveExternalApp} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg">บันทึกการเชื่อมต่อ</button>
                </div>
            </div>
         </div>
      )}

      {/* Transaction Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className={`p-6 pb-4 border-b ${formData.type === 'income' ? 'bg-emerald-50 border-emerald-100' : formData.type === 'expense' ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold">{editingId ? 'แก้ไขรายการ' : 'ทำรายการใหม่'}</h2>
                    <button onClick={() => setIsFormOpen(false)}><X size={24} className="text-gray-400" /></button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!showConfirmModal ? (
                    <form id="transForm" onSubmit={validateAndPreview} className="space-y-6">
                        <div>
                            <label className="label">วันที่</label>
                            <input type="date" name="date" required value={formData.date} onChange={handleInputChange} className="input-field" />
                        </div>
                        
                        {formData.type === 'expense' && (
                           <div className="bg-rose-50 p-4 rounded-xl space-y-3 border border-rose-100">
                              <div className="flex justify-between items-center"><h4 className="font-semibold text-rose-700 text-sm">คู่ค้า & ภาษี</h4><label className="flex items-center gap-2 text-xs text-rose-800"><input type="checkbox" checked={useVatCalc} onChange={e => setUseVatCalc(e.target.checked)}/> มี VAT 7%</label></div>
                              <div className="grid grid-cols-2 gap-3">
                                  <input name="payee" placeholder="ชื่อผู้รับเงิน" value={formData.payee||''} onChange={handleInputChange} className="input-field text-sm" />
                                  <input name="originalBillNo" placeholder="เลขบิลคู่ค้า" value={formData.originalBillNo||''} onChange={handleInputChange} className="input-field text-sm" />
                              </div>
                              {useVatCalc && <div className="grid grid-cols-2 gap-3 pt-2"><input type="number" name="preTaxAmount" placeholder="ก่อน VAT" value={formData.preTaxAmount||''} onChange={handleInputChange} className="input-field text-right"/><input type="number" name="vatAmount" placeholder="VAT" value={formData.vatAmount||''} onChange={handleInputChange} className="input-field text-right"/></div>}
                           </div>
                        )}

                        {formData.type !== 'transfer' && (
                             <div><label className="label">รายการ</label><input name="description" required value={formData.description||''} onChange={handleInputChange} className="input-field" /></div>
                        )}

                        {formData.type === 'transfer' && (
                             <div className="bg-indigo-50 p-4 rounded-xl space-y-4">
                                 <div><label className="label">จากบัญชี</label><select name="accountId" value={formData.accountId} onChange={handleInputChange} className="input-field">{accounts.filter(a=>a.type!=='credit').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                 <div className="flex justify-center -my-2"><ArrowRight className="text-indigo-400" size={16}/></div>
                                 <div><label className="label">เข้าบัญชี/จ่ายบัตร</label><select name="targetAccountId" value={formData.targetAccountId} onChange={handleInputChange} className="input-field"><option value="">-- เลือก --</option>{accounts.filter(a=>a.id!==formData.accountId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                             </div>
                        )}

                        <div>
                            <label className="label">จำนวนเงิน {formData.type==='expense' && useVatCalc && '(สุทธิ)'}</label>
                            <input type="number" name="amount" required step="0.01" value={formData.amount||''} onChange={handleInputChange} readOnly={useVatCalc} className="input-field text-xl font-bold pl-4" />
                        </div>

                        {formData.type !== 'transfer' && (
                             <div className="bg-gray-50 p-4 rounded-xl">
                                <div className="flex gap-2 mb-3">
                                    {['cash','transfer','credit'].map(m => {
                                        if(formData.type==='income' && m==='credit') return null;
                                        return <button type="button" key={m} onClick={() => handlePaymentMethodChange(m)} className={`flex-1 py-2 text-xs rounded-lg border ${formData.paymentMethod===m?'bg-slate-800 text-white':'bg-white'}`}>{m}</button>
                                    })}
                                </div>
                                <select name="accountId" value={formData.accountId} onChange={handleInputChange} className="input-field">
                                    {accounts.filter(a => {
                                        if(formData.paymentMethod==='cash') return a.type==='cash';
                                        if(formData.paymentMethod==='transfer') return a.type==='bank';
                                        return a.type==='credit';
                                    }).map(a=><option key={a.id} value={a.id}>{a.name} ({a.type==='credit'?'วงเงิน':'ยอด'}: {getAccountBalance(a.id).toLocaleString()})</option>)}
                                    <option value="" disabled>-- เลือก --</option>
                                </select>
                             </div>
                        )}
                        
                        {formData.type !== 'transfer' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div><label className="label">หมวดหมู่</label><select name="category" value={formData.category} onChange={handleInputChange} className="input-field">{categories[formData.type === 'income' ? 'income' : 'expense'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                              <div><label className="label">สถานะ</label><select name="status" value={formData.status} onChange={handleInputChange} className="input-field"><option value="completed">สำเร็จ</option><option value="pending">รอ</option></select></div>
                           </div>
                        )}
                        
                        <div><label className="label">หมายเหตุ</label><textarea name="note" value={formData.note||''} onChange={handleInputChange} className="input-field resize-none"></textarea></div>
                    </form>
                ) : (
                    <div className="text-center space-y-4 py-8"><AlertCircle size={48} className="mx-auto text-blue-500"/> <p>ยืนยันข้อมูล?</p> <p className="font-bold text-3xl text-slate-800">฿{formData.amount?.toLocaleString()}</p></div>
                )}
             </div>
             <div className="p-6 border-t border-gray-100 flex gap-3">
                 {!showConfirmModal ? (
                     <><button onClick={()=>setIsFormOpen(false)} className="flex-1 py-3 border rounded-xl">ยกเลิก</button><button type="submit" form="transForm" className="flex-1 py-3 bg-slate-900 text-white rounded-xl">ถัดไป</button></>
                 ) : (
                     <><button onClick={()=>setShowConfirmModal(false)} className="flex-1 py-3 border rounded-xl">แก้ไข</button><button onClick={saveTransaction} className="flex-1 py-3 bg-slate-900 text-white rounded-xl">ยืนยัน</button></>
                 )}
             </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {isAccountFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={()=>setIsAccountFormOpen(false)}/>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6 space-y-4">
                  <h3 className="font-bold text-lg">จัดการบัญชี</h3>
                  <div className="flex gap-2">{['cash','bank','credit'].map(t=><button key={t} onClick={()=>setAccountFormData(p=>({...p, type:t}))} className={`flex-1 py-2 border rounded-lg ${accountFormData.type===t?'bg-blue-600 text-white':'bg-white'}`}>{t}</button>)}</div>
                  {accountFormData.type!=='cash' && <select value={accountFormData.bankName||''} onChange={e=>setAccountFormData(p=>({...p, bankName:e.target.value, name:e.target.value}))} className="input-field"><option value="">เลือกธนาคาร</option>{Object.keys(BANK_COLORS).map(k=><option key={k} value={k}>{BANK_COLORS[k].name}</option>)}</select>}
                  <input placeholder="ชื่อบัญชี" value={accountFormData.name||''} onChange={e=>setAccountFormData(p=>({...p, name:e.target.value}))} className="input-field"/>
                  <input type="number" placeholder="ยอดเริ่มต้น/วงเงิน" value={accountFormData.initialBalance||''} onChange={e=>setAccountFormData(p=>({...p, initialBalance:parseFloat(e.target.value)}))} className="input-field"/>
                  <button onClick={saveAccount} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">บันทึก</button>
              </div>
          </div>
      )}

      {/* Global Styles */}
      <style>{`.input-field { width: 100%; padding: 0.625rem 1rem; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.75rem; outline: none; } .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}