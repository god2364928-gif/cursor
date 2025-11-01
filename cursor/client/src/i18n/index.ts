import { create } from 'zustand'

export type Language = 'ja' | 'ko'

interface Translation {
  [key: string]: string | Translation
}

const translations: Record<Language, Translation> = {
  ja: {
    // Navigation
    dashboard: 'ダッシュボード',
    customers: '顧客管理',
    retargeting: 'リターゲティング',
    sales: '実績管理',
    settings: '設定',
    logout: 'ログアウト',
    
    // Common
    loading: '読み込み中...',
    search: '検索',
    create: '作成',
    update: '更新',
    delete: '削除',
    save: '保存',
    cancel: 'キャンセル',
    add: '追加',
    edit: '編集',
    confirm: '確認',
    close: '閉じる',
    all: '全て',
    me: '本人',
    previous: '前',
    next: '次',
    previousMonth: '前月',
    currentMonth: '当月',
    startDate: '開始日',
    endDate: '終了日',
    
    // Inflow Path Options
    outboundPhone: 'アウトバウンド(電話)',
    outboundLine: 'アウトバウンド(ライン)',
    outboundDM: 'アウトバウンド(DM)',
    outboundOther: 'アウトバウンド(その他)',
    inboundHomepage: 'インバウンド(ホームページ)',
    inboundTopExposure: 'インバウンド(上位表示)',
    inboundOther: 'インバウンド(その他)',
    freeTrial: '無料体験',
    introduction: '紹介',
    other: 'その他',
    
    // Retargeting Status Options
    start: '開始',
    awareness: '認知',
    interest: '興味',
    desire: '欲求',
    trash: 'ゴミ箱',
    inProgress: '営業中',
    
    // Additional UI elements
    category: 'カテゴリ',
    daysAgo: '日前',
    enterContent: '内容を入力してください',
    pm: '午後',
    customer: '顧客',
    record: '記録',
    japanese: '日本語',
    myGoal: '私の目標',
    history: '履歴',
    
    // Dashboard
    dashboardTitle: 'ダッシュボード',
    dashboardSubtitle: '主要指標と売上推移を確認してください',
    dailyContacts: '当日連絡数',
    totalSales: '売上合計',
    retargetingProgress: 'リターゲティング進捗率',
    salesProgress: '営業進捗状況',
    employeeProgress: '従業員別進捗状況',
    contractStatus: '契約状況',
    contractCustomers: '契約中顧客数',
    newCustomers: '新規顧客数',
    monthlySalesTrend: '12ヶ月売上推移',
    personalSales: '本人売上',
    totalSalesTrend: '全体売上推移',
    yen: '円',
    
    // Additional translations
    basicInfo: '基本情報',
    contractInfo: '契約情報',
    marketingInfo: 'マーケティング情報',
    contractAmount: '契約金額',
    month: 'ヶ月',
    extendContract: '延長',
    notAssigned: '未指定',
    expired: '期限切れ',
    selectCustomer: '顧客を選択してください',
    enterRecord: '記録を入力',
    enter: '入力',
    editUser: 'ユーザー編集',
    saving: '保存中...',
    total: '総',
    cases: '件',
    monthlySalesTrendSubtitle: '最近12ヶ月の本人売上と全体売上の比較',

    // Customer Management
    customerList: '顧客一覧',
    customerDetails: '顧客詳細情報',
    customerHistory: '履歴',
    companyName: '商号',
    customerName: '顧客名',
    phone: '電話番号',
    manager: '担当者',
    status: '進行状況',
    industry: '業種',
    region: '地域',
    regionPlaceholder: 'ソウル、京畿、釜山 など',
    inflowPath: '流入経路',
    homepage: 'ホームページ',
    instagram: 'インスタグラム',
    mainKeywords: 'メインキーワード',
    monthlyBudget: '月額予算',
    contractStartDate: '契約開始日',
    contractExpirationDate: '契約満了日',
    registrationDate: '登録日',
    lastContactDate: '最終連絡日',
    remainingDays: '残り期間',
    memo: 'メモ',
    addCustomer: '顧客追加',
    editCustomer: '顧客編集',
    addHistory: '履歴追加',
    addPhone: '電話番号追加',
    addInstagram: 'Instagram追加',
    contractInProgress: '契約中',
    contractTerminated: '契約解除',
    pinned: '固定',
    pin: '固定',
    unpin: '固定解除',
    confirmMoveToTrash: '本当にゴミ箱に送りますか？',
    contractInfoInput: '契約情報入力',
    yearMonthDay: '年-月-日',
    
    // Retargeting
    retargetingList: 'リターゲティング一覧',
    retargetingDetails: 'リターゲティング詳細情報',
    retargetingHistory: '履歴',
    addRetargeting: 'リターゲティング追加',
    editRetargeting: 'リターゲティング編集',
    moveToTrash: 'ゴミ箱へ',
    moveToActive: '営業中へ',
    activeSales: '営業中',
    convertToCustomer: '契約完了',
    
    // Sales Management
    salesList: '売上一覧',
    salesDetails: '売上詳細',
    addSales: '売上追加',
    editSales: '売上編集',
    salesType: '売上分類',
    sourceType: 'タイプ',
    amount: '金額',
    contractDate: '入金日',
    payerName: '振込名義',
    marketingContent: 'マーケティング内容',
    includeTax: '消費税込み',
    newSales: '新規売上',
    renewalSales: '延長売上',
    cancellationSales: '解約売上',
    totalSalesAmount: '総売上',
    newSalesAmount: '新規売上',
    renewalSalesAmount: '延長売上',
    cancellationSalesAmount: '解約売上',
    
    // History Types
    missedCall: '不在',
    callSuccess: '通話成功',
    kakaoTalk: 'ライン',
    
    // Settings
    userManagement: 'ユーザー管理',
    accountInfo: 'アカウント情報',
    language: '言語',
    addUser: 'ユーザー追加',
    userName: 'ユーザー名',
    email: 'メールアドレス',
    password: 'パスワード',
    team: 'チーム',
    role: '役割',
    admin: '管理者',
    user: '一般ユーザー',
    
    // Messages
    success: '成功',
    error: 'エラー',
    confirmDelete: '削除してもよろしいですか？',
    confirmMoveToActive: '営業中に移動してもよろしいですか？',
    onlyOwnerCanModify: '本人のみ内容を修正可能です',
    copySuccess: 'コピーされました',
    contractExtended: '契約が延長されました',
    customerConverted: '顧客に変換されました',
    
    // Form Labels
    required: '必須',
    optional: '任意',
    selectOption: '選択してください',
    enterValue: '値を入力してください',
    
    // Status Values
    
    // Inflow Paths
    inboundSEO: 'インバウンド(上位表示)',
    referral: '紹介',
  },
  ko: {
    // Navigation
    dashboard: '대시보드',
    customers: '고객 관리',
    retargeting: '리타겟팅',
    sales: '실적 관리',
    settings: '설정',
    logout: '로그아웃',
    
    // Common
    loading: '로딩 중...',
    search: '검색',
    create: '생성',
    update: '수정',
    delete: '삭제',
    save: '저장',
    cancel: '취소',
    add: '추가',
    edit: '수정',
    confirm: '확인',
    close: '닫기',
    all: '전체',
    me: '본인',
    previous: '이전',
    next: '다음',
    previousMonth: '전월',
    currentMonth: '당월',
    startDate: '시작일',
    endDate: '종료일',
    
    // Inflow Path Options
    outboundPhone: '아웃바운드(전화)',
    outboundLine: '아웃바운드(라인)',
    outboundDM: '아웃바운드(DM)',
    outboundOther: '아웃바운드(기타)',
    inboundHomepage: '인바운드(홈페이지)',
    inboundTopExposure: '인바운드(상위노출)',
    inboundOther: '인바운드(기타)',
    freeTrial: '무료체험',
    introduction: '소개',
    other: '기타',
    
    // Retargeting Status Options
    start: '시작',
    awareness: '인지',
    interest: '흥미',
    desire: '욕망',
    trash: '휴지통',
    inProgress: '영업중',
    
    // Additional UI elements
    category: '카테고리',
    daysAgo: '일전',
    enterContent: '내용을 입력하세요',
    pm: '오후',
    customer: '고객',
    record: '기록',
    japanese: '일본어',
    myGoal: '나의 목표',
    history: '히스토리',
    
    // Dashboard
    dashboardTitle: '대시보드',
    dashboardSubtitle: '주요 지표와 매출 추이를 확인하세요',
    dailyContacts: '당일 연락 수',
    totalSales: '매출 합계',
    retargetingProgress: '리타겟팅 진행률',
    salesProgress: '영업 진행현황',
    employeeProgress: '직원별 진행 상황',
    contractStatus: '계약현황',
    contractCustomers: '계약중 고객수',
    newCustomers: '신규 고객수',
    monthlySalesTrend: '12개월 매출 추이',
    personalSales: '본인 매출',
    totalSalesTrend: '전체 매출 추이',
    yen: '엔',
    
    // Additional translations
    basicInfo: '기본 정보',
    contractInfo: '계약 정보',
    marketingInfo: '마케팅 정보',
    contractAmount: '계약금액',
    month: '개월',
    extendContract: '연장',
    notAssigned: '미지정',
    expired: '만료됨',
    selectCustomer: '고객을 선택하세요',
    enterRecord: '기록을 입력',
    enter: '입력',
    editUser: '직원 수정',
    saving: '저장 중...',
    total: '총',
    cases: '건',
    monthlySalesTrendSubtitle: '최근 12개월 본인 매출과 전체 매출 비교',

    // Customer Management
    customerList: '고객 목록',
    customerDetails: '고객 상세 정보',
    customerHistory: '히스토리',
    companyName: '상호',
    customerName: '고객명',
    phone: '전화번호',
    manager: '담당자',
    status: '진행현황',
    industry: '업종',
    region: '지역',
    regionPlaceholder: '서울, 경기, 부산 등',
    inflowPath: '유입경로',
    homepage: '홈페이지',
    instagram: '인스타그램',
    mainKeywords: '메인 키워드',
    monthlyBudget: '월 예산',
    contractStartDate: '계약 시작일',
    contractExpirationDate: '계약 만료일',
    registrationDate: '등록일',
    lastContactDate: '마지막 연락일',
    remainingDays: '남은 기간',
    memo: '메모',
    addCustomer: '고객 추가',
    editCustomer: '고객 수정',
    addHistory: '히스토리 추가',
    addPhone: '전화번호 추가',
    addInstagram: '인스타그램 추가',
    contractInProgress: '계약중',
    contractTerminated: '계약해지',
    pinned: '고정됨',
    pin: '고정',
    unpin: '고정해제',
    confirmMoveToTrash: '정말로 trash으로 보내시겠습니까?',
    contractInfoInput: '계약 정보 입력',
    yearMonthDay: '연도-월-일',
    
    // Retargeting
    retargetingList: '리타겟팅 목록',
    retargetingDetails: '리타겟팅 상세 정보',
    retargetingHistory: '히스토리',
    addRetargeting: '리타겟팅 추가',
    editRetargeting: '리타겟팅 수정',
    moveToTrash: '휴지통으로',
    moveToActive: '영업중으로',
    activeSales: '영업중',
    convertToCustomer: '고객으로 전환',
    
    // Sales Management
    salesList: '매출 목록',
    salesDetails: '매출 상세',
    addSales: '매출 추가',
    editSales: '매출 수정',
    salesType: '매출 분류',
    sourceType: '유형',
    amount: '금액',
    contractDate: '입금일',
    payerName: '입금자명',
    marketingContent: '마케팅 내용',
    includeTax: '소비세 포함',
    newSales: '신규 매출',
    renewalSales: '연장 매출',
    cancellationSales: '해지 매출',
    totalSalesAmount: '총 매출',
    newSalesAmount: '신규 매출',
    renewalSalesAmount: '연장 매출',
    cancellationSalesAmount: '해지 매출',
    
    // History Types
    missedCall: '부재중',
    callSuccess: '통화성공',
    kakaoTalk: '라인',
    
    // Settings
    userManagement: '직원 관리',
    accountInfo: '계정 정보',
    language: '언어',
    addUser: '직원 추가',
    userName: '이름',
    email: '이메일',
    password: '비밀번호',
    team: '팀',
    role: '역할',
    admin: '관리자',
    user: '일반 사용자',
    
    // Messages
    success: '성공',
    error: '오류',
    confirmDelete: '삭제하시겠습니까?',
    confirmMoveToActive: '영업중으로 이동하시겠습니까?',
    onlyOwnerCanModify: '본인만 내용을 수정 가능합니다',
    copySuccess: '복사되었습니다',
    contractExtended: '계약이 연장되었습니다',
    customerConverted: '고객으로 변환되었습니다',
    
    // Form Labels
    required: '필수',
    optional: '선택',
    selectOption: '선택하세요',
    enterValue: '값을 입력하세요',
    
    // Status Values
    
    // Inflow Paths
    inboundSEO: '인바운드(상위노출)',
    referral: '소개',
  },
}

interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

function getNestedValue(obj: Translation, path: string): string {
  const keys = path.split('.')
  let value: any = obj
  for (const key of keys) {
    value = value?.[key]
    if (!value) return path
  }
  return value as string
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: (localStorage.getItem('language') as Language) || 'ja',
  setLanguage: (lang: Language) => {
    localStorage.setItem('language', lang)
    set({ language: lang })
  },
  t: (key: string) => {
    const { language } = get()
    return getNestedValue(translations[language], key) || key
  },
}))