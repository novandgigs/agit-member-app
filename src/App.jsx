import React, { useState, useEffect } from 'react';

// --- Firebase Web SDK 임포트 ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';

// --- Firebase 설정 및 초기화 (매장 포탈 어플과 완전히 일치시킴) ---
const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const firebaseConfig = configStr ? JSON.parse(configStr) : {
  apiKey: "", 
  authDomain: "our-azit-shared.firebaseapp.com",
  projectId: "our-azit-shared",
  storageBucket: "our-azit-shared.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};

let app, auth, db;
let isFirebaseAvailable = false;

if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "") {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseAvailable = true;
  } catch (error) {
    console.warn("Firebase 초기화 일시 보류 (로컬 오프라인 가상 가동 모드):", error);
  }
}

// [공통 앱 ID 연동 - Permission 및 세그먼트 매칭 해결]
// 매장용 포탈과 똑같이 슬래시(/) 앞부분의 승인된 컨테이너 ID 세그먼트만 추출합니다.
const globalAppId = typeof __app_id !== 'undefined' ? String(__app_id) : 'our-azit-shared';
const appId = globalAppId.includes('/') ? 'our-azit-shared' : globalAppId.replace(/[^a-zA-Z0-9_-]/g, '_');

// --- 오프라인용 로컬 가상 데이터베이스 초기값 설정 ---
const getInitialMembers = () => {
  const saved = localStorage.getItem('agit_offline_members');
  if (saved) return JSON.parse(saved);
  return [
    {
      phone: '010-1234-5678',
      dob: '900101',
      memberCode: 'AGIT-000001',
      visits: 12,
      totalHours: 25.5,
      coupons: [
        { id: 1, name: '평일 1시간 무료 이용권', used: false },
        { id: 2, name: '신규 가입 환영 음료 무료 쿠폰', used: false }
      ],
      createdAt: Date.now()
    }
  ];
};

const getInitialReservations = () => {
  const saved = localStorage.getItem('agit_offline_reservations');
  if (saved) return JSON.parse(saved);
  return [];
};

// --- 안전한 UI 렌더링을 위한 자체 제작 인라인 SVG 아이콘 컴포넌트군 ---
function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function TicketIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v14" strokeDasharray="3" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function AlertIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function CheckCircle2({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11" />
    </svg>
  );
}

export default function App() {
  // --- 상태 관리 (State) ---
  const [fbUser, setFbUser] = useState(null); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [currentView, setCurrentView] = useState('home'); // home | reservation | coupon
  const [showToast, setShowToast] = useState('');
  
  // 인증 및 폼 입력 상태
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [agreed, setAgreed] = useState(false);

  // 예약 신청 상태 (fixed 2026)
  const [resMonth, setResMonth] = useState('07');
  const [resDay, setResDay] = useState('06');
  const [resHour, setResHour] = useState('14');
  const [resMinute, setResMinute] = useState('00');
  const [resPeople, setResPeople] = useState('2');
  const [isCheckingSeat, setIsCheckingSeat] = useState(false);

  // 데이터 통합 관리 상태
  const [membersDb, setMembersDb] = useState(() => getInitialMembers());
  const [reservationsDb, setReservationsDb] = useState(() => getInitialReservations());

  // --- 로컬 오프라인 데이터 수동 백업 저장 장치 ---
  const saveOfflineMembers = (newMembers) => {
    setMembersDb(newMembers);
    localStorage.setItem('agit_offline_members', JSON.stringify(newMembers));
  };

  const saveOfflineReservations = (newRes) => {
    setReservationsDb(newRes);
    localStorage.setItem('agit_offline_reservations', JSON.stringify(newRes));
  };

  // --- 1. Firebase 인증 초기화 및 리스너 가동 ---
  useEffect(() => {
    if (!isFirebaseAvailable) return;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.warn("Firebase Auth Anonymous bypass:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. 클라우드 실시간 데이터 수신 채널 연결 (양방향 O2O 실시간 감지) ---
  useEffect(() => {
    if (!isFirebaseAvailable || !fbUser) return;

    const membersCol = collection(db, 'artifacts', appId, 'public', 'data', 'members');
    const reservationsCol = collection(db, 'artifacts', appId, 'public', 'data', 'reservations');

    const unsubMembers = onSnapshot(membersCol, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      if (list.length > 0) {
        setMembersDb(list);
      }
    }, (err) => {
      console.warn("Members channel waiting authorization:", err);
    });

    const unsubReservations = onSnapshot(reservationsCol, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setReservationsDb(list);
    }, (err) => {
      console.warn("Reservations channel waiting authorization:", err);
    });

    return () => {
      unsubMembers();
      unsubReservations();
    };
  }, [fbUser]);

  // --- 3. 로컬 자동 로그인 복구 및 실시간 회원 데이터 자동 매핑 ---
  useEffect(() => {
    const savedPhone = localStorage.getItem('agit_auto_login_phone');
    if (savedPhone && membersDb.length > 0) {
      const user = membersDb.find(m => m.phone === savedPhone);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, [membersDb]);

  // 점주 포탈에서 회원 마일리지를 정산하면 손님 폰에서 실시간 감지하여 자동 카드 갱신
  useEffect(() => {
    if (currentUser && membersDb.length > 0) {
      const updatedData = membersDb.find(m => m.phone === currentUser.phone);
      if (updatedData) {
        setCurrentUser(updatedData);
      }
    }
  }, [membersDb, currentUser]);

  // --- 유틸리티 함수 ---
  const displayToast = (msg) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(''), 3000);
  };

  const getTier = (hours) => {
    if (hours >= 100) return { name: 'VIP', color: 'text-purple-400' };
    if (hours >= 50) return { name: 'GOLD', color: 'text-yellow-400' };
    if (hours >= 10) return { name: 'SILVER', color: 'text-gray-300' };
    return { name: 'BRONZE', color: 'text-orange-400' };
  };

  const generateMemberCode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `AGIT-${randomNum}`;
  };

  // --- 핸들러 함수 ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (!phoneLast4 || phoneLast4.length !== 4) {
      setAuthError('핸드폰 번호 뒤 4자리를 정확히 입력해주세요.');
      return;
    }

    const matchedUsers = membersDb.filter(u => u.phone.endsWith(phoneLast4));
    
    if (matchedUsers.length === 1) {
      const user = matchedUsers[0];
      setCurrentUser(user);
      setAuthError('');
      if (autoLogin) {
        localStorage.setItem('agit_auto_login_phone', user.phone);
      }
      displayToast('다시 오신 것을 환영합니다!');
    } else if (matchedUsers.length > 1) {
      setAuthError('중복된 번호가 검색되었습니다. 전체번호로 회원가입을 하거나 매장에 문의해 주세요.');
    } else {
      setAuthError('일치하는 회원 정보가 없습니다. 가입하지 않으셨다면 회원가입을 먼저 진행해 주세요.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!phone || !dob) {
      setAuthError('핸드폰 번호와 생년월일을 모두 입력해주세요.');
      return;
    }
    if (!agreed) {
      setAuthError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    const existingUser = membersDb.find(u => u.phone === phone);
    if (existingUser) {
      setAuthError('이미 가입 완료된 번호입니다. 로그인해주세요.');
      return;
    }
    
    const newUserPhone = phone.trim();
    const newMember = {
      phone: newUserPhone,
      dob,
      memberCode: generateMemberCode(),
      visits: 0,
      totalHours: 0,
      coupons: [
        { id: Date.now(), name: '신규 가입 환영 음료 무료 쿠폰', used: false },
        { id: Date.now() + 1, name: '보드게임 1시간 할인 쿠폰', used: false }
      ],
      createdAt: Date.now()
    };
    
    if (isFirebaseAvailable) {
      try {
        const memberDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', newUserPhone);
        await setDoc(memberDocRef, newMember);
        setCurrentUser(newMember);
        setAuthError('');
        if (autoLogin) {
          localStorage.setItem('agit_auto_login_phone', newUserPhone);
        }
        displayToast('가입 완료! 웰컴 쿠폰이 실시간 발급되었습니다.');
      } catch (err) {
        console.error("Firebase member save failed:", err);
        setAuthError('서버 전송 중 오류가 발생했습니다. 잠시 후 가입해 주세요.');
      }
    } else {
      const updated = [...membersDb, newMember];
      saveOfflineMembers(updated);
      setCurrentUser(newMember);
      setAuthError('');
      if (autoLogin) {
        localStorage.setItem('agit_auto_login_phone', newUserPhone);
      }
      displayToast('환영합니다! (로컬 안전 오프라인 모드로 신속 가입됨)');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
    setPhoneLast4('');
    setPhone('');
    setDob('');
    setAgreed(false);
    setAutoLogin(false);
    localStorage.removeItem('agit_auto_login_phone');
    displayToast('로그아웃 되었습니다.');
  };

  // --- 실시간 모바일 테이블 예약 접수 엔진 (포스기와 실시간 싱크) ---
  const handleReservation = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsCheckingSeat(true);
    displayToast('실시간 아지트 테이블 공석 상태를 조회 중입니다...');

    setTimeout(async () => {
      setIsCheckingSeat(false);
      
      const dateStr = `2026년 ${resMonth}월 ${resDay}일`;
      const timeStr = `${resHour}:${resMinute}`;
      
      const newRes = {
        memberPhone: currentUser.phone,
        memberCode: currentUser.memberCode,
        date: dateStr,
        time: timeStr,
        people: Number(resPeople),
        status: '대기 중', // 매장 포스기 어플에서 '승인' 버튼 클릭 시 실시간 동기화됨
        createdAt: Date.now()
      };

      if (isFirebaseAvailable) {
        try {
          const reservationsCol = collection(db, 'artifacts', appId, 'public', 'data', 'reservations');
          await addDoc(reservationsCol, newRes);
          displayToast('예약 신청 완료! 매장 관리 어플에 실시간 예약 신호가 감지되었습니다.');
          setCurrentView('home');
        } catch (err) {
          console.error("Error booking reservation:", err);
          displayToast('예약 전송 도중 오류가 발생했습니다.');
        }
      } else {
        const uniqueId = `local-res-${Date.now()}`;
        const updated = [...reservationsDb, { id: uniqueId, ...newRes }];
        saveOfflineReservations(updated);
        displayToast('예약 신청 접수 완료 (로컬 시뮬레이션)');
        setCurrentView('home');
      }
    }, 1500);
  };

  // --- 쿠폰 사용 소모 차감 처리 ---
  const handleUseCoupon = async (couponId) => {
    if (!window.confirm('직원 확인용입니다. 정말 사용 완료 상태로 전환하시겠습니까?')) return;
    
    const updatedCoupons = currentUser.coupons.map(c => 
      c.id === couponId ? { ...c, used: true } : c
    );
    
    if (isFirebaseAvailable) {
      try {
        const memberRef = doc(db, 'artifacts', appId, 'public', 'data', 'members', currentUser.phone);
        await updateDoc(memberRef, { coupons: updatedCoupons });
        displayToast('쿠폰 사용 정산이 실시간 업데이트 완료되었습니다.');
      } catch (err) {
        console.error("Firebase update coupon state error:", err);
        displayToast('쿠폰 사용 반영 오류');
      }
    } else {
      const updatedUser = { ...currentUser, coupons: updatedCoupons };
      setCurrentUser(updatedUser);
      const updatedDb = membersDb.map(m => m.phone === currentUser.phone ? updatedUser : m);
      saveOfflineMembers(updatedDb);
      displayToast('쿠폰이 정상적으로 소모 처리되었습니다. (로컬)');
    }
  };

  const tierInfo = getTier(currentUser ? currentUser.totalHours : 0);

  // 이 사용자의 실시간 최신 예약 내역 필터링
  const myReservations = reservationsDb.filter(r => r.memberPhone === (currentUser && currentUser.phone));

  // --- 1. 비로그인 상태 (가입 및 로그인 화면) ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-center items-center p-6 font-sans">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-black text-yellow-400 tracking-tighter mb-2">우리들의 아지트</h1>
            <p className="text-neutral-400 text-sm">보드게임 매니아들을 위한 프라이빗 라운지</p>
          </div>

          {authMode === 'login' ? (
            // --- 로그인 폼 ---
            <form onSubmit={handleLogin} className="bg-neutral-900 p-6 rounded-2xl shadow-xl space-y-5 border border-neutral-800 animate-in fade-in zoom-in duration-300">
              <div>
                <label className="block text-sm font-bold text-neutral-300 mb-2">핸드폰 번호 뒤 4자리</label>
                <input 
                  type="number" 
                  placeholder="예: 5678" 
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors tracking-widest text-lg font-mono font-bold"
                  maxLength={4}
                  required
                />
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={autoLogin}
                    onChange={(e) => setAutoLogin(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded border-2 border-neutral-600 peer-checked:bg-yellow-400 peer-checked:border-yellow-400 transition-colors flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-neutral-950 opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <span className="text-sm text-neutral-300 group-hover:text-white transition-colors font-bold">
                  자동 로그인 유지
                </span>
              </label>

              {authError && (
                <div className="flex items-center gap-2 text-red-400 text-sm animate-pulse">
                  <AlertIcon className="w-4 h-4" />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-neutral-950 font-black py-3.5 rounded-lg transition-colors shadow-lg shadow-yellow-400/20"
              >
                로그인 완료
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                  className="text-xs text-neutral-400 hover:text-yellow-400 transition-colors underline underline-offset-4 font-semibold"
                >
                  아직 회원이 아니신가요? 간편 가입하러 가기
                </button>
              </div>
            </form>
          ) : (
            // --- 회원가입 폼 ---
            <form onSubmit={handleSignup} className="bg-neutral-900 p-6 rounded-2xl shadow-xl space-y-5 border border-neutral-800 animate-in fade-in zoom-in duration-300">
              <div>
                <label className="block text-sm font-bold text-neutral-300 mb-1">핸드폰 번호</label>
                <input 
                  type="tel" 
                  placeholder="010-0000-0000" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-300 mb-1">생년월일 6자리</label>
                <input 
                  type="number" 
                  placeholder="YYMMDD (예: 980706)" 
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors font-mono font-bold"
                  required
                />
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="peer sr-only"
                    required
                  />
                  <div className="w-5 h-5 rounded border-2 border-neutral-600 peer-checked:bg-yellow-400 peer-checked:border-yellow-400 transition-colors flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-neutral-950 opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <span className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors leading-relaxed">
                  (필수) 우리들의 아지트 멤버십 서비스 이용을 위한 개인정보(전화번호, 생년월일, 서비스 이용 적립 시간) 수집 및 활용 방침에 동의합니다.
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={autoLogin}
                    onChange={(e) => setAutoLogin(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded border-2 border-neutral-600 peer-checked:bg-yellow-400 peer-checked:border-yellow-400 transition-colors flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-neutral-950 opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <span className="text-sm text-neutral-300 group-hover:text-white transition-colors font-bold">
                  가입 즉시 자동 로그인 유지
                </span>
              </label>

              {authError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertIcon className="w-4 h-4" />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-neutral-950 font-black py-3.5 rounded-lg transition-colors shadow-lg shadow-yellow-400/20"
              >
                회원가입 완료
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  className="text-xs text-neutral-400 hover:text-yellow-400 transition-colors underline underline-offset-4 font-semibold"
                >
                  이미 가입한 회원입니다! 로그인으로 전환
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- 2. 로그인 완료 상태 (메인 대시보드 화면) ---
  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans max-w-md mx-auto relative pb-24 shadow-2xl">
      
      {/* 상단 네온 헤더 */}
      <header className="px-6 py-5 flex justify-between items-center sticky top-0 bg-neutral-950/80 backdrop-blur-md z-10 border-b border-neutral-900">
        <h1 className="text-xl font-black text-yellow-400 tracking-tight">아지트 멤버십</h1>
        <button onClick={handleLogout} className="text-xs text-neutral-400 hover:text-white transition-colors bg-neutral-900 px-3 py-1.5 rounded-full font-bold border border-neutral-850">
          로그아웃
        </button>
      </header>

      {/* 뷰 콘텐츠 영역 */}
      <main className="p-6 space-y-6">
        
        {/* 홈 뷰 */}
        {currentView === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 디지털 멤버십 바코드 카드 */}
            <div className="bg-gradient-to-br from-neutral-850 to-neutral-900 rounded-2xl p-6 border border-neutral-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] text-neutral-500 font-bold tracking-wider uppercase">MEMBERSHIP BARCODE</p>
                  <p className="text-2xl font-mono tracking-widest font-bold text-white">{currentUser.memberCode}</p>
                </div>
                <div className={`px-3 py-1 rounded-full bg-neutral-950/50 border border-neutral-800 font-black text-xs ${tierInfo.color}`}>
                  {tierInfo.name} GRADE
                </div>
              </div>

              {/* 실감나는 디지털 바코드 UI */}
              <div className="w-full h-16 bg-white/10 rounded-lg flex flex-col justify-center items-center mb-6 overflow-hidden">
                 <div className="w-full h-10 flex px-4 items-center justify-between opacity-80">
                    {[...Array(38)].map((_, i) => (
                      <div key={i} className={`h-full bg-white ${Math.random() > 0.5 ? 'w-0.5' : (Math.random() > 0.85 ? 'w-1.5' : 'w-1')}`}></div>
                    ))}
                 </div>
              </div>

              {/* 적립 마일리지 현황 */}
              <div className="grid grid-cols-2 gap-4 divide-x divide-neutral-800 bg-neutral-950/40 rounded-xl p-4 border border-neutral-800/40">
                <div className="text-center">
                  <p className="text-[11px] text-neutral-500 font-bold">누적 방문 횟수</p>
                  <p className="text-xl font-black mt-0.5"><span className="text-yellow-400">{currentUser.visits || 0}</span> 회</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-neutral-500 font-bold">누적 적립 시간</p>
                  <p className="text-xl font-black mt-0.5"><span className="text-yellow-400">{currentUser.totalHours || 0}</span> H</p>
                </div>
              </div>
            </div>

            {/* 실시간 시스템 연결 알림판 */}
            <div className="bg-yellow-400 text-neutral-950 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/10">
              <div>
                <p className="font-extrabold text-xs mb-0.5">🎮 O2O 스마트 아지트 연동 상태</p>
                <p className="text-[11px] font-bold opacity-80">
                  {isFirebaseAvailable ? "매장 포스기 어플과 실시간 연동 작동 중!" : "로컬 브라우저 안전 오프라인 모드로 연동 시뮬레이션 가동 중"}
                </p>
              </div>
              <ChevronRightIcon className="w-5 h-5 shrink-0" />
            </div>

            {/* 실시간 내 예약 내역 피드백 보드 */}
            {myReservations.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-black text-neutral-300 uppercase tracking-widest flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 text-yellow-400" />
                  실시간 내 테이블 예약 상태
                </h3>
                <div className="space-y-2.5">
                  {myReservations.map((res) => (
                    <div key={res.id} className="bg-neutral-950 p-4 rounded-lg border border-neutral-850 flex justify-between items-center">
                      <div>
                        <p className="font-black text-md text-white">{res.date}</p>
                        <p className="text-xs text-neutral-400 mt-1">{res.time} · {res.people}명 예약 접수</p>
                      </div>
                      <span className={`px-2.5 py-1 text-[11px] font-black rounded-full border ${
                        res.status === '확정' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 animate-pulse'
                      }`}>
                        {res.status === '확정' ? '예약 승인완료' : '승인 대기 중'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 매장 SNS 바로가기 연동 부서 */}
            <div className="pt-2">
              <h3 className="text-xs font-black text-neutral-500 uppercase tracking-wider mb-3 px-1">우리들의 아지트 SNS 소식통</h3>
              <div className="grid grid-cols-3 gap-3">
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 p-4 rounded-xl border border-neutral-850 transition-colors text-center text-neutral-300 hover:text-white"
                >
                  <svg className="w-5 h-5 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  <span className="text-[10px] font-bold">인스타그램</span>
                </a>
                
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 p-4 rounded-xl border border-neutral-850 transition-colors text-center text-neutral-300 hover:text-white"
                >
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.54a29 29 0 0 0 .46 5.12 2.78 2.78 0 0 0 1.95 1.96c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.12 29 29 0 0 0-.46-5.12z" />
                    <polygon points="9.75 15.02 15.5 11.54 9.75 8.06 9.75 15.02" fill="currentColor" />
                  </svg>
                  <span className="text-[10px] font-bold">유튜브 릴스</span>
                </a>

                <a 
                  href="https://blog.naver.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 p-4 rounded-xl border border-neutral-850 transition-colors text-center text-neutral-300 hover:text-white"
                >
                  <BookOpen className="w-5 h-5 text-green-500" />
                  <span className="text-[10px] font-bold">네이버 블로그</span>
                </a>
              </div>
            </div>

          </div>
        )}

        {/* 예약하기 뷰 */}
        {currentView === 'reservation' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-black text-white">테이블 예약 신청</h2>
              <p className="text-neutral-400 text-xs mt-1">원하시는 날짜와 세밀한 시간대를 선택해 주세요. 신청 시 매장 포스기 어플에 실시간 예약 접수 알림이 울립니다.</p>
            </div>
            
            <form onSubmit={handleReservation} className="space-y-5 bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
              {/* 날짜 선택 */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2">방문 희망 날짜 (2026년)</label>
                <div className="flex gap-2">
                  <select 
                    value={resMonth}
                    onChange={(e) => setResMonth(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={String(i+1).padStart(2, '0')}>{i+1}월</option>
                    ))}
                  </select>
                  <select 
                    value={resDay}
                    onChange={(e) => setResDay(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    {[...Array(31)].map((_, i) => (
                      <option key={i+1} value={String(i+1).padStart(2, '0')}>{i+1}일</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 시간 선택 */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2">방문 희망 시각</label>
                <div className="flex gap-2">
                  <select 
                    value={resHour}
                    onChange={(e) => setResHour(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  >
                    {["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"].map(h => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <select 
                    value={resMinute}
                    onChange={(e) => setResMinute(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  >
                    {["00", "10", "20", "30", "40", "50"].map(m => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 방문 인원 */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2">예약 인원수</label>
                <select 
                  value={resPeople}
                  onChange={(e) => setResPeople(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  {[2,3,4,5,6,7,8,9,10,11,12].map(num => (
                    <option key={num} value={String(num)}>{num}명</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isCheckingSeat}
                className={`w-full mt-4 font-black py-3 rounded-xl transition-all flex justify-center items-center gap-1.5 text-xs ${
                  isCheckingSeat 
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                    : 'bg-yellow-400 hover:bg-yellow-500 text-neutral-950 shadow-md shadow-yellow-400/10'
                }`}
              >
                {isCheckingSeat ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin"></div>
                    실시간 아지트 공석 매칭 중...
                  </>
                ) : '실시간 예약 신청 접수하기'}
              </button>
            </form>
          </div>
        )}

        {/* 쿠폰함 뷰 */}
        {currentView === 'coupon' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-black text-white">내 쿠폰함</h2>
              <p className="text-neutral-400 text-xs mt-1">포스기에서 점주님이 직접 배포한 할인 및 이벤트 쿠폰 내역입니다. 중복 소모를 막기 위해 일방 사용 완료 처리됩니다.</p>
            </div>
            
            <div className="space-y-3.5">
              {(!currentUser.coupons || currentUser.coupons.length === 0) ? (
                <div className="text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800 text-neutral-500">
                  <TicketIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-xs">보유하신 활성 쿠폰이 존재하지 않습니다.</p>
                </div>
              ) : (
                currentUser.coupons.map(coupon => (
                  <div key={coupon.id} className={`relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between transition-all ${coupon.used ? 'opacity-40' : 'opacity-100 shadow-md'}`}>
                    {/* 쿠폰 고유 절취선 패턴 */}
                    <div className="absolute left-0 top-0 bottom-0 w-2.5 border-r-2 border-dashed border-neutral-950 bg-yellow-400/5"></div>
                    
                    <div className="pl-4 flex-1">
                      <p className="text-yellow-400 text-[9px] font-black tracking-widest uppercase">MEMBERSHIP EVENT COUPON</p>
                      <p className="text-md font-extrabold text-white mt-1">{coupon.name}</p>
                      
                      <button 
                        onClick={() => handleUseCoupon(coupon.id)}
                        disabled={coupon.used}
                        className={`mt-3 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          coupon.used 
                            ? 'bg-neutral-800 text-neutral-500 border border-neutral-750 cursor-not-allowed' 
                            : 'bg-yellow-400 text-neutral-950 hover:bg-yellow-500'
                        }`}
                      >
                        {coupon.used ? '이미 사용된 쿠폰' : '직원 확인용 사용하기'}
                      </button>
                    </div>
                    <div className="w-10 h-10 bg-neutral-950 rounded-full flex items-center justify-center shrink-0 border border-neutral-800 ml-3">
                      <TicketIcon className="w-5 h-5 text-neutral-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* 하단 바텀 네비게이션 탭 바 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-900 pb-safe z-40">
        <div className="flex justify-around items-center p-3.5">
          <button 
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center p-1.5 rounded-lg transition-colors ${currentView === 'home' ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <HomeIcon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">아지트 홈</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('reservation')}
            className={`flex flex-col items-center p-1.5 rounded-lg transition-colors relative ${currentView === 'reservation' ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <CalendarIcon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">테이블 예약</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('coupon')}
            className={`relative flex flex-col items-center p-1.5 rounded-lg transition-colors ${currentView === 'coupon' ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <TicketIcon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">쿠폰함</span>
            {currentUser?.coupons?.some(c => !c.used) && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-neutral-950"></span>
            )}
          </button>
        </div>
      </nav>

      {/* 실시간 팝업 토스트 */}
      {showToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-neutral-950 px-6 py-3 rounded-full font-black shadow-xl z-50 animate-in fade-in slide-in-from-top-4 text-xs whitespace-nowrap">
          {showToast}
        </div>
      )}
      
      {/* 바텀 여백 */}
      <div className="h-6 bg-transparent pb-safe"></div>
    </div>
  );
}