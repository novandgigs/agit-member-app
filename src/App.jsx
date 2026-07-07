import React, { useState, useEffect } from 'react';
import { 
  Home, CalendarPlus, Ticket,
  BookOpen, Clock, 
  CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';

export default function App() {
  // --- 상태 관리 (State) ---
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // home, reservation, coupon
  const [showToast, setShowToast] = useState('');
  
  // 인증 모드 상태 (login 또는 signup)
  const [authMode, setAuthMode] = useState('login');
  
  // 로그인 폼 상태
  const [phoneLast4, setPhoneLast4] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);

  // 가입 폼 상태
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [authError, setAuthError] = useState('');

  // 예약 폼 상태 (2026년 고정, 시간/분 드롭다운 방식)
  const [resMonth, setResMonth] = useState('07');
  const [resDay, setResDay] = useState('06');
  const [resHour, setResHour] = useState('14');
  const [resMinute, setResMinute] = useState('00');
  const [resPeople, setResPeople] = useState('2');
  const [isCheckingSeat, setIsCheckingSeat] = useState(false); // 빈자리 확인 로딩 상태

  // 가상의 회원 데이터베이스 (초기 구동용)
  const [usersDb, setUsersDb] = useState([
    {
      phone: '010-1234-5678',
      dob: '900101',
      memberCode: 'AGIT-000001',
      visits: 12,
      totalHours: 25.5,
      coupons: [{ id: 1, name: '평일 1시간 무료 이용권', used: false }],
      reservations: []
    }
  ]);

  // 자동 로그인 체크 (앱 최초 실행 시) - Vercel 에러(ESLint)를 피하도록 로직 완벽 수정
  useEffect(() => {
    const savedMemberCode = localStorage.getItem('agit_auto_login');
    if (savedMemberCode) {
      setUsersDb(prevDb => {
        const user = prevDb.find(u => u.memberCode === savedMemberCode);
        if (user) {
          setCurrentUser(user);
          setShowToast('자동 로그인 되었습니다.');
          setTimeout(() => setShowToast(''), 3000);
        }
        return prevDb;
      });
    }
  }, []);

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

    // 뒷자리 4자리가 일치하는 유저 찾기
    const user = usersDb.find(u => u.phone.endsWith(phoneLast4));
    
    if (user) {
      setCurrentUser(user);
      setAuthError('');
      if (autoLogin) {
        localStorage.setItem('agit_auto_login', user.memberCode);
      }
      displayToast('다시 오신 것을 환영합니다!');
    } else {
      setAuthError('일치하는 회원 정보가 없습니다.');
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!phone || !dob) {
      setAuthError('핸드폰 번호와 생년월일을 모두 입력해주세요.');
      return;
    }
    if (!agreed) {
      setAuthError('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    // 기존 회원 중복 확인
    const existingUser = usersDb.find(u => u.phone === phone);
    if (existingUser) {
      setAuthError('이미 가입된 번호입니다. 로그인해주세요.');
      return;
    }
    
    // 신규 회원 가입 처리
    const newUser = {
      phone,
      dob,
      memberCode: generateMemberCode(),
      visits: 0,
      totalHours: 0,
      coupons: [{ id: Date.now(), name: '신규 가입 환영 음료 쿠폰', used: false }],
      reservations: []
    };
    
    setUsersDb([...usersDb, newUser]);
    setCurrentUser(newUser);
    setAuthError('');
    
    if (autoLogin) {
      localStorage.setItem('agit_auto_login', newUser.memberCode);
    }
    
    displayToast('환영합니다! 신규 가입 쿠폰이 발급되었습니다.');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
    setPhoneLast4('');
    setPhone('');
    setDob('');
    setAgreed(false);
    setAutoLogin(false);
    localStorage.removeItem('agit_auto_login'); // 자동 로그인 해제
    displayToast('로그아웃 되었습니다.');
  };

  // 관리자용(매장용) 예약 승인 시뮬레이션 함수
  const handleApproveReservation = (resId) => {
    const updatedReservations = currentUser.reservations.map(res => 
      res.id === resId ? { ...res, status: '확정' } : res
    );
    const updatedUser = { ...currentUser, reservations: updatedReservations };
    setCurrentUser(updatedUser);
    setUsersDb(usersDb.map(u => u.memberCode === updatedUser.memberCode ? updatedUser : u));
    displayToast('매장 시스템에서 예약이 확정되었습니다!');
  };

  const handleReservation = (e) => {
    e.preventDefault();
    
    // 1. 매장 연동 및 신청 전송 시뮬레이션
    setIsCheckingSeat(true);
    displayToast('매장 시스템으로 예약 신청을 전송 중입니다...');

    setTimeout(() => {
      setIsCheckingSeat(false);
      
      // 2. 2026년으로 고정된 날짜 및 시간/분 조합
      const dateStr = `2026년 ${resMonth}월 ${resDay}일`;
      const timeStr = `${resHour}:${resMinute}`;
      
      const newRes = {
        id: Date.now(),
        date: dateStr,
        time: timeStr,
        people: resPeople,
        status: '대기 중' // 예약 대기 상태로 저장
      };

      const updatedUser = {
        ...currentUser,
        reservations: [...currentUser.reservations, newRes]
      };

      setCurrentUser(updatedUser);
      setUsersDb(usersDb.map(u => u.memberCode === updatedUser.memberCode ? updatedUser : u));
      
      // 3. 매장 관리 어플 알림 전송 메시지
      displayToast('예약 신청 완료! 매장에서 승인 시 확정됩니다.');
      setCurrentView('home');
    }, 2000); // 2초간 전송 연출
  };

  // 쿠폰 사용 처리 핸들러
  const handleUseCoupon = (couponId) => {
    // 실수로 누르는 것을 방지하기 위한 확인 창
    if (!window.confirm('직원 확인용입니다. 정말 사용 처리하시겠습니까?')) return;
    
    const updatedCoupons = currentUser.coupons.map(c => 
      c.id === couponId ? { ...c, used: true } : c
    );
    
    const updatedUser = { ...currentUser, coupons: updatedCoupons };
    setCurrentUser(updatedUser);
    setUsersDb(usersDb.map(u => u.memberCode === updatedUser.memberCode ? updatedUser : u));
    displayToast('쿠폰이 정상적으로 사용 처리되었습니다.');
  };

  // --- 화면 렌더링 컴포넌트 ---

  // 1. 로그인/회원가입 화면
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
                <label className="block text-sm font-medium text-neutral-300 mb-1">핸드폰 번호 뒤 4자리</label>
                <input 
                  type="number" 
                  placeholder="예: 5678" 
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors tracking-widest text-lg"
                  maxLength={4}
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
                <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">
                  자동 로그인
                </span>
              </label>

              {authError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-neutral-950 font-bold py-3.5 rounded-lg transition-colors shadow-lg shadow-yellow-400/20"
              >
                로그인
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                  className="text-sm text-neutral-400 hover:text-yellow-400 transition-colors underline underline-offset-4"
                >
                  아직 회원이 아니신가요? 회원가입
                </button>
              </div>
            </form>
          ) : (
            // --- 회원가입 폼 ---
            <form onSubmit={handleSignup} className="bg-neutral-900 p-6 rounded-2xl shadow-xl space-y-5 border border-neutral-800 animate-in fade-in zoom-in duration-300">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">핸드폰 번호</label>
                <input 
                  type="tel" 
                  placeholder="010-0000-0000" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">생년월일 6자리</label>
                <input 
                  type="number" 
                  placeholder="YYMMDD" 
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors"
                />
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded border-2 border-neutral-600 peer-checked:bg-yellow-400 peer-checked:border-yellow-400 transition-colors flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-neutral-950 opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <span className="text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
                  (필수) 서비스 이용을 위한 개인정보 수집 및 이용에 동의합니다.
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
                <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">
                  가입 후 자동 로그인
                </span>
              </label>

              {authError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-neutral-950 font-bold py-3.5 rounded-lg transition-colors shadow-lg shadow-yellow-400/20"
              >
                회원가입
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  className="text-sm text-neutral-400 hover:text-yellow-400 transition-colors underline underline-offset-4"
                >
                  이미 회원이신가요? 로그인
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const tierInfo = getTier(currentUser.totalHours);

  // --- 메인 레이아웃 ---
  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans max-w-md mx-auto relative pb-20 shadow-2xl">
      
      {/* 상단 헤더 */}
      <header className="px-6 py-5 flex justify-between items-center sticky top-0 bg-neutral-950/80 backdrop-blur-md z-10 border-b border-neutral-900">
        <h1 className="text-xl font-black text-yellow-400">아지트 멤버십</h1>
        <button onClick={handleLogout} className="text-xs text-neutral-400 hover:text-white transition-colors bg-neutral-900 px-3 py-1.5 rounded-full">
          로그아웃
        </button>
      </header>

      {/* 본문 영역 */}
      <main className="p-6 space-y-6">
        
        {/* 홈 뷰 */}
        {currentView === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 디지털 멤버십 카드 */}
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl p-6 border border-neutral-700 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm text-neutral-400 mb-1">MEMBERSHIP CODE</p>
                  <p className="text-2xl font-mono tracking-widest font-bold text-white">{currentUser.memberCode}</p>
                </div>
                <div className={`px-3 py-1 rounded-full bg-neutral-950/50 border border-neutral-700 font-bold text-sm ${tierInfo.color}`}>
                  {tierInfo.name}
                </div>
              </div>

              {/* 가상의 바코드 영역 */}
              <div className="w-full h-16 bg-white/10 rounded-lg flex flex-col justify-center items-center mb-6">
                 {/* CSS로 구현한 가짜 바코드 패턴 */}
                 <div className="w-full h-10 flex px-4 items-center justify-between opacity-80">
                    {[...Array(40)].map((_, i) => (
                      <div key={i} className={`h-full bg-white ${Math.random() > 0.5 ? 'w-0.5' : (Math.random() > 0.8 ? 'w-1.5' : 'w-1')}`}></div>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 divide-x divide-neutral-700 bg-neutral-950/50 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-xs text-neutral-400 mb-1">누적 방문</p>
                  <p className="text-xl font-bold"><span className="text-yellow-400">{currentUser.visits}</span>회</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-400 mb-1">누적 이용 시간</p>
                  <p className="text-xl font-bold"><span className="text-yellow-400">{currentUser.totalHours}</span>H</p>
                </div>
              </div>
            </div>

            {/* 이벤트 배너 */}
            <div className="bg-yellow-400 text-neutral-950 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/10">
              <div>
                <p className="font-bold text-sm mb-0.5">🎉 이달의 이벤트</p>
                <p className="text-xs font-medium opacity-80">신규 보드게임 입고 기념! 리뷰 작성 시 1시간 무료</p>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>

            {/* 다가오는 예약 (상태별 렌더링 및 매장 승인 테스트 버튼 추가) */}
            {currentUser.reservations.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  내 예약 내역
                </h3>
                <div className="space-y-3">
                  {currentUser.reservations.map((res) => (
                    <div key={res.id} className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-bold text-lg">{res.date}</p>
                          <p className="text-sm text-neutral-400">{res.time} · {res.people}명</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                          res.status === '확정' 
                            ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' 
                            : 'bg-neutral-800 text-neutral-400 border-neutral-600'
                        }`}>
                          {res.status === '확정' ? '예약 확정' : '승인 대기'}
                        </span>
                      </div>
                      
                      {/* 시뮬레이션용 매장 승인 버튼 (테스트용) */}
                      {res.status !== '확정' && (
                        <button
                          onClick={() => handleApproveReservation(res.id)}
                          className="w-full mt-2 py-2 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs border border-dashed border-neutral-600 rounded transition-colors"
                        >
                          🧪 [매장 관리자 테스트] 예약 확정하기
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SNS 연계 섹션 */}
            <div className="pt-4">
              <h3 className="text-sm font-bold text-neutral-400 mb-4 px-1">아지트 소식 & 꿀팁 보러가기</h3>
              <div className="grid grid-cols-3 gap-3">
                <button className="flex flex-col items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 p-4 rounded-xl border border-neutral-800 transition-colors">
                  {/* 인스타그램 인라인 SVG */}
                  <svg className="w-6 h-6 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  <span className="text-xs font-medium">인스타그램</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 p-4 rounded-xl border border-neutral-800 transition-colors">
                  {/* 유튜브 인라인 SVG */}
                  <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.54a29 29 0 0 0 .46 5.12 2.78 2.78 0 0 0 1.95 1.96c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.12 29 29 0 0 0-.46-5.12z" />
                    <polygon points="9.75 15.02 15.5 11.54 9.75 8.06 9.75 15.02" fill="currentColor" />
                  </svg>
                  <span className="text-xs font-medium">유튜브 릴스</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 p-4 rounded-xl border border-neutral-800 transition-colors">
                  <BookOpen className="w-6 h-6 text-green-500" />
                  <span className="text-xs font-medium">네이버 블로그</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 예약 뷰 */}
        {currentView === 'reservation' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold">테이블 예약</h2>
            <p className="text-neutral-400 text-sm">원하시는 날짜와 시간을 선택해 주세요. 예약 확정 시 매장 관리 어플로 즉시 알림이 전송됩니다.</p>
            
            <form onSubmit={handleReservation} className="space-y-5 bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">방문 날짜 (2026년)</label>
                <div className="flex gap-2">
                  <select 
                    value={resMonth}
                    onChange={(e) => setResMonth(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={String(i+1).padStart(2, '0')}>{i+1}월</option>
                    ))}
                  </select>
                  <select 
                    value={resDay}
                    onChange={(e) => setResDay(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                  >
                    {[...Array(31)].map((_, i) => (
                      <option key={i+1} value={String(i+1).padStart(2, '0')}>{i+1}일</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">방문 시간</label>
                <div className="flex gap-2">
                  <select 
                    value={resHour}
                    onChange={(e) => setResHour(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                  >
                    {["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"].map(h => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <select 
                    value={resMinute}
                    onChange={(e) => setResMinute(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                  >
                    {["00", "10", "20", "30", "40", "50"].map(m => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">방문 인원</label>
                <select 
                  value={resPeople}
                  onChange={(e) => setResPeople(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                >
                  {[2,3,4,5,6,7,8].map(num => (
                    <option key={num} value={num}>{num}명</option>
                  ))}
                  <option value="9">9명 이상 (단체)</option>
                </select>
              </div>
              
              <button 
                type="submit" 
                disabled={isCheckingSeat}
                className={`w-full mt-4 font-bold py-3.5 rounded-lg transition-colors flex justify-center items-center gap-2 ${
                  isCheckingSeat 
                    ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' 
                    : 'bg-yellow-400 hover:bg-yellow-500 text-neutral-950'
                }`}
              >
                {isCheckingSeat ? (
                  <>
                    <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
                    빈자리 확인 중...
                  </>
                ) : '예약 신청하기'}
              </button>
            </form>
          </div>
        )}

        {/* 쿠폰함 뷰 */}
        {currentView === 'coupon' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">내 쿠폰함</h2>
            
            <div className="space-y-4">
              {currentUser.coupons.length === 0 ? (
                <div className="text-center py-10 bg-neutral-900 rounded-xl border border-neutral-800 text-neutral-500">
                  <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>사용 가능한 쿠폰이 없습니다.</p>
                </div>
              ) : (
                currentUser.coupons.map(coupon => (
                  <div key={coupon.id} className={`relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between transition-opacity ${coupon.used ? 'opacity-50' : 'opacity-100'}`}>
                    {/* 쿠폰 장식 (점선) */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 border-r-2 border-dashed border-neutral-950"></div>
                    
                    <div className="pl-4 flex-1">
                      <p className="text-yellow-400 text-xs font-bold mb-1">EVENT COUPON</p>
                      <p className="text-lg font-bold text-white mb-2">{coupon.name}</p>
                      
                      <button 
                        onClick={() => handleUseCoupon(coupon.id)}
                        disabled={coupon.used}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                          coupon.used 
                            ? 'bg-neutral-800 text-neutral-500 border border-neutral-700' 
                            : 'bg-yellow-400 text-neutral-950 hover:bg-yellow-500'
                        }`}
                      >
                        {coupon.used ? '사용 완료' : '사용하기'}
                      </button>
                    </div>
                    <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center shrink-0 border border-neutral-700 ml-4">
                      <Ticket className="w-6 h-6 text-neutral-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* 하단 네비게이션 바 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-900 pb-safe">
        <div className="flex justify-around items-center p-3">
          <button 
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${currentView === 'home' ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">홈</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('reservation')}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${currentView === 'reservation' ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <CalendarPlus className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">예약하기</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('coupon')}
            className={`relative flex flex-col items-center p-2 rounded-lg transition-colors ${currentView === 'coupon' ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Ticket className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">쿠폰함</span>
            {currentUser.coupons.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-neutral-950"></span>
            )}
          </button>
        </div>
      </nav>

      {/* 토스트 알림 */}
      {showToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-neutral-950 px-6 py-3 rounded-full font-bold shadow-xl shadow-yellow-400/20 z-50 animate-in fade-in slide-in-from-top-4 text-sm whitespace-nowrap">
          {showToast}
        </div>
      )}
      
      {/* iOS 하단 여백 처리를 위한 더미 공간 */}
      <div className="h-6 bg-transparent pb-safe"></div>
    </div>
  );
}