import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  Plus, Edit2, Trash2, X, FileText, Download, 
  TrendingUp, Calendar as CalendarIcon, Settings, PieChart, 
  CreditCard, Wallet, Landmark, 
  AlertCircle, ArrowRightLeft, 
  ChevronDown, ChevronUp, Search, Moon, Sun,
  LayoutGrid, List, BarChart3, MoreHorizontal,
  Smartphone, Monitor, ChevronLeft, Briefcase, Coins,
  ArrowUpRight, ArrowDownLeft, Send, Save, Minus, Plus as PlusIcon, CheckCircle2,
  Banknote, Database, Users, LineChart, Hash, User as UserIcon,
  ShoppingBag, Home, Zap, Truck, Coffee, FolderPlus,
  ArrowUpCircle, ArrowDownCircle, Plane, Gift, Music, Book, Heart, 
  Cpu, Gamepad2, Shirt, Utensils, Car, Fuel, 
  Smartphone as PhoneIcon, Wifi, Droplet, Lightbulb,
  Clock, Factory
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, query, limit, 
  onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, orderBy, getDoc, where, getDocs
} from 'firebase/firestore';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCj5ZWEVjQJC9DM3X2oTacbbkSXYPXopNQ",
  authDomain: "chanpha-bill-db.firebaseapp.com",
  projectId: "chanpha-bill-db",
  storageBucket: "chanpha-bill-db.firebasestorage.app",
  messagingSenderId: "839581764938",
  appId: "1:839581764938:web:c9c0865febcc9ffdab05b3",
  measurementId: "G-NSVB9G7S6R"
};
// 🔴 FIX 1: Sanitize appId to ensure valid Firestore path
const appId = "1:839581764938:web:c9c0865febcc9ffdab05b3".replace(/\//g, '_');

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants & Icons ---
const ICONS_SET = {
  money: <Banknote size={18}/>, wallet: <Wallet size={18}/>, card: <CreditCard size={18}/>, bank: <Landmark size={18}/>, chart: <LineChart size={18}/>, coins: <Coins size={18}/>,
  shopping: <ShoppingBag size={18}/>, food: <Utensils size={18}/>, coffee: <Coffee size={18}/>, shirt: <Shirt size={18}/>, gift: <Gift size={18}/>, music: <Music size={18}/>, game: <Gamepad2 size={18}/>,
  home: <Home size={18}/>, util: <Zap size={18}/>, wifi: <Wifi size={18}/>, water: <Droplet size={18}/>, light: <Lightbulb size={18}/>, phone: <PhoneIcon size={18}/>,
  transport: <Truck size={18}/>, car: <Car size={18}/>, fuel: <Fuel size={18}/>, plane: <Plane size={18}/>,
  user: <UserIcon size={18}/>, heart: <Heart size={18}/>, book: <Book size={18}/>, cpu: <Cpu size={18}/>, hash: <Hash size={18}/>, factory: <Factory size={18}/>
};

const DEFAULT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b', '#71717a'];

const THAI_BANKS = [
  { code: 'KBANK', name: 'กสิกรไทย', color: '#138f2d' },
  { code: 'SCB', name: 'ไทยพาณิชย์', color: '#4e2e7f' },
  { code: 'BBL', name: 'กรุงเทพ', color: '#1e4598' },
  { code: 'KTB', name: 'กรุงไทย', color: '#1ba5e1' },
  { code: 'BAY', name: 'กรุงศรี', color: '#fec43b' },
  { code: 'TTB', name: 'ทีทีบี', color: '#0056ff' },
  { code: 'GSB', name: 'ออมสิน', color: '#eb198d' },
  { code: 'KKP', name: 'เกียรตินาคิน', color: '#694d86' },
  { code: 'CIMB', name: 'ซีไอเอ็มบี', color: '#7e202e' },
  { code: 'GHB', name: 'อาคารสงเคราะห์', color: '#ff7e00' },
  { code: 'CASH', name: 'เงินสด', color: '#64748b' },
  { code: 'OTHER', name: 'อื่นๆ', color: '#94a3b8' }
];

const INITIAL_CATEGORIES = {
  income: [{name:'เงินเดือน', icon:'money', color:'#10b981'}, {name:'ขายสินค้า', icon:'shopping', color:'#3b82f6'}],
  expense: [{name:'อาหาร', icon:'food', color:'#ef4444'}, {name:'เดินทาง', icon:'transport', color:'#f97316'}, {name:'ที่พัก', icon:'home', color:'#8b5cf6'}],
  investTypes: ['หุ้นไทย', 'หุ้นต่างประเทศ', 'กองทุนรวม', 'Crypto', 'ทองคำ', 'หุ้นกู้'], 
  debt: [{name:'บัตรเครดิต', icon:'card', color:'#f59e0b'}]
};

// --- Helper Components ---
const SimplePieChart = ({ data }) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  if (total === 0) return <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto flex items-center justify-center text-xs text-gray-500">ไม่มีข้อมูล</div>;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        {data.map((slice, i) => {
          let cumulativePercent = 0;
          for(let j=0; j<i; j++) cumulativePercent += (data[j].value / total);
          const percent = slice.value / total;
          const startPercent = cumulativePercent;
          const endPercent = cumulativePercent + percent;
          const x1 = 50 + 50 * Math.cos(2 * Math.PI * startPercent);
          const y1 = 50 + 50 * Math.sin(2 * Math.PI * startPercent);
          const x2 = 50 + 50 * Math.cos(2 * Math.PI * endPercent);
          const y2 = 50 + 50 * Math.sin(2 * Math.PI * endPercent);
          const largeArcFlag = percent > 0.5 ? 1 : 0;
          const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          return <path key={i} d={pathData} fill={slice.color} stroke="white" strokeWidth="1" />;
        })}
      </svg>
    </div>
  );
};

// --- Sub-Components ---

const TransactionFormModal = memo(({ 
  isOpen, onClose, formData, setFormData, 
  handleSave, categories, accounts, portfolios, 
  showCatFloat, setShowCatFloat, assetList, partners, partnerList 
}) => {
  if (!isOpen) return null;

  if (formData._mode === 'type_select') {
    return (
       <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-gray-900 w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xl font-bold text-gray-800 dark:text-white">เลือกประเภท</h3>
                 <button onClick={onClose}><X className="text-gray-400"/></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setFormData({type: 'income', paymentType: 'cash', _mode: 'form', date: new Date().toISOString().split('T')[0]})} className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-emerald-100">💰 รายรับ</button>
                 <button onClick={() => setFormData({type: 'expense', paymentType: 'cash', _mode: 'form', date: new Date().toISOString().split('T')[0]})} className="p-4 bg-rose-50 text-rose-700 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-rose-100">💸 รายจ่าย</button>
                 <button onClick={() => setFormData({type: 'debt_payment', paymentType: 'cash', _mode: 'form', date: new Date().toISOString().split('T')[0]})} className="p-4 bg-orange-50 text-orange-700 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-orange-100">💳 จ่ายหนี้</button>
                 <button onClick={() => setFormData({type: 'debt_collection', paymentType: 'cash', _mode: 'form', date: new Date().toISOString().split('T')[0]})} className="p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-blue-100">🤝 รับชำระหนี้</button>
                 <button onClick={() => setFormData({type: 'investment', subType: 'buy', paymentType: 'cash', _mode: 'form', date: new Date().toISOString().split('T')[0]})} className="col-span-2 p-4 bg-purple-50 text-purple-700 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-purple-100">📈 ลงทุน</button>
              </div>
           </div>
       </div>
    );
  }

  let catList = [];
  let filteredPartners = [];
  let partnerLabel = "ชื่อ (Partner)";

  if(formData.type === 'investment') {
      catList = categories.investTypes || [];
  } else if(['income','debt_collection'].includes(formData.type)) {
      catList = categories.income;
      filteredPartners = partners.filter(p => p.type === 'debtor');
      partnerLabel = "ชื่อ (ลูกหนี้)";
  } else {
      catList = categories.expense;
      filteredPartners = partners.filter(p => p.type === 'creditor');
      partnerLabel = "ชื่อ (เจ้าหนี้)";
  }

  // Use partnerList (Strings) for Autocomplete combined with filtered logic if needed
  // For simplicity and to avoid object error, we map filteredPartners to strings for options
  const partnerOptions = filteredPartners.map((p, i) => <option key={i} value={p.name}/>);

  const calculateInvestTotal = () => {
      const total = (Number(formData.pricePerUnit)||0) * (Number(formData.quantity)||0);
      const fee = Number(formData.fee)||0;
      return formData.subType === 'buy' ? total + fee : total - fee;
  };

  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in zoom-in-95">
         <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
             <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                   {formData.id ? 'แก้ไขรายการ' : 'บันทึกรายการ'}
                </h3>
                <button onClick={onClose}><X className="text-gray-500"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-5">
                 {['income', 'expense'].includes(formData.type) && (
                     <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
                         <button onClick={() => setFormData(prev => ({...prev, paymentType: 'cash'}))} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${formData.paymentType==='cash' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600' : 'text-gray-500'}`}>
                             <Banknote size={16}/> {formData.type==='income' ? 'ได้รับเงินเลย' : 'จ่ายทันที'}
                         </button>
                         <button onClick={() => setFormData(prev => ({...prev, paymentType: 'credit'}))} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${formData.paymentType==='credit' ? 'bg-white dark:bg-gray-700 shadow text-orange-600' : 'text-gray-500'}`}>
                             <Clock size={16}/> {formData.type==='income' ? 'ค้างรับ (เครดิต)' : 'ติดไว้ก่อน (เครดิต)'}
                         </button>
                     </div>
                 )}

                 {formData.type === 'investment' ? (
                    <>
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                          <button onClick={() => setFormData(prev => ({...prev, subType: 'buy'}))} className={`flex-1 py-2 rounded-lg font-bold transition-all ${formData.subType==='buy' ? 'bg-green-500 text-white shadow' : 'text-gray-500'}`}>ซื้อ (Buy)</button>
                          <button onClick={() => setFormData(prev => ({...prev, subType: 'sell'}))} className={`flex-1 py-2 rounded-lg font-bold transition-all ${formData.subType==='sell' ? 'bg-red-500 text-white shadow' : 'text-gray-500'}`}>ขาย (Sell)</button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs font-bold text-gray-400 uppercase">พอร์ต</label>
                              <select value={formData.portfolioId||''} onChange={e=>setFormData(prev => ({...prev, portfolioId: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white text-sm">
                                  <option value="">-- เลือก --</option>
                                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-400 uppercase">สินทรัพย์</label>
                              <input list="asset-list" type="text" value={formData.assetName||''} onChange={e => setFormData(prev => ({...prev, assetName: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white text-sm" placeholder="เช่น หุ้น AOT"/>
                              <datalist id="asset-list">{assetList.map((a, i) => <option key={i} value={a}/>)}</datalist>
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                           <div><label className="text-[10px] text-gray-400">ราคา/หน่วย</label><input type="number" className="w-full bg-white dark:bg-gray-700 rounded p-1 text-sm text-gray-800 dark:text-white" value={formData.pricePerUnit||''} onChange={e=>setFormData(prev => ({...prev, pricePerUnit: e.target.value}))}/></div>
                           <div><label className="text-[10px] text-gray-400">จำนวน</label><input type="number" className="w-full bg-white dark:bg-gray-700 rounded p-1 text-sm text-gray-800 dark:text-white" value={formData.quantity||''} onChange={e=>setFormData(prev => ({...prev, quantity: e.target.value}))}/></div>
                           <div><label className="text-[10px] text-gray-400">ค่าธรรมเนียม</label><input type="number" className="w-full bg-white dark:bg-gray-700 rounded p-1 text-sm text-gray-800 dark:text-white" value={formData.fee||''} onChange={e=>setFormData(prev => ({...prev, fee: e.target.value}))}/></div>
                           <div className="col-span-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300">
                               สุทธิ: ฿{calculateInvestTotal().toLocaleString()}
                           </div>
                      </div>
                    </>
                 ) : (
                    <>
                      <div className="relative">
                          <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">จำนวนเงิน</label>
                          <input type="number" value={formData.amount || ''} onChange={e => setFormData(prev => ({...prev, amount: e.target.value}))} 
                              className="w-full text-4xl font-bold bg-transparent border-b-2 border-gray-100 focus:border-indigo-500 outline-none py-2 text-gray-800 dark:text-white" placeholder="0.00"/>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-400 uppercase">{partnerLabel}</label>
                          <input list="partner-list" type="text" value={formData.partyName||''} onChange={e => setFormData(prev => ({...prev, partyName: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white" placeholder="ค้นหาหรือเพิ่มใหม่..."/>
                          <datalist id="partner-list">{partnerOptions}</datalist>
                      </div>

                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-bold text-gray-400 uppercase">หมวดหมู่</label>
                              <button onClick={() => setShowCatFloat(true)} className="text-xs text-indigo-500">เลือกเพิ่มเติม</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {catList.slice(0, 6).map((c, idx) => {
                                  const cName = typeof c === 'string' ? c : c.name;
                                  const cIcon = typeof c === 'object' ? c.icon : 'hash';
                                  return (
                                    <button key={idx} onClick={() => setFormData(prev => ({...prev, category: cName}))} 
                                        className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1 ${formData.category===cName ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500'}`}>
                                        {ICONS_SET[cIcon] || <Hash size={14}/>} {cName}
                                    </button>
                                  )
                              })}
                          </div>
                      </div>
                    </>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-gray-400 uppercase">วันที่</label>
                       <input type="date" value={formData.date} onChange={e => setFormData(prev => ({...prev, date: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
                    </div>
                    {formData.paymentType !== 'credit' && (
                        <div>
                           <label className="text-xs font-bold text-gray-400 uppercase">บัญชี</label>
                           <select value={formData.accountId} onChange={e => setFormData(prev => ({...prev, accountId: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none appearance-none text-gray-800 dark:text-white">
                              <option value="">เลือกบัญชี</option>
                              {accounts.filter(a => ['income','investment','debt_collection'].includes(formData.type) ? a.type !== 'credit' : true).map(a => (
                                  <option key={a.id} value={a.id}>{a.name} ({a.balance.toLocaleString()})</option>
                              ))}
                           </select>
                        </div>
                    )}
                 </div>
                 
                 {['expense', 'debt_payment'].includes(formData.type) && (
                    <div className="grid grid-cols-2 gap-4">
                       <input type="text" value={formData.refBillNo||''} onChange={e => setFormData(prev => ({...prev, refBillNo: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white" placeholder="เลขที่บิล (อ้างอิง)"/>
                       <label className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl cursor-pointer">
                           <input type="checkbox" checked={formData.isSentToAccountant||false} onChange={e => setFormData(prev => ({...prev, isSentToAccountant: e.target.checked}))} className="w-4 h-4"/>
                           <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">ส่งบัญชีแล้ว</span>
                       </label>
                    </div>
                 )}
                 
                 <input type="text" value={formData.description||''} onChange={e => setFormData(prev => ({...prev, description: e.target.value}))} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white" placeholder="รายละเอียดเพิ่มเติม..."/>
             </div>

             <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => handleSave(formData)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"><Save size={20}/> บันทึกรายการ</button>
             </div>
             
             {showCatFloat && (
                <div className="absolute inset-0 bg-white dark:bg-gray-900 z-20 flex flex-col animate-in slide-in-from-right rounded-3xl">
                    <div className="p-4 border-b flex items-center gap-2">
                        <button onClick={() => setShowCatFloat(false)}><ChevronLeft/></button>
                        <span className="font-bold text-gray-800 dark:text-white">หมวดหมู่ทั้งหมด</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
                        {catList.map((c, i) => {
                            const cName = typeof c === 'string' ? c : c.name;
                            return (
                              <button key={i} onClick={() => { setFormData(prev => ({...prev, category: cName})); setShowCatFloat(false); }} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-left font-bold text-gray-700 dark:text-gray-300 hover:bg-indigo-50">
                                  {cName}
                              </button>
                            )
                        })}
                    </div>
                </div>
             )}
         </div>
     </div>
  );
});

// Partner, Portfolio, Category, Account Modals remain mostly the same structure, ensuring controlled inputs and correct props.

const PartnerModal = memo(({ isOpen, onClose, formData, setFormData, handleSave }) => {
    if(!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">{formData.id ? 'แก้ไขรายชื่อ' : 'เพิ่มรายชื่อ'}</h3>
              <div className="flex gap-2">
                  <button onClick={()=>setFormData({...formData, type:'creditor'})} className={`flex-1 py-2 rounded-lg border font-bold ${formData.type==='creditor'?'bg-rose-500 text-white':'text-gray-500'}`}>เจ้าหนี้</button>
                  <button onClick={()=>setFormData({...formData, type:'debtor'})} className={`flex-1 py-2 rounded-lg border font-bold ${formData.type==='debtor'?'bg-emerald-500 text-white':'text-gray-500'}`}>ลูกหนี้</button>
              </div>
              <input placeholder="ชื่อ นามสกุล / บริษัท" value={formData.name||''} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
              <input type="number" placeholder="ยอดหนี้เริ่มต้น" value={formData.debtBalance||''} onChange={e=>setFormData({...formData, debtBalance:parseFloat(e.target.value)})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
              <div className="flex gap-2">
                  <button onClick={onClose} className="flex-1 py-3 text-gray-500">ยกเลิก</button>
                  <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">บันทึก</button>
              </div>
          </div>
      </div>
    );
});

const PortfolioModal = memo(({ isOpen, onClose, formData, setFormData, handleSave }) => {
    if(!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">เพิ่มพอร์ตการลงทุน</h3>
              <input placeholder="ชื่อพอร์ต (เช่น หุ้นไทย, Binance)" value={formData.name||''} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
              <input placeholder="แอปพลิเคชัน / โบรกเกอร์" value={formData.broker||''} onChange={e=>setFormData({...formData, broker:e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {Object.keys(ICONS_SET).map(k => (
                      <button key={k} onClick={()=>setFormData({...formData, icon:k})} className={`p-2 rounded-lg border ${formData.icon===k?'bg-indigo-100 border-indigo-500 text-indigo-600':'border-gray-200 text-gray-400'}`}>{ICONS_SET[k]}</button>
                  ))}
              </div>
              <div className="flex gap-2">
                  {DEFAULT_COLORS.slice(0,5).map(c => (
                      <button key={c} onClick={()=>setFormData({...formData, color:c})} className={`w-8 h-8 rounded-full ${formData.color===c?'ring-2 ring-offset-2 ring-gray-400':''}`} style={{backgroundColor:c}}/>
                  ))}
              </div>
              <div className="flex gap-2 mt-4">
                  <button onClick={onClose} className="flex-1 py-3 text-gray-500">ยกเลิก</button>
                  <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">บันทึก</button>
              </div>
          </div>
      </div>
    );
});

const CategoryModal = memo(({ isOpen, onClose, formData, setFormData, handleSave }) => {
    if(!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">เพิ่มหมวดหมู่ ({formData.type})</h3>
              <input placeholder="ชื่อหมวดหมู่" value={formData.name||''} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {Object.keys(ICONS_SET).map(k => (
                      <button key={k} onClick={()=>setFormData({...formData, icon:k})} className={`p-2 rounded-lg border ${formData.icon===k?'bg-indigo-100 border-indigo-500 text-indigo-600':'border-gray-200 text-gray-400'}`}>{ICONS_SET[k]}</button>
                  ))}
              </div>
              <div className="flex gap-2">
                  {DEFAULT_COLORS.map(c => (
                      <button key={c} onClick={()=>setFormData({...formData, color:c})} className={`w-6 h-6 rounded-full ${formData.color===c?'ring-2 ring-offset-2 ring-gray-400':''}`} style={{backgroundColor:c}}/>
                  ))}
              </div>
              <div className="flex gap-2 mt-4">
                  <button onClick={onClose} className="flex-1 py-3 text-gray-500">ยกเลิก</button>
                  <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">บันทึก</button>
              </div>
          </div>
      </div>
    );
});

const AccountModal = memo(({ isOpen, onClose, formData, setFormData, handleSave }) => {
    if(!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
         <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 space-y-4">
             <h3 className="font-bold text-lg text-gray-800 dark:text-white">จัดการบัญชี</h3>
             <div className="flex gap-2">
                {['cash','bank','credit'].map(t => <button key={t} onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${formData.type===t ? 'bg-slate-900 text-white' : 'text-gray-500'}`}>{t.toUpperCase()}</button>)}
             </div>
             
             {formData.type === 'bank' && (
                <div className="grid grid-cols-4 gap-2">
                    {THAI_BANKS.map(b => (
                        <button key={b.code} onClick={() => setFormData({...formData, bankCode: b.code, color: b.color, name: b.name})} className={`w-full aspect-square rounded-xl text-white text-xs font-bold ${formData.bankCode===b.code?'ring-2 ring-offset-2 ring-gray-400':''}`} style={{backgroundColor: b.color}}>{b.code}</button>
                    ))}
                </div>
             )}

             <input placeholder="ชื่อบัญชี" value={formData.name||''} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
             
             {formData.type !== 'bank' && (
                 <div className="flex gap-2 overflow-x-auto no-scrollbar">
                     {DEFAULT_COLORS.map(c => (
                         <button key={c} onClick={()=>setFormData({...formData, color:c})} className={`w-8 h-8 rounded-full ${formData.color===c?'ring-2 ring-gray-400':''}`} style={{backgroundColor:c}}/>
                     ))}
                 </div>
             )}

             {formData.type === 'credit' && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <input type="checkbox" checked={formData.isSupplementary||false} onChange={e=>setFormData({...formData, isSupplementary:e.target.checked})}/> บัตรเสริม
                    </label>
                    <input type="number" placeholder="วงเงินบัตร" value={formData.creditLimit||''} onChange={e=>setFormData({...formData, creditLimit:e.target.value})} className="w-full bg-white dark:bg-gray-700 p-2 rounded-lg text-sm"/>
                    <div className="flex gap-2">
                        <input type="number" placeholder="วันตัดรอบ (1-31)" value={formData.cutOffDay||''} onChange={e=>setFormData({...formData, cutOffDay:e.target.value})} className="flex-1 bg-white dark:bg-gray-700 p-2 rounded-lg text-sm"/>
                        <input type="number" placeholder="วันครบกำหนด (1-31)" value={formData.dueDay||''} onChange={e=>setFormData({...formData, dueDay:e.target.value})} className="flex-1 bg-white dark:bg-gray-700 p-2 rounded-lg text-sm"/>
                    </div>
                </div>
             )}

             <input type="number" placeholder="ยอดตั้งต้น (หรือยอดหนี้ปัจจุบัน)" value={formData.balance||''} onChange={e=>setFormData({...formData, balance:e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl outline-none text-gray-800 dark:text-white"/>
             
             <div className="flex gap-2">
                 <button onClick={onClose} className="w-full py-3 text-gray-500">ยกเลิก</button>
                 <button onClick={handleSave} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">บันทึก</button>
             </div>
         </div>
      </div>
    );
});

// --- Main App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState('light');
  const [viewMode, setViewMode] = useState('mobile');
  const [fontSizeLevel, setFontSizeLevel] = useState(1); 
  
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportMonth, setReportMonth] = useState(new Date()); 
  
  const [modalMode, setModalMode] = useState('none');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCatFloat, setShowCatFloat] = useState(false);
  const [showNetWorthDetail, setShowNetWorthDetail] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null); 
  const [selectedPortfolio, setSelectedPortfolio] = useState(null); 
  const [selectedAsset, setSelectedAsset] = useState(null);

  const [formData, setFormData] = useState({});
  const [accountFormData, setAccountFormData] = useState({});
  const [partnerFormData, setPartnerFormData] = useState({});
  const [portfolioFormData, setPortfolioFormData] = useState({});
  const [categoryFormData, setCategoryFormData] = useState({});
  const [transferFormData, setTransferFormData] = useState({ type: 'transfer', fromId: '', toId: '', amount: 0 });

  const [filterType, setFilterType] = useState('all'); 
  const [sortKey, setSortKey] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const partnerList = useMemo(() => [...new Set(transactions.map(t => t.partyName).filter(Boolean)), ...partners.map(p => p.name)], [transactions, partners]);
  const assetList = useMemo(() => [...new Set(transactions.filter(t => t.type === 'investment').map(t => t.assetName).filter(Boolean))], [transactions]);

  const fontSizeClass = ['text-xs', 'text-sm', 'text-base', 'text-lg'][fontSizeLevel];
  const headerSizeClass = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'][fontSizeLevel];

  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const userId = user.uid;
    const unsubTrans = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'transactions'), orderBy('date', 'desc'), limit(2000)), (s) => setTransactions(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubAcc = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'accounts'), (s) => setAccounts(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubPart = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'partners'), (s) => setPartners(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubPort = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'portfolios'), (s) => setPortfolios(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubCat = onSnapshot(doc(db, 'artifacts', appId, 'users', userId, 'settings', 'custom_categories'), (s) => { if (s.exists()) setCategories(s.data()); });
    return () => { unsubTrans(); unsubAcc(); unsubPart(); unsubPort(); unsubCat(); };
  }, [user]);

  const generateDocNo = (type, date) => {
    const t = type === 'expense' ? 'EXP' : type === 'income' ? 'INC' : type === 'investment' ? 'INV' : type === 'debt_payment' ? 'DBP' : type === 'debt_collection' ? 'DBC' : type === 'cc_payment' ? 'PAY' : 'TRF';
    const d = date.replace(/-/g, '').slice(2, 6);
    const count = transactions.filter(tr => tr.type === type && tr.date.startsWith(date.slice(0, 7))).length + 1;
    return `CH-${t}-${d}-${String(count).padStart(3,'0')}`;
  };

  const updateAccountBalance = async (accountId, amount) => {
      if(!accountId) return;
      const accRef = doc(db, 'artifacts', appId, 'users', user.uid, 'accounts', accountId);
      const accSnap = await getDoc(accRef);
      if (accSnap.exists()) {
          const currentBal = Number(accSnap.data().balance) || 0;
          await updateDoc(accRef, { balance: currentBal + amount });
      }
  };

  const updatePartnerDebt = async (partnerName, amount, type) => {
      if(!partnerName) return;
      const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'partners'), where("name", "==", partnerName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
          const pDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'partners', pDoc.id), { 
              debtBalance: (Number(pDoc.data().debtBalance) || 0) + amount 
          });
      } else {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'partners'), {
              name: partnerName,
              type: type || 'creditor',
              debtBalance: amount,
              createdAt: new Date()
          });
      }
  };

  const handleSaveTransaction = async (data) => {
    if (!user || (!data.amount && data.type !== 'investment')) return;
    
    let finalAmount = Number(data.amount);
    if (data.type === 'investment' && data.pricePerUnit && data.quantity) {
        const raw = Number(data.pricePerUnit) * Number(data.quantity);
        finalAmount = data.subType === 'buy' ? raw + (Number(data.fee)||0) : raw - (Number(data.fee)||0);
    }

    if (!finalAmount && finalAmount !== 0) return;

    const payload = { ...data, amount: finalAmount, date: data.date, status: 'completed', docNo: data.id ? data.docNo : generateDocNo(data.type, data.date), updatedAt: new Date() };
    if (!data.id) payload.createdAt = new Date();

    try {
      if (data.id) {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', data.id), payload);
      } else {
          await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), payload);
          const isCash = data.paymentType !== 'credit';
          
          if (payload.accountId && (isCash || ['debt_collection', 'debt_payment'].includes(payload.type))) {
             let adjustAmount = 0;
             if (['income', 'debt_collection'].includes(payload.type)) adjustAmount = payload.amount;
             else if (payload.type === 'investment') adjustAmount = payload.subType === 'buy' ? -payload.amount : payload.amount;
             else adjustAmount = -payload.amount;
             await updateAccountBalance(payload.accountId, adjustAmount);
          }
          
          if (payload.partyName) {
              let debtAdjust = 0;
              let partnerType = 'creditor';
              if (payload.type === 'income') { partnerType = 'debtor'; if (!isCash) debtAdjust = payload.amount; } 
              else if (payload.type === 'expense') { partnerType = 'creditor'; if (!isCash) debtAdjust = payload.amount; } 
              else if (payload.type === 'debt_collection') { partnerType = 'debtor'; debtAdjust = -payload.amount; } 
              else if (payload.type === 'debt_payment') { partnerType = 'creditor'; debtAdjust = -payload.amount; }
              
              if(debtAdjust !== 0) await updatePartnerDebt(payload.partyName, debtAdjust, partnerType);
          }
      }
      setModalMode('none'); setFormData({});
    } catch(e) { console.error(e); }
  };

  const handleSavePartner = async () => {
      const payload = { ...partnerFormData };
      if(payload.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'partners', payload.id), payload);
      else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'partners'), payload);
      setShowPartnerModal(false); setPartnerFormData({});
  };

  const handleSavePortfolio = async () => {
      const payload = { ...portfolioFormData };
      if(payload.id) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'portfolios', payload.id), payload);
      else await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'portfolios'), payload);
      setShowPortfolioModal(false); setPortfolioFormData({});
  };

  const handleSaveCategory = async () => {
      const { type, name, icon, color } = categoryFormData;
      const newCat = { name, icon, color };
      const updatedCats = { ...categories, [type]: [...(categories[type]||[]), newCat] };
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'custom_categories'), updatedCats);
      setCategories(updatedCats);
      setShowCategoryModal(false); setCategoryFormData({});
  };

  const handleDeleteCategory = async (type, name) => {
      const updatedList = categories[type].filter(c => (c.name || c) !== name);
      const updatedCats = { ...categories, [type]: updatedList };
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'custom_categories'), updatedCats);
      setCategories(updatedCats);
  };

  const handleSaveAccount = async () => {
      const payload = {...accountFormData, balance: Number(accountFormData.balance), color: accountFormData.color || '#64748b'};
      if(payload.id) await updateDoc(doc(db,'artifacts',appId,'users',user.uid,'accounts',payload.id), payload);
      else await addDoc(collection(db,'artifacts',appId,'users',user.uid,'accounts'), payload);
      setShowAccountModal(false); setAccountFormData({});
  };

  const handleQuickTransfer = async () => {
    if(!user || !transferFormData.amount) return;
    const amount = Number(transferFormData.amount);
    
    const payload = {
       type: transferFormData.type,
       amount: amount,
       accountId: transferFormData.fromId, 
       targetAccountId: transferFormData.toId,
       date: new Date().toISOString().split('T')[0],
       description: transferFormData.type === 'transfer' ? 'โอนเงินระหว่างบัญชี' : transferFormData.type === 'deposit' ? 'ฝากเงิน' : transferFormData.type === 'cc_payment' ? 'ชำระบัตรเครดิต' : 'ถอนเงิน',
       category: 'ปรับปรุงยอด',
       status: 'completed',
       docNo: generateDocNo('transfer', new Date().toISOString().split('T')[0]),
       createdAt: new Date()
    };
    
    try {
       await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), payload);
       
       if (transferFormData.type === 'transfer') {
           await updateAccountBalance(transferFormData.fromId, -amount);
           await updateAccountBalance(transferFormData.toId, amount);
       } else if (transferFormData.type === 'deposit') {
           await updateAccountBalance(transferFormData.fromId, amount);
       } else if (transferFormData.type === 'withdraw') {
           await updateAccountBalance(transferFormData.fromId, -amount);
       } else if (transferFormData.type === 'cc_payment') {
           await updateAccountBalance(transferFormData.fromId, -amount); 
           await updateAccountBalance(transferFormData.toId, -amount);
       }
       setShowTransferModal(false);
    } catch(e) { console.error(e); }
  };

  // --- Views ---

  const OverviewView = () => {
     const monthStr = selectedDate.toISOString().slice(0, 7);
     const dateStr = selectedDate.toISOString().split('T')[0];
     const dailyData = useMemo(() => {
        const stats = {};
        transactions.filter(t => t.date.startsWith(monthStr)).forEach(t => {
           const d = parseInt(t.date.split('-')[2]);
           if(!stats[d]) stats[d] = {inc:0, exp:0};
           if(['income', 'debt_collection'].includes(t.type)) stats[d].inc += t.amount;
           if(['expense', 'debt_payment'].includes(t.type)) stats[d].exp += t.amount;
        });
        return stats;
     }, [transactions, monthStr]);
     
     const daySummary = {
         inc: transactions.filter(t => t.date === dateStr && ['income','debt_collection'].includes(t.type)).reduce((a,b)=>a+b.amount,0),
         exp: transactions.filter(t => t.date === dateStr && ['expense','debt_payment'].includes(t.type)).reduce((a,b)=>a+b.amount,0),
         inv: transactions.filter(t => t.date === dateStr && t.type==='investment').reduce((a,b)=>a+b.amount,0),
     };

     const monthSummary = {
         inc: transactions.filter(t => t.date.startsWith(monthStr) && ['income','debt_collection'].includes(t.type)).reduce((a,b)=>a+b.amount,0),
         exp: transactions.filter(t => t.date.startsWith(monthStr) && ['expense','debt_payment'].includes(t.type)).reduce((a,b)=>a+b.amount,0),
         inv: transactions.filter(t => t.date.startsWith(monthStr) && t.type==='investment').reduce((a,b)=>a+b.amount,0),
     };

     const totalNetWorth = accounts.reduce((a,c) => c.type!=='credit' ? a+c.balance : a, 0) + transactions.filter(t => t.type === 'investment').reduce((acc, t) => acc + (t.subType === 'buy' ? t.amount : -t.amount), 0);

     return (
       <div className={`space-y-6 animate-in fade-in pb-24 ${fontSizeClass}`}>
          <div onClick={() => setShowNetWorthDetail(true)} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl cursor-pointer active:scale-95 transition-transform">
             <div className="flex justify-between items-start mb-4">
                <div><p className="text-slate-400 mb-1 flex items-center gap-2">ความมั่งคั่งสุทธิ <AlertCircle size={14}/></p><h1 className={`font-bold ${headerSizeClass}`}>฿{totalNetWorth.toLocaleString()}</h1></div>
                <Wallet className="text-slate-500"/>
             </div>
             <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm" onClick={e=>e.stopPropagation()}>
                 <div className="grid grid-cols-3 gap-2 text-center">
                      <div><span className="text-[10px] text-emerald-400 block">รายรับ</span><span className="font-bold text-sm text-emerald-300">+{daySummary.inc.toLocaleString()}</span></div>
                      <div className="border-l border-white/10"><span className="text-[10px] text-rose-400 block">รายจ่าย</span><span className="font-bold text-sm text-rose-300">-{daySummary.exp.toLocaleString()}</span></div>
                      <div className="border-l border-white/10"><span className="text-[10px] text-amber-400 block">ลงทุน</span><span className="font-bold text-sm text-amber-300">{daySummary.inv.toLocaleString()}</span></div>
                 </div>
             </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-white"><CalendarIcon size={18} className="text-indigo-500"/> ปฏิทินการเงิน</h3>
                 <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth()-1)))} className="p-1"><ChevronLeft size={16}/></button>
                    <span className="px-2 font-bold w-24 text-center">{selectedDate.toLocaleDateString('th-TH', {month:'short', year:'2-digit'})}</span>
                    <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth()+1)))} className="p-1"><ChevronLeft className="rotate-180" size={16}/></button>
                 </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 0).getDate()}, (_,i)=>i+1).map(d => {
                      const stat = dailyData[d];
                      const isSelected = d === selectedDate.getDate();
                      return (
                        <div key={d} onClick={() => setSelectedDate(new Date(selectedDate.setDate(d)))} className={`aspect-square rounded-xl border flex flex-col items-center justify-center pt-1 cursor-pointer transition-all relative ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-50 dark:border-gray-700 text-gray-800 dark:text-gray-200'}`}>
                           <span className="text-xs font-bold">{d}</span>
                           {stat && <div className="text-[8px] mt-1 flex flex-col leading-tight"><span className="text-emerald-500">{stat.inc>0?`+${(stat.inc/1000).toFixed(0)}k`:''}</span><span className="text-rose-500">{stat.exp>0?`-${(stat.exp/1000).toFixed(0)}k`:''}</span></div>}
                        </div>
                      )
                  })}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl">
                      <p className="text-[10px] text-emerald-600">รายรับเดือนนี้</p>
                      <p className="font-bold text-emerald-700">฿{monthSummary.inc.toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-xl">
                      <p className="text-[10px] text-rose-600">รายจ่ายเดือนนี้</p>
                      <p className="font-bold text-rose-700">฿{monthSummary.exp.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-xl">
                      <p className="text-[10px] text-amber-600">ลงทุนเดือนนี้</p>
                      <p className="font-bold text-amber-700">฿{monthSummary.inv.toLocaleString()}</p>
                  </div>
              </div>
          </div>

          {showNetWorthDetail && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                 <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
                     <div className="flex justify-between items-center pb-2 border-b dark:border-gray-700">
                         <h3 className="font-bold text-lg text-gray-800 dark:text-white">รายละเอียดทรัพย์สิน</h3>
                         <button onClick={() => setShowNetWorthDetail(false)}><X/></button>
                     </div>
                     <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                         <p className="text-xs font-bold text-gray-400 uppercase">เงินสดและบัญชี</p>
                         {accounts.filter(a => a.type !== 'credit').map(a => (
                             <div key={a.id} className="flex justify-between text-sm">
                                 <span>{a.name}</span>
                                 <span className="font-bold text-emerald-600">฿{a.balance.toLocaleString()}</span>
                             </div>
                         ))}
                         <div className="border-t border-dashed my-2"></div>
                         <p className="text-xs font-bold text-gray-400 uppercase">พอร์ตการลงทุน (มูลค่าต้นทุน)</p>
                         <div className="flex justify-between text-sm">
                             <span>รวมทุกสินทรัพย์</span>
                             <span className="font-bold text-amber-600">฿{transactions.filter(t => t.type === 'investment').reduce((acc, t) => acc + (t.subType === 'buy' ? t.amount : -t.amount), 0).toLocaleString()}</span>
                         </div>
                     </div>
                 </div>
             </div>
          )}
       </div>
     );
  };

  const TransactionsView = () => {
    const filtered = transactions.filter(t => {
       if (filterType === 'all') return true;
       if (filterType === 'income') return ['income'].includes(t.type);
       if (filterType === 'expense') return ['expense'].includes(t.type);
       if (filterType === 'debt') return ['debt_payment', 'debt_collection'].includes(t.type);
       if (filterType === 'invest') return t.type === 'investment';
       return true;
    }).sort((a,b) => sortKey === 'amount' ? (sortOrder==='asc' ? a.amount-b.amount : b.amount-a.amount) : (sortOrder==='asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

    const getIcon = (t) => {
        const catGroup = ['income','debt_collection'].includes(t.type) ? 'income' : t.type === 'investment' ? 'investment' : 'expense';
        let iconKey = 'hash';
        if (categories[catGroup]) {
            const foundCat = categories[catGroup].find(c => (c.name||c) === t.category);
            if (foundCat) iconKey = foundCat.icon || 'hash';
        }
        return ICONS_SET[iconKey] || (t.type==='investment'?<LineChart size={18}/>:<Banknote size={18}/>);
    };

    return (
      <div className={`pb-24 animate-in fade-in ${fontSizeClass}`}>
          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 no-scrollbar">
             {[['all','ทั้งหมด'], ['income','รายรับ'], ['expense','รายจ่าย'], ['debt','หนี้สิน/รับชำระ'], ['invest','ลงทุน']].map(([k,l]) => (
                <button key={k} onClick={() => setFilterType(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap ${filterType===k ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{l}</button>
             ))}
          </div>
          <div className="flex justify-between items-center mb-2 px-1">
             <span className="text-gray-500 font-bold">{filtered.length} รายการ</span>
             <div className="flex gap-2">
                 <button onClick={() => { setSortKey('date'); setSortOrder(o=>o==='asc'?'desc':'asc'); }} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${sortKey==='date'?'bg-indigo-50 text-indigo-600':'bg-white text-gray-500'}`}>
                    วันที่ {sortKey==='date' && (sortOrder==='asc'?<ChevronUp size={10}/>:<ChevronDown size={10}/>)}
                 </button>
                 <button onClick={() => { setSortKey('amount'); setSortOrder(o=>o==='asc'?'desc':'asc'); }} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${sortKey==='amount'?'bg-indigo-50 text-indigo-600':'bg-white text-gray-500'}`}>
                    ยอดเงิน {sortKey==='amount' && (sortOrder==='asc'?<ChevronUp size={10}/>:<ChevronDown size={10}/>)}
                 </button>
             </div>
          </div>
          
          <div className="space-y-3">
             {filtered.map(t => (
               <div key={t.id} onClick={() => { setFormData({...t, _mode:'form'}); setModalMode('form'); }} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex gap-3 items-center">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${['income','debt_collection'].includes(t.type) ? 'bg-emerald-100 text-emerald-600' : ['expense','debt_payment'].includes(t.type) ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{getIcon(t)}</div>
                     <div>
                        <p className="font-bold text-gray-800 dark:text-gray-200">{t.type === 'investment' ? t.assetName : t.description}</p>
                        <div className="flex gap-2 mt-0.5"><span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-gray-500 font-mono">{t.docNo}</span><span className="text-[10px] text-gray-400">{t.date}</span></div>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={`font-bold ${['income','debt_collection'].includes(t.type) ? 'text-emerald-600' : 'text-rose-600'}`}>{['income','debt_collection'].includes(t.type) ? '+' : '-'}฿{t.amount.toLocaleString()}</p>
                     {t.type === 'investment' && <span className={`text-[10px] px-1.5 rounded ${t.subType==='buy'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{t.subType==='buy'?'ซื้อ':'ขาย'}</span>}
                  </div>
               </div>
             ))}
          </div>
      </div>
    );
  };

  const ReportsView = () => {
    const monthStr = reportMonth.toISOString().slice(0, 7);
    const reportTrans = transactions.filter(t => t.date.startsWith(monthStr));
    const totalInc = reportTrans.filter(t => ['income','debt_collection'].includes(t.type)).reduce((a,b)=>a+b.amount,0);
    const totalExp = reportTrans.filter(t => ['expense','debt_payment'].includes(t.type)).reduce((a,b)=>a+b.amount,0);

    const incomeData = Object.entries(reportTrans.reduce((acc, t) => {
        if(['income','debt_collection'].includes(t.type)) acc[t.category] = (acc[t.category]||0) + t.amount;
        return acc;
     }, {})).map(([name,value], i) => ({name, value, color: `hsl(${140 + i*30}, 70%, 50%)`})).sort((a,b)=>b.value-a.value);

    const expenseData = Object.entries(reportTrans.reduce((acc, t) => {
       if(['expense','debt_payment'].includes(t.type)) acc[t.category] = (acc[t.category]||0) + t.amount;
       return acc;
    }, {})).map(([name,value], i) => ({name, value, color: `hsl(${0 + i*30}, 70%, 50%)`})).sort((a,b)=>b.value-a.value);

    return (
       <div className={`pb-24 animate-in fade-in space-y-6 ${fontSizeClass}`}>
          <div className="flex justify-center items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm">
             <button onClick={() => setReportMonth(new Date(reportMonth.setMonth(reportMonth.getMonth()-1)))} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"><ChevronLeft size={20}/></button>
             <span className={`font-bold ${headerSizeClass} text-gray-800 dark:text-white`}>{reportMonth.toLocaleDateString('th-TH', {month:'long', year:'numeric'})}</span>
             <button onClick={() => setReportMonth(new Date(reportMonth.setMonth(reportMonth.getMonth()+1)))} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"><ChevronLeft className="rotate-180" size={20}/></button>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
             <h3 className="font-bold mb-4 text-gray-800 dark:text-white">ภาพรวมรับ-จ่าย</h3>
             <div className="flex items-end gap-8 h-40 px-8">
                 <div className="flex-1 flex flex-col justify-end gap-2 group">
                    <span className="text-center text-xs font-bold text-emerald-600">฿{totalInc.toLocaleString()}</span>
                    <div className="w-full bg-emerald-400 rounded-t-xl transition-all duration-500" style={{height: `${totalInc > 0 ? (totalInc / Math.max(totalInc, totalExp))*100 : 2}%`}}></div>
                    <span className="text-center text-sm font-bold text-gray-500">รายรับ</span>
                 </div>
                 <div className="flex-1 flex flex-col justify-end gap-2 group">
                    <span className="text-center text-xs font-bold text-rose-600">฿{totalExp.toLocaleString()}</span>
                    <div className="w-full bg-rose-400 rounded-t-xl transition-all duration-500" style={{height: `${totalExp > 0 ? (totalExp / Math.max(totalInc, totalExp))*100 : 2}%`}}></div>
                    <span className="text-center text-sm font-bold text-gray-500">รายจ่าย</span>
                 </div>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold mb-4 text-gray-800 dark:text-white">สัดส่วนรายรับ</h3>
                <SimplePieChart data={incomeData}/>
                <div className="mt-4 space-y-2">
                    {incomeData.map((d,i) => (
                        <div key={i} className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:d.color}}></div>{d.name}</span>
                            <span>{Math.round(d.value/totalInc*100)}%</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold mb-4 text-gray-800 dark:text-white">สัดส่วนรายจ่าย</h3>
                <SimplePieChart data={expenseData}/>
                <div className="mt-4 space-y-2">
                    {expenseData.map((d,i) => (
                        <div key={i} className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:d.color}}></div>{d.name}</span>
                            <span>{Math.round(d.value/totalExp*100)}%</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
       </div>
    );
  };

  const DataView = () => {
      const [subTab, setSubTab] = useState('partners'); 
      const partnerHistory = useMemo(() => {
          if (!selectedPartner) return [];
          return transactions.filter(t => t.partyName === selectedPartner.name).sort((a,b) => b.date.localeCompare(a.date));
      }, [transactions, selectedPartner]);

      // Helper to get Thai Type Label
      const getTypeLabel = (type) => {
          switch(type) {
              case 'income': return 'รายรับ';
              case 'expense': return 'รายจ่าย';
              case 'debt_collection': return 'รับชำระหนี้';
              case 'debt_payment': return 'จ่ายหนี้';
              default: return 'ทั่วไป';
          }
      };

      // Drill Down: Partner Detail & History
      if (selectedPartner) {
          return (
              <div className={`pb-24 animate-in slide-in-from-right ${fontSizeClass}`}>
                  <button onClick={() => setSelectedPartner(null)} className="flex items-center gap-2 text-gray-500 mb-4"><ChevronLeft/> กลับ</button>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm mb-6 text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 ${selectedPartner.type==='creditor'?'bg-rose-500':'bg-emerald-500'}`}>{selectedPartner.type==='creditor'?'D':'C'}</div>
                      <h2 className="text-xl font-bold">{selectedPartner.name}</h2>
                      <p className="text-gray-500">{selectedPartner.type==='creditor'?'เจ้าหนี้':'ลูกหนี้'}</p>
                      <div className="mt-4 pt-4 border-t dark:border-gray-700">
                          <p className="text-sm text-gray-400">ยอดคงเหลือ</p>
                          <p className={`text-2xl font-bold ${selectedPartner.debtBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>฿{Math.abs(selectedPartner.debtBalance||0).toLocaleString()}</p>
                      </div>
                  </div>
                  <h3 className="font-bold mb-4">ประวัติธุรกรรม</h3>
                  <div className="space-y-3">
                      {partnerHistory.length === 0 && <p className="text-center text-gray-400">ยังไม่มีประวัติธุรกรรม</p>}
                      {partnerHistory.map(t => (
                          <div key={t.id} onClick={() => { setFormData({...t, _mode:'form'}); setModalMode('form'); }} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                              <div>
                                  <p className="font-bold text-gray-800 dark:text-gray-200">{t.description || 'ไม่มีรายละเอียด'}</p>
                                  <div className="flex gap-2 text-xs text-gray-400 mt-1">
                                      <span>{t.date}</span>
                                      <span>•</span>
                                      <span className="text-indigo-500">{getTypeLabel(t.type)}</span>
                                  </div>
                              </div>
                              <span className={`font-bold ${['income','debt_collection'].includes(t.type) ? 'text-emerald-600' : 'text-rose-600'}`}>{['income','debt_collection'].includes(t.type) ? '+' : '-'}฿{t.amount.toLocaleString()}</span>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      // Drill Down: Portfolio Detail & Asset History
      if (selectedPortfolio) {
          const portAssets = [...new Set(transactions.filter(t => t.type === 'investment' && t.portfolioId === selectedPortfolio.id).map(t => t.assetName))];
          
          if (selectedAsset) {
             const assetHistory = transactions.filter(t => t.type === 'investment' && t.portfolioId === selectedPortfolio.id && t.assetName === selectedAsset).sort((a,b) => b.date.localeCompare(a.date));
             return (
                 <div className={`pb-24 animate-in slide-in-from-right ${fontSizeClass}`}>
                    <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-gray-500 mb-4"><ChevronLeft/> กลับไปพอร์ต</button>
                    <h2 className="text-2xl font-bold mb-4">{selectedAsset}</h2>
                    <div className="space-y-3">
                        {assetHistory.map(t => (
                            <div key={t.id} onClick={() => { setFormData({...t, _mode:'form'}); setModalMode('form'); }} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex justify-between items-center cursor-pointer">
                                <div>
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${t.subType==='buy'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{t.subType==='buy'?'ซื้อ':'ขาย'}</span>
                                    <p className="text-xs text-gray-400 mt-1">{t.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">{t.quantity} หน่วย @ {t.pricePerUnit}</p>
                                    <p className="text-xs text-gray-500">รวม ฿{t.amount.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
             )
          }

          // Portfolio Overview Logic
          const processedAssets = portAssets.map(assetName => {
               const txs = transactions.filter(t => t.type === 'investment' && t.portfolioId === selectedPortfolio.id && t.assetName === assetName);
               let qty = 0;
               let cost = 0;
               txs.forEach(t => {
                   if(t.subType === 'buy') { qty += (t.quantity||0); cost += t.amount; }
                   else { qty -= (t.quantity||0); cost -= t.amount; } // Simple cost reduction
               });
               return { name: assetName, quantity: qty, totalCost: cost, avgCost: qty > 0 ? cost/qty : 0 };
          }).filter(a => a.quantity > 0);

          const totalPortValue = processedAssets.reduce((a,b) => a + b.totalCost, 0);

          return (
              <div className={`pb-24 animate-in slide-in-from-right ${fontSizeClass}`}>
                  <button onClick={() => setSelectedPortfolio(null)} className="flex items-center gap-2 text-gray-500 mb-4"><ChevronLeft/> กลับ</button>
                  <h2 className="text-2xl font-bold mb-2">{selectedPortfolio.name}</h2>
                  <p className="text-gray-400 mb-6">มูลค่ารวม (ต้นทุน): <span className="text-indigo-600 font-bold">฿{totalPortValue.toLocaleString()}</span></p>
                  
                  {/* Add Asset Button (New) */}
                  <button onClick={() => { setFormData({type:'investment', subType:'buy', portfolioId: selectedPortfolio.id, _mode:'form', date: new Date().toISOString().split('T')[0]}); setModalMode('form'); }} 
                      className="w-full py-3 mb-4 bg-indigo-50 text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 border border-indigo-100">
                      <Plus size={18}/> เพิ่มสินทรัพย์
                  </button>
                  
                  <div className="space-y-3">
                      {processedAssets.map((asset, i) => (
                          <div key={i} onClick={() => setSelectedAsset(asset.name)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm cursor-pointer hover:bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <h4 className="font-bold text-lg">{asset.name}</h4>
                                      <p className="text-xs text-gray-400">{asset.quantity.toLocaleString()} หน่วย</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-emerald-600">฿{asset.totalCost.toLocaleString()}</p>
                                      <p className="text-[10px] text-gray-400">Avg: {asset.avgCost.toFixed(2)}</p>
                                  </div>
                              </div>
                              {/* Allocation Bar */}
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-indigo-500 h-full rounded-full" style={{width: `${(asset.totalCost/totalPortValue)*100}%`}}></div>
                              </div>
                              <p className="text-[10px] text-right mt-1 text-gray-400">{((asset.totalCost/totalPortValue)*100).toFixed(1)}%</p>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }

      return (
          <div className={`pb-24 animate-in fade-in ${fontSizeClass}`}>
              <div className="flex gap-4 mb-6 border-b dark:border-gray-700">
                  <button onClick={() => setSubTab('partners')} className={`pb-2 font-bold ${subTab==='partners' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>เจ้าหนี้/ลูกหนี้</button>
                  <button onClick={() => setSubTab('portfolio')} className={`pb-2 font-bold ${subTab==='portfolio' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>พอร์ตการลงทุน</button>
              </div>
              {subTab === 'partners' && (
                  <div className="space-y-4">
                      <button onClick={() => setShowPartnerModal(true)} className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold">+ เพิ่มรายชื่อ</button>
                      {partners.map(p => (
                          <div key={p.id} onClick={() => setSelectedPartner(p)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${p.type==='creditor'?'bg-rose-500':'bg-emerald-500'}`}>{p.type==='creditor'?'D':'C'}</div>
                                  <div><p className="font-bold">{p.name}</p><span className="text-xs text-gray-400">{p.type==='creditor'?'เจ้าหนี้':'ลูกหนี้'}</span></div>
                              </div>
                              <div className="text-right">
                                  <p className="text-xs text-gray-400">ยอดคงเหลือ</p>
                                  <p className={`font-bold ${p.debtBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>฿{Math.abs(p.debtBalance||0).toLocaleString()}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
              {subTab === 'portfolio' && (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center"><h3 className="font-bold">รายการพอร์ต</h3><button onClick={() => setShowPortfolioModal(true)} className="text-indigo-600 font-bold">+ เพิ่มพอร์ต</button></div>
                      {portfolios.map(port => (
                          <div key={port.id} onClick={() => setSelectedPortfolio(port)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 cursor-pointer hover:bg-gray-50" style={{borderLeftColor: port.color}}>
                              <div className="flex justify-between">
                                  <div className="flex items-center gap-2">{ICONS_SET[port.icon]} <span className="font-bold">{port.name}</span></div>
                                  <button onClick={(e)=>{ e.stopPropagation(); setPortfolioFormData(port); setShowPortfolioModal(true)}} className="text-gray-400"><Edit2 size={14}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  const SettingsView = () => {
     const exportCSV = (type) => {
        const headers = ['วันที่', 'เอกสาร', 'ประเภท', 'รายการ', 'หมวดหมู่', 'จำนวนเงิน', 'หมายเหตุ'];
        const rows = transactions.filter(t => {
           if(type === 'income') return ['income','debt_collection'].includes(t.type);
           if(type === 'expense') return ['expense','debt_payment'].includes(t.type);
           if(type === 'accountant') return t.isSentToAccountant;
           return false;
        }).map(t => [t.date, t.docNo, t.type, t.description, t.category, t.amount, t.note || '']);
        
        const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `export_${type}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
     };

     return (
        <div className={`pb-24 animate-in fade-in ${fontSizeClass}`}>
           <h2 className={`font-bold mb-6 ${headerSizeClass} text-gray-800 dark:text-white`}>ตั้งค่า (Chanpha Bill v2.7 Fix)</h2>
           <div className="space-y-4">
              {/* Accounts Management */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-white"><Wallet size={20}/> จัดการบัญชี</h3>
                    <button onClick={() => { setAccountFormData({type:'bank', color: THAI_BANKS[0].color}); setShowAccountModal(true); }} className="p-1.5 bg-slate-900 text-white rounded-lg"><PlusIcon size={16}/></button>
                 </div>
                 <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button onClick={() => { setTransferFormData({type: 'deposit', fromId: '', toId: '', amount: 0}); setShowTransferModal(true); }} className="flex-shrink-0 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowDownLeft size={14}/> ฝาก</button>
                    <button onClick={() => { setTransferFormData({type: 'withdraw', fromId: '', toId: '', amount: 0}); setShowTransferModal(true); }} className="flex-shrink-0 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowUpRight size={14}/> ถอน</button>
                    <button onClick={() => { setTransferFormData({type: 'transfer', fromId: '', toId: '', amount: 0}); setShowTransferModal(true); }} className="flex-shrink-0 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1"><ArrowRightLeft size={14}/> โอน</button>
                 </div>
                 <div className="space-y-2">
                    {accounts.map(acc => (
                       <div key={acc.id} onClick={() => { setAccountFormData(acc); setShowAccountModal(true); }} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm" style={{backgroundColor: acc.color}}>
                                 {acc.type==='cash'?'💰':acc.type==='bank'?'🏦':'💳'}
                             </div>
                             <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-white">{acc.name}</p>
                                <p className="text-xs text-gray-500">{acc.type === 'credit' ? `ตัดรอบ ${acc.cutOffDay}` : 'ยอดคงเหลือ'}</p>
                             </div>
                          </div>
                          <p className={`font-bold text-sm text-gray-800 dark:text-white`}>฿{acc.balance.toLocaleString()}</p>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Categories & Portfolios */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white"><LayoutGrid size={20}/> จัดการหมวดหมู่ & พอร์ต</h3>
                  <div className="space-y-6">
                      <div>
                          <h4 className="text-sm font-bold text-emerald-600 mb-2">หมวดหมู่รายรับ</h4>
                          <div className="flex flex-wrap gap-2">
                              {categories.income.map(c => (
                                  <span key={c.name} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center gap-1">
                                      {ICONS_SET[c.icon]} {c.name}
                                      <button onClick={() => handleDeleteCategory('income', c.name)} className="text-red-400 hover:text-red-600 ml-1"><X size={12}/></button>
                                  </span>
                              ))}
                              <button onClick={() => { setCategoryFormData({type:'income', color:'#10b981', icon:'money'}); setShowCategoryModal(true); }} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">+ เพิ่ม</button>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-sm font-bold text-rose-600 mb-2">หมวดหมู่รายจ่าย</h4>
                          <div className="flex flex-wrap gap-2">
                              {categories.expense.map(c => (
                                  <span key={c.name} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center gap-1">
                                      {ICONS_SET[c.icon]} {c.name}
                                      <button onClick={() => handleDeleteCategory('expense', c.name)} className="text-red-400 hover:text-red-600 ml-1"><X size={12}/></button>
                                  </span>
                              ))}
                              <button onClick={() => { setCategoryFormData({type:'expense', color:'#ef4444', icon:'food'}); setShowCategoryModal(true); }} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold">+ เพิ่ม</button>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-sm font-bold text-purple-600 mb-2">ประเภทพอร์ตลงทุน</h4>
                          <div className="flex flex-wrap gap-2">
                              {(categories.investTypes || []).map(t => (
                                  <span key={t} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center gap-1">
                                      {t}
                                      <button onClick={() => {
                                          const newTypes = categories.investTypes.filter(x => x !== t);
                                          setCategories({...categories, investTypes: newTypes});
                                          setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'custom_categories'), {...categories, investTypes: newTypes});
                                      }} className="text-red-400 hover:text-red-600 ml-1"><X size={12}/></button>
                                  </span>
                              ))}
                              <button onClick={() => { setCategoryFormData({type:'investTypes', color:'#8b5cf6', icon:'chart'}); setShowCategoryModal(true); }} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold">+ เพิ่ม</button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Font Size */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex justify-between items-center">
                 <span className="font-bold flex items-center gap-2 text-gray-800 dark:text-white"><FileText size={20}/> ขนาดตัวอักษร</span>
                 <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                    <button onClick={() => setFontSizeLevel(Math.max(0, fontSizeLevel-1))} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg"><Minus size={16}/></button>
                    <div className="w-16 text-center text-xs font-bold text-gray-800 dark:text-white">{['เล็ก','ปกติ','ใหญ่','XL'][fontSizeLevel]}</div>
                    <button onClick={() => setFontSizeLevel(Math.min(3, fontSizeLevel+1))} className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg"><PlusIcon size={16}/></button>
                 </div>
              </div>

              {/* Export */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                 <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white"><Download size={20}/> ส่งออกข้อมูล (CSV)</h3>
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => exportCSV('income')} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-center hover:bg-emerald-50 text-xs font-bold text-gray-600 dark:text-gray-300">
                       <span className="block mb-1 text-emerald-500">📥</span> รายรับ
                    </button>
                    <button onClick={() => exportCSV('expense')} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-center hover:bg-rose-50 text-xs font-bold text-gray-600 dark:text-gray-300">
                       <span className="block mb-1 text-rose-500">📤</span> รายจ่าย
                    </button>
                    <button onClick={() => exportCSV('accountant')} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-center hover:bg-indigo-50 text-xs font-bold text-gray-600 dark:text-gray-300">
                       <span className="block mb-1 text-indigo-500">📑</span> ส่งบัญชี
                    </button>
                 </div>
              </div>
           </div>
        </div>
     );
  };

  {/* Only returning App structure, Modals are rendered outside */}
  return (
    <div className={`min-h-screen font-sans antialiased ${theme} bg-gray-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100`}>
       <div className={`flex flex-col md:flex-row min-h-screen transition-all`}>
          <aside className={`hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-6 fixed h-full z-30 ${viewMode==='mobile'?'md:hidden':''}`}>
              <div className="flex items-center gap-3 mb-10"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">C</div><h1 className="font-bold text-xl text-gray-800 dark:text-white">Chanpha v2.7 Fix</h1></div>
              <nav className="space-y-2 flex-1">{[{id: 'overview', icon: LayoutGrid, label: 'ภาพรวม'}, {id: 'transactions', icon: List, label: 'รายการ'}, {id: 'data', icon: Database, label: 'ข้อมูล'}, {id: 'reports', icon: BarChart3, label: 'สรุปผล'}, {id: 'settings', icon: Settings, label: 'ตั้งค่า'}].map(i => <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab===i.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}><i.icon size={20}/> {i.label}</button>)}</nav>
              <button onClick={() => setFormData({_mode: 'type_select'})} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><PlusIcon size={20}/> ทำรายการ</button>
          </aside>

          <main className={`flex-1 transition-all duration-300 ${viewMode === 'mobile' ? 'max-w-md mx-auto bg-white dark:bg-gray-900 shadow-2xl min-h-screen relative pb-24' : 'md:ml-64 p-8'}`}>
             <div className={`sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 ${viewMode==='desktop'?'hidden md:flex bg-transparent border-none':''}`}>
                 <div className="flex items-center gap-2 md:hidden"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">C</div><h1 className="font-bold text-lg text-gray-800 dark:text-white">Chanpha v2.7 Fix</h1></div>
                 <div className="flex gap-2"><button onClick={() => setViewMode(v => v === 'mobile' ? 'desktop' : 'mobile')} className="p-2 text-gray-400 hover:text-indigo-600 hidden md:block"><Monitor size={20}/></button><button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 text-gray-400 hover:text-indigo-600"><Moon size={20}/></button></div>
             </div>

             <div className={`${viewMode==='mobile'?'p-4':'mt-4'}`}>
                 {activeTab === 'overview' && <OverviewView />}
                 {activeTab === 'transactions' && <TransactionsView />}
                 {activeTab === 'data' && <DataView />}
                 {activeTab === 'reports' && <ReportsView />}
                 {activeTab === 'settings' && <SettingsView />}
             </div>

             <div className={`fixed bottom-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-safe pt-2 px-6 flex justify-between items-end transition-all duration-300 md:hidden ${viewMode==='mobile'?'w-full max-w-md left-1/2 -translate-x-1/2':'w-full left-0'}`}>
                 <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'overview' ? 'text-indigo-600' : 'text-gray-400'}`}><LayoutGrid size={24}/><span className="text-[10px]">ภาพรวม</span></button>
                 <button onClick={() => setActiveTab('transactions')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'transactions' ? 'text-indigo-600' : 'text-gray-400'}`}><List size={24}/><span className="text-[10px]">รายการ</span></button>
                 <div className="relative -top-6"><button onClick={() => setFormData({_mode: 'type_select'})} className="w-14 h-14 bg-slate-900 rounded-full text-white shadow-xl flex items-center justify-center transform active:scale-95"><PlusIcon size={28}/></button></div>
                 <button onClick={() => setActiveTab('data')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'data' ? 'text-indigo-600' : 'text-gray-400'}`}><Database size={24}/><span className="text-[10px]">ข้อมูล</span></button>
                 <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'settings' ? 'text-indigo-600' : 'text-gray-400'}`}><Settings size={24}/><span className="text-[10px]">ตั้งค่า</span></button>
             </div>
          </main>
       </div>

       <TransactionFormModal 
          isOpen={!!formData._mode} 
          onClose={() => setFormData({})}
          formData={formData} 
          setFormData={setFormData}
          handleSave={handleSaveTransaction}
          categories={categories}
          accounts={accounts}
          portfolios={portfolios}
          showCatFloat={showCatFloat}
          setShowCatFloat={setShowCatFloat}
          assetList={useMemo(() => [...new Set(transactions.filter(t => t.type === 'investment').map(t => t.assetName).filter(Boolean))], [transactions])}
          partners={partners}
          partnerList={useMemo(() => [...new Set(transactions.map(t => t.partyName).filter(Boolean)), ...partners.map(p => p.name)], [transactions, partners])}
       />
       
       <PartnerModal isOpen={showPartnerModal} onClose={() => setShowPartnerModal(false)} formData={partnerFormData} setFormData={setPartnerFormData} handleSave={handleSavePartner} />
       <PortfolioModal isOpen={showPortfolioModal} onClose={() => setShowPortfolioModal(false)} formData={portfolioFormData} setFormData={setPortfolioFormData} handleSave={handleSavePortfolio} />
       <CategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} formData={categoryFormData} setFormData={setCategoryFormData} handleSave={handleSaveCategory} />
       <AccountModal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} formData={accountFormData} setFormData={setAccountFormData} handleSave={handleSaveAccount} />
       
       {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
                 <h3 className="font-bold text-lg text-gray-800 dark:text-white">{transferFormData.type==='transfer'?'โอนเงิน':transferFormData.type==='deposit'?'ฝากเงิน':'ถอนเงิน'}</h3>
                 
                 {transferFormData.type === 'transfer' && (
                    <div className="flex items-center gap-2">
                       <select value={transferFormData.fromId} onChange={e=>setTransferFormData({...transferFormData, fromId:e.target.value})} className="flex-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-gray-800 dark:text-white">
                          <option value="">ต้นทาง</option>
                          {accounts.filter(a=>a.type!=='credit').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                       <ArrowRightLeft size={16} className="text-gray-400"/>
                       <select value={transferFormData.toId} onChange={e=>setTransferFormData({...transferFormData, toId:e.target.value})} className="flex-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg text-gray-800 dark:text-white">
                          <option value="">ปลายทาง</option>
                          {accounts.filter(a=>a.type!=='credit').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                    </div>
                 )}
                 {['deposit','withdraw'].includes(transferFormData.type) && (
                    <select value={transferFormData.fromId} onChange={e=>setTransferFormData({...transferFormData, fromId:e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-gray-800 dark:text-white">
                          <option value="">เลือกบัญชี</option>
                          {accounts.filter(a=>a.type!=='credit').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                 )}

                 <input type="number" placeholder="จำนวนเงิน" value={transferFormData.amount||''} onChange={e=>setTransferFormData({...transferFormData, amount:parseFloat(e.target.value)})} className="w-full text-3xl font-bold bg-transparent border-b p-2 outline-none text-gray-800 dark:text-white"/>
                 
                 <div className="flex gap-2">
                    <button onClick={() => setShowTransferModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-300">ยกเลิก</button>
                    <button onClick={handleQuickTransfer} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">ยืนยัน</button>
                 </div>
             </div>
          </div>
       )}
    </div>
  );
}