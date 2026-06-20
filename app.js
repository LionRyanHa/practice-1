"use strict";

const SUPABASE_CONFIG = window.HANJA_SUPABASE_CONFIG || {};
const SUPABASE_URL = SUPABASE_CONFIG.url || "";
const SUPABASE_PUBLISHABLE_KEY = SUPABASE_CONFIG.publishableKey || "";
const supabaseClient =
    window.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
        ? window.supabase.createClient(
              SUPABASE_URL,
              SUPABASE_PUBLISHABLE_KEY,
              {
                  auth: {
                      persistSession: true,
                      autoRefreshToken: true,
                      detectSessionInUrl: true,
                  },
              },
          )
        : null;

const PROFILE_STORAGE_KEY = "hanja-profile-v1";
const LEGACY_LOGIN_STORAGE_KEY = "hanja-login-v2";
const USER_PROFILE_STORAGE_PREFIX = "hanja-profile-v2:";
const DEFAULT_SHOP_ITEM_ID = "classic";
const DEFAULT_SHOP_ITEM = {
    id: DEFAULT_SHOP_ITEM_ID,
    name: "기본 프레임",
    symbol: "한",
    summary: "효과를 끈 기본 상태",
    accent: "#6558e8",
    skinClass: "shop-skin-classic",
};
const shopItems = [
    {
        id: "ember-ring",
        rank: 1,
        name: "빨강",
        price: 500,
        symbol: "赤",
        summary: "배경만 바뀝니다.",
        accent: "#ff4f5e",
        skinClass: "shop-skin-ember-ring",
    },
    {
        id: "violet-nebula",
        rank: 2,
        name: "주황",
        price: 1100,
        symbol: "橙",
        summary: "배경만 바뀝니다.",
        accent: "#ff9f43",
        skinClass: "shop-skin-violet-nebula",
    },
    {
        id: "crimson-nova",
        rank: 3,
        name: "노랑",
        price: 2200,
        symbol: "黃",
        summary: "요소가 추가됩니다.",
        accent: "#ffd84f",
        skinClass: "shop-skin-crimson-nova",
    },
    {
        id: "azure-singularity",
        rank: 4,
        name: "초록",
        price: 2600,
        symbol: "綠",
        summary: "요소가 추가됩니다.",
        accent: "#37d67a",
        skinClass: "shop-skin-azure-singularity",
    },
    {
        id: "cobalt-tide",
        rank: 5,
        name: "파랑",
        price: 3000,
        symbol: "靑",
        summary: "애니메이션이 추가됩니다.",
        accent: "#3aa7ff",
        skinClass: "shop-skin-cobalt-tide",
    },
    {
        id: "indigo-depth",
        rank: 6,
        name: "남색",
        price: 3400,
        symbol: "藍",
        summary: "애니메이션이 추가됩니다.",
        accent: "#536dfe",
        skinClass: "shop-skin-indigo-depth",
    },
    {
        id: "violet-orbit",
        rank: 7,
        name: "보라",
        price: 3900,
        symbol: "紫",
        summary: "애니메이션이 추가됩니다.",
        accent: "#b45cff",
        skinClass: "shop-skin-violet-orbit",
    },
    {
        id: "prism-crown",
        rank: 8,
        name: "무지개",
        price: 4500,
        symbol: "虹",
        summary: "무지개",
        accent: "#78f7ff",
        skinClass: "shop-skin-prism-crown",
    },
];

const DEFAULT_PROFILE = {
    displayName: "한자 학습자",
    points: 0,
    level: 1,
    unlockedLessons: [1],
    lastAttendanceDate: "",
    attendanceCount: 0,
    theme: "light",
    defaultDirection: "meaning-to-hanja",
    ownedShopItems: [DEFAULT_SHOP_ITEM_ID],
    equippedShopItem: DEFAULT_SHOP_ITEM_ID,
    legacyImported: false,
};

let currentUser = null;
let remoteLeaderboardEntries = [];
let authActivationToken = 0;
let inviteStatus = {
    inviteApproved: false,
    isAdmin: false,
    currentCode: "",
};

function normalizeProfile(savedProfile = {}) {
    const unlockedLessons = Array.isArray(savedProfile.unlockedLessons)
        ? savedProfile.unlockedLessons
              .map(Number)
              .filter((lessonId) => lessonId >= 1 && lessonId <= 5)
        : [1];
    const defaultDirection = [
        "meaning-to-hanja",
        "hanja-to-meaning",
        "mixed",
    ].includes(savedProfile.defaultDirection)
        ? savedProfile.defaultDirection
        : DEFAULT_PROFILE.defaultDirection;
    const validShopItemIds = new Set([DEFAULT_SHOP_ITEM_ID, ...shopItems.map((item) => item.id)]);
    const rawOwnedShopItems = Array.isArray(savedProfile.ownedShopItems)
        ? savedProfile.ownedShopItems
        : Array.isArray(savedProfile.owned_shop_items)
          ? savedProfile.owned_shop_items
          : DEFAULT_PROFILE.ownedShopItems;
    const ownedShopItems = Array.from(
        new Set([
            DEFAULT_SHOP_ITEM_ID,
            ...rawOwnedShopItems.map((itemId) => String(itemId)),
        ]),
    ).filter((itemId) => validShopItemIds.has(itemId));
    const savedEquippedShopItem =
        typeof savedProfile.equippedShopItem === "string"
            ? savedProfile.equippedShopItem
            : typeof savedProfile.equipped_shop_item === "string"
              ? savedProfile.equipped_shop_item
              : DEFAULT_SHOP_ITEM_ID;
    const equippedShopItem = ownedShopItems.includes(savedEquippedShopItem)
        ? savedEquippedShopItem
        : DEFAULT_SHOP_ITEM_ID;

    return {
        ...DEFAULT_PROFILE,
        displayName:
            typeof savedProfile.displayName === "string" &&
            savedProfile.displayName.trim()
                ? savedProfile.displayName.trim().slice(0, 12)
                : DEFAULT_PROFILE.displayName,
        points: Math.max(0, Math.floor(Number(savedProfile.points) || 0)),
        level: Math.max(1, Math.floor(Number(savedProfile.level) || 1)),
        unlockedLessons: Array.from(new Set([1, ...unlockedLessons])).sort(
            (first, second) => first - second,
        ),
        lastAttendanceDate:
            typeof savedProfile.lastAttendanceDate === "string"
                ? savedProfile.lastAttendanceDate
                : "",
        attendanceCount: Math.max(
            0,
            Math.floor(Number(savedProfile.attendanceCount) || 0),
        ),
        theme: savedProfile.theme === "dark" ? "dark" : "light",
        defaultDirection,
        ownedShopItems,
        equippedShopItem,
        legacyImported: Boolean(savedProfile.legacyImported),
    };
}

function loadProfile(storageKey = PROFILE_STORAGE_KEY) {
    try {
        return normalizeProfile(
            JSON.parse(localStorage.getItem(storageKey) || "{}"),
        );
    } catch {
        return { ...DEFAULT_PROFILE };
    }
}

const profile = loadProfile();
delete profile.swipeEnabled;

function getUserProfileStorageKey(userId = currentUser && currentUser.id) {
    return userId
        ? `${USER_PROFILE_STORAGE_PREFIX}${userId}`
        : PROFILE_STORAGE_KEY;
}

function saveProfile() {
    try {
        localStorage.setItem(
            getUserProfileStorageKey(),
            JSON.stringify(profile),
        );
    } catch {
        // 저장소가 차단된 환경에서는 현재 탭에서만 상태를 유지합니다.
    }
}

function fromDatabaseProfile(row) {
    return normalizeProfile({
        displayName: row.display_name,
        points: row.points,
        level: row.level,
        unlockedLessons: row.unlocked_lessons,
        lastAttendanceDate: row.last_attendance_date || "",
        attendanceCount: row.attendance_count,
        theme: row.theme,
        defaultDirection: row.default_direction,
        ownedShopItems: row.owned_shop_items,
        equippedShopItem: row.equipped_shop_item,
        legacyImported: row.legacy_imported,
    });
}

function getAuthRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
}

function applyServerProfile(serverProfile) {
    Object.assign(profile, fromDatabaseProfile(serverProfile));
    saveProfile();

    const currentEntry = remoteLeaderboardEntries.find(
        (entry) => entry.isCurrent,
    );

    if (currentEntry) {
        currentEntry.displayName = profile.displayName;
        currentEntry.points = profile.points;
        currentEntry.level = profile.level;
        currentEntry.equippedShopItem = profile.equippedShopItem;
    }
}

// 실제 단어를 받으면 이 데이터만 교체하면 됩니다.
const lessons = [
    {
        id: 1,
        symbol: "一",
        price: 0,
        color: "#536dfe",
        background: "#edf0ff",
        words: [
            { hanja: "黃", meaning: "누를 황" },
            { hanja: "帝", meaning: "임금 제" },
            { hanja: "馬", meaning: "말 마" },
            { hanja: "鳥", meaning: "새 조" },
            { hanja: "羊", meaning: "양 양" },
            { hanja: "本", meaning: "근본 본" },
            { hanja: "末", meaning: "끝 말" },
            { hanja: "炎", meaning: "불꽃 염" },
            { hanja: "好", meaning: "좋을 호" },
            { hanja: "安", meaning: "편안할 안" },
            { hanja: "火", meaning: "불 화" },
            { hanja: "人", meaning: "사람 인" },
            { hanja: "木", meaning: "나무 목" },
            { hanja: "女", meaning: "여자 녀" },
            { hanja: "子", meaning: "아들 자" },
            { hanja: "宀", meaning: "집 면" },
            { hanja: "淸", meaning: "맑을 청" },
            { hanja: "晴", meaning: "갤 청" },
            { hanja: "請", meaning: "청할 청" },
            { hanja: "情", meaning: "뜻 정" },
            { hanja: "水", meaning: "물 수" },
            { hanja: "日", meaning: "해, 날 일" },
            { hanja: "言", meaning: "말씀 언" },
            { hanja: "心", meaning: "마음 심" },
            { hanja: "靑", meaning: "푸를 청" },
            { hanja: "漢", meaning: "한나라 한" },
            { hanja: "字", meaning: "글자 자" },
            { hanja: "典", meaning: "법 전" },
            { hanja: "玉", meaning: "구슬 옥" },
            { hanja: "篇", meaning: "책 편" },
            { hanja: "判", meaning: "판단할 판" },
            { hanja: "刀", meaning: "칼 도" },
            { hanja: "川", meaning: "내 천" },
            { hanja: "二", meaning: "두 이" },
            { hanja: "十", meaning: "열 십" },
            { hanja: "井", meaning: "우물 정" },
            { hanja: "入", meaning: "들 입" },
            { hanja: "余", meaning: "나 여" },
            { hanja: "小", meaning: "작을 소" },
            { hanja: "回", meaning: "돌 회" },
            { hanja: "園", meaning: "동산 원" },
            { hanja: "中", meaning: "가운데 중" },
            { hanja: "半", meaning: "반 반" },
            { hanja: "犬", meaning: "개 견" },
            { hanja: "尤", meaning: "더욱 우" },
            { hanja: "迎", meaning: "맞이할 영" },
            { hanja: "追", meaning: "쫓을 추" },
        ],
    },
    {
        id: 2,
        symbol: "二",
        price: 250,
        color: "#16a06a",
        background: "#e8f8f1",
        words: [
            { hanja: "自", meaning: "스스로 자" },
            { hanja: "然", meaning: "그러할 연" },
            { hanja: "物", meaning: "물건 물" },
            { hanja: "月", meaning: "달 월" },
            { hanja: "山", meaning: "메 산" },
            { hanja: "上", meaning: "위 상" },
            { hanja: "下", meaning: "아래 하" },
            { hanja: "魚", meaning: "물고기 어" },
            { hanja: "手", meaning: "손 수" },
            { hanja: "足", meaning: "발 족" },
            { hanja: "要", meaning: "중요할 요" },
            { hanja: "素", meaning: "흰, 본디 소" },
            { hanja: "形", meaning: "모양 형" },
            { hanja: "音", meaning: "소리 음" },
            { hanja: "義", meaning: "뜻, 옳을 의" },
            { hanja: "柳", meaning: "버드나무 류" },
            { hanja: "花", meaning: "꽃 화" },
            { hanja: "松", meaning: "소나무 송" },
            { hanja: "栽", meaning: "심을 재" },
            { hanja: "植", meaning: "심을 식" },
            { hanja: "朱", meaning: "붉을 주" },
            { hanja: "印", meaning: "도장 인" },
            { hanja: "枝", meaning: "가지 지" },
            { hanja: "葉", meaning: "잎 엽" },
            { hanja: "願", meaning: "원할 원" },
            { hanja: "淨", meaning: "깨끗할 정" },
            { hanja: "招", meaning: "부를 초" },
            { hanja: "鳴", meaning: "울 명" },
            { hanja: "鐘", meaning: "쇠북 종" },
            { hanja: "果", meaning: "과실, 과연 과" },
            { hanja: "當", meaning: "마땅할 당" },
            { hanja: "後", meaning: "뒤 후" },
            { hanja: "巖", meaning: "바위 암" },
            { hanja: "高", meaning: "높을 고" },
            { hanja: "造", meaning: "지을 조" },
            { hanja: "運", meaning: "움직일 운" },
            { hanja: "動", meaning: "움직일 동" },
            { hanja: "記", meaning: "적을 기" },
            { hanja: "號", meaning: "부를 호" },
            { hanja: "吉", meaning: "길할 길" },
            { hanja: "凶", meaning: "흉할 흉" },
        ],
    },
    {
        id: 3,
        symbol: "三",
        price: 500,
        color: "#e58a12",
        background: "#fff4df",
        words: [
            { hanja: "父", meaning: "아버지 부" },
            { hanja: "母", meaning: "어머니 모" },
            { hanja: "祖", meaning: "할아버지 조" },
            { hanja: "孫", meaning: "손자 손" },
            { hanja: "家", meaning: "집 가" },
            { hanja: "族", meaning: "겨레 족" },
            { hanja: "結", meaning: "맺을 결" },
            { hanja: "婚", meaning: "혼인할 혼" },
            { hanja: "男", meaning: "사내 남" },
            { hanja: "多", meaning: "많을 다" },
            { hanja: "感", meaning: "느낄 감" },
            { hanja: "兄", meaning: "맏 형" },
            { hanja: "弟", meaning: "아우 제" },
            { hanja: "姉", meaning: "손윗누이 자" },
            { hanja: "妹", meaning: "손아래 누이 매" },
            { hanja: "和", meaning: "화목할 화" },
            { hanja: "萬", meaning: "일만, 많을 만" },
            { hanja: "事", meaning: "일 사" },
            { hanja: "成", meaning: "이룰 성" },
            { hanja: "生", meaning: "날, 살 생" },
            { hanja: "活", meaning: "살 활" },
            { hanja: "業", meaning: "일 업" },
            { hanja: "婦", meaning: "며느리, 아내 부" },
            { hanja: "夫", meaning: "남편 부" },
            { hanja: "姓", meaning: "성씨 성" },
            { hanja: "名", meaning: "이름 명" },
            { hanja: "妻", meaning: "아내 처" },
            { hanja: "賢", meaning: "어질 현" },
            { hanja: "良", meaning: "어질 량" },
            { hanja: "親", meaning: "친할, 어버이 친" },
            { hanja: "叔", meaning: "아저씨 숙" },
            { hanja: "童", meaning: "아이 동" },
            { hanja: "皇", meaning: "임금 황" },
            { hanja: "太", meaning: "클 태" },
            { hanja: "必", meaning: "반드시 필" },
            { hanja: "須", meaning: "모름지기 수" },
            { hanja: "文", meaning: "글월 문" },
            { hanja: "章", meaning: "글 장" },
            { hanja: "分", meaning: "나눌 분" },
            { hanja: "蟲", meaning: "벌레 충" },
            { hanja: "寸", meaning: "마디 촌" },
            { hanja: "數", meaning: "셈 수" },
            { hanja: "血", meaning: "피 혈" },
            { hanja: "緣", meaning: "인연 연" },
        ],
    },
    {
        id: 4,
        symbol: "四",
        price: 850,
        color: "#e54882",
        background: "#fff0f5",
        words: [
            { hanja: "時", meaning: "때 시" },
            { hanja: "間", meaning: "사이 간" },
            { hanja: "出", meaning: "날 출" },
            { hanja: "午", meaning: "낮, 일곱째 지지 오" },
            { hanja: "前", meaning: "앞 전" },
            { hanja: "登", meaning: "오를 등" },
            { hanja: "校", meaning: "학교 교" },
            { hanja: "受", meaning: "받을 수" },
            { hanja: "正", meaning: "바를 정" },
            { hanja: "讀", meaning: "읽을 독" },
            { hanja: "書", meaning: "글, 책 서" },
            { hanja: "歸", meaning: "돌아갈 귀" },
            { hanja: "守", meaning: "지킬 수" },
            { hanja: "備", meaning: "갖출 비" },
            { hanja: "完", meaning: "완전할 완" },
            { hanja: "宇", meaning: "집 우" },
            { hanja: "宙", meaning: "집 주" },
            { hanja: "共", meaning: "함께 공" },
            { hanja: "永", meaning: "길 영" },
            { hanja: "再", meaning: "다시 재" },
            { hanja: "課", meaning: "매길, 과정 과" },
            { hanja: "就", meaning: "나아갈 취" },
            { hanja: "頂", meaning: "정수리 정" },
            { hanja: "載", meaning: "실을 재" },
            { hanja: "場", meaning: "마당 장" },
            { hanja: "干", meaning: "방패 간" },
            { hanja: "支", meaning: "가지 지" },
            { hanja: "甲", meaning: "갑옷, 첫째 천간 갑" },
            { hanja: "乙", meaning: "새, 둘째 천간 을" },
            { hanja: "丙", meaning: "셋째 천간 병" },
            { hanja: "丁", meaning: "넷째 천간 정" },
            { hanja: "戊", meaning: "다섯째 천간 무" },
            { hanja: "己", meaning: "몸, 여섯째 천간 기" },
            { hanja: "庚", meaning: "일곱째 천간 경" },
            { hanja: "辛", meaning: "매울, 여덟째 천간 신" },
            { hanja: "壬", meaning: "아홉째 천간 임" },
            { hanja: "癸", meaning: "열째 천간 계" },
            { hanja: "丑", meaning: "둘째 지지 축" },
            { hanja: "寅", meaning: "셋째 지지 인" },
            { hanja: "卯", meaning: "넷째 지지 묘" },
            { hanja: "辰", meaning: "별, 다섯째 지지 진" },
            { hanja: "巳", meaning: "여섯째 지지 사" },
            { hanja: "未", meaning: "아닐, 여덟째 지지 미" },
            { hanja: "申", meaning: "아홉째 지지 신" },
            { hanja: "酉", meaning: "닭, 열째 지지 유" },
            { hanja: "戌", meaning: "열한째 지지 술" },
            { hanja: "亥", meaning: "열두째 지지 해" },
        ],
    },
    {
        id: 5,
        symbol: "五",
        price: 1200,
        color: "#8b5cf6",
        background: "#f3efff",
        words: [
            { hanja: "百", meaning: "일백 백" },
            { hanja: "發", meaning: "필 발" },
            { hanja: "九", meaning: "아홉 구" },
            { hanja: "牛", meaning: "소 우" },
            { hanja: "一", meaning: "하나 일" },
            { hanja: "毛", meaning: "털 모" },
            { hanja: "石", meaning: "돌 석" },
            { hanja: "七", meaning: "일곱 칠" },
            { hanja: "顚", meaning: "넘어질 전" },
            { hanja: "八", meaning: "여덟 팔" },
            { hanja: "起", meaning: "일어날 기" },
            { hanja: "千", meaning: "일천 천" },
            { hanja: "苦", meaning: "쓸 고" },
            { hanja: "聞", meaning: "들을 문" },
            { hanja: "知", meaning: "알 지" },
            { hanja: "的", meaning: "과녁 적" },
            { hanja: "億", meaning: "억 억" },
            { hanja: "兆", meaning: "조짐, 조 조" },
            { hanja: "房", meaning: "방 방" },
            { hanja: "四", meaning: "넷 사" },
            { hanja: "友", meaning: "벗 우" },
            { hanja: "作", meaning: "지을 작" },
            { hanja: "三", meaning: "셋 삼" },
            { hanja: "艸", meaning: "풀 초" },
            { hanja: "杯", meaning: "잔 배" },
            { hanja: "茂", meaning: "무성할 무" },
            { hanja: "盛", meaning: "성할 성" },
            { hanja: "針", meaning: "바늘 침" },
            { hanja: "樹", meaning: "나무 수" },
            { hanja: "菜", meaning: "나물 채" },
            { hanja: "食", meaning: "먹을 식" },
            { hanja: "草", meaning: "풀 초" },
            { hanja: "甘", meaning: "달 감" },
            { hanja: "化", meaning: "화할 화" },
            { hanja: "麥", meaning: "보리 맥" },
            { hanja: "飯", meaning: "밥 반" },
            { hanja: "皮", meaning: "가죽 피" },
            { hanja: "興", meaning: "일어날 흥" },
            { hanja: "角", meaning: "뿔 각" },
            { hanja: "立", meaning: "설 립" },
            { hanja: "性", meaning: "성품 성" },
            { hanja: "五", meaning: "다섯 오" },
            { hanja: "六", meaning: "여섯 륙" },
        ],
    },
];

const state = {
    lesson: null,
    quizAttemptId: "",
    mode: "ordered",
    direction: profile.defaultDirection,
    questions: [],
    answerOptions: [],
    currentIndex: 0,
    correctCount: 0,
    wrongAnswers: [],
    streak: 0,
    pointsEarned: 0,
    answered: false,
    isStartingQuiz: false,
    isSubmittingAnswer: false,
    canSwipeNext: false,
    isAdvancing: false,
    pendingPurchaseLessonId: null,
    wordPreviewIndex: 0,
    shopView: "store",
};

const elements = {
    themeColor: document.querySelector("#theme-color"),
    screens: document.querySelectorAll(".screen"),
    loginForm: document.querySelector("#login-form"),
    username: document.querySelector("#username"),
    password: document.querySelector("#password"),
    passwordToggle: document.querySelector("#password-toggle"),
    loginError: document.querySelector("#login-error"),
    loginSubmitButton: document.querySelector("#login-submit-button"),
    signupButton: document.querySelector("#signup-button"),
    inviteForm: document.querySelector("#invite-form"),
    inviteCodeInput: document.querySelector("#invite-code-input"),
    inviteError: document.querySelector("#invite-error"),
    inviteSubmitButton: document.querySelector("#invite-submit-button"),
    inviteLogoutButton: document.querySelector("#invite-logout-button"),
    logoutButton: document.querySelector("#logout-button"),
    screenLinkButtons: document.querySelectorAll("[data-screen-link]"),
    profileAvatar: document.querySelector("#profile-avatar"),
    homeProfileName: document.querySelector("#home-profile-name"),
    homeLevel: document.querySelector("#home-level"),
    homePoints: document.querySelector("#home-points"),
    levelUpButton: document.querySelector("#level-up-button"),
    levelUpCost: document.querySelector("#level-up-cost"),
    attendanceStatus: document.querySelector("#attendance-status"),
    attendanceButton: document.querySelector("#attendance-button"),
    settingsPoints: document.querySelector("#settings-points"),
    settingsLevel: document.querySelector("#settings-level"),
    unlockedCount: document.querySelector("#unlocked-count"),
    unlockGuideTitle: document.querySelector("#unlock-guide-title"),
    unlockGuideText: document.querySelector("#unlock-guide-text"),
    lessonList: document.querySelector("#lesson-list"),
    modeLessonLabel: document.querySelector("#mode-lesson-label"),
    lessonSymbol: document.querySelector("#lesson-symbol"),
    backButtons: document.querySelectorAll("[data-back]"),
    modeButtons: document.querySelectorAll("[data-mode]"),
    viewWordsButton: document.querySelector("#view-words-button"),
    viewWordsTitle: document.querySelector("#view-words-title"),
    wordsLessonSymbol: document.querySelector("#words-lesson-symbol"),
    wordsLessonLabel: document.querySelector("#words-lesson-label"),
    wordsCount: document.querySelector("#words-count"),
    lessonWordsList: document.querySelector("#lesson-words-list"),
    quizScreen: document.querySelector("#quiz-screen"),
    quizContent: document.querySelector(".quiz-content"),
    quitQuizButton: document.querySelector("#quit-quiz-button"),
    progressBar: document.querySelector("#progress-bar"),
    quizCount: document.querySelector("#quiz-count"),
    quizGuide: document.querySelector("#quiz-guide"),
    quizPrompt: document.querySelector("#quiz-prompt"),
    quizHint: document.querySelector("#quiz-hint"),
    answerList: document.querySelector("#answer-list"),
    typingAnswerForm: document.querySelector("#typing-answer-form"),
    typingAnswerInput: document.querySelector("#typing-answer-input"),
    typingAnswerButton: document.querySelector("#typing-answer-button"),
    swipeHint: document.querySelector("#swipe-hint"),
    streakFire: document.querySelector("#streak-fire"),
    streakMessage: document.querySelector("#streak-message"),
    streakNextReward: document.querySelector("#streak-next-reward"),
    quizStreak: document.querySelector("#quiz-streak"),
    quizPointsEarned: document.querySelector("#quiz-points-earned"),
    currentReward: document.querySelector("#current-reward"),
    resultMessage: document.querySelector("#result-message"),
    scorePercent: document.querySelector("#score-percent"),
    correctCount: document.querySelector("#correct-count"),
    totalCount: document.querySelector("#total-count"),
    resultPointsEarned: document.querySelector("#result-points-earned"),
    resultTotalPoints: document.querySelector("#result-total-points"),
    wrongAnswerSection: document.querySelector("#wrong-answer-section"),
    wrongAnswerCount: document.querySelector("#wrong-answer-count"),
    wrongAnswerList: document.querySelector("#wrong-answer-list"),
    retryButton: document.querySelector("#retry-button"),
    resultHomeButton: document.querySelector("#result-home-button"),
    themeButtons: document.querySelectorAll("[data-theme-option]"),
    defaultDirectionButtons: document.querySelectorAll(
        "[data-default-direction]",
    ),
    profileNameForm: document.querySelector("#profile-name-form"),
    profileNameInput: document.querySelector("#profile-name-input"),
    adminInvitePanel: document.querySelector("#admin-invite-panel"),
    currentInviteCode: document.querySelector("#current-invite-code"),
    refreshInviteCodeButton: document.querySelector("#refresh-invite-code-button"),
    myRank: document.querySelector("#my-rank"),
    myRankSummary: document.querySelector("#my-rank-summary"),
    leaderboardList: document.querySelector("#leaderboard-list"),
    shopPoints: document.querySelector("#shop-points"),
    shopOwnedCount: document.querySelector("#shop-owned-count"),
    shopEquippedName: document.querySelector("#shop-equipped-name"),
    shopItemList: document.querySelector("#shop-item-list"),
    shopInventoryList: document.querySelector("#shop-inventory-list"),
    shopViewButtons: document.querySelectorAll("[data-shop-view]"),
    shopStorePanel: document.querySelector("#shop-store-panel"),
    shopInventoryPanel: document.querySelector("#shop-inventory-panel"),
    purchaseModal: document.querySelector("#purchase-modal"),
    purchaseSymbol: document.querySelector("#purchase-symbol"),
    purchaseTitle: document.querySelector("#purchase-title"),
    purchaseDescription: document.querySelector("#purchase-description"),
    purchaseCost: document.querySelector("#purchase-cost"),
    purchaseBalance: document.querySelector("#purchase-balance"),
    confirmPurchaseButton: document.querySelector(
        "#confirm-purchase-button",
    ),
    closePurchaseButtons: document.querySelectorAll("[data-close-purchase]"),
    attendanceModal: document.querySelector("#attendance-modal"),
    attendanceModalButton: document.querySelector(
        "#attendance-modal-button",
    ),
    closeAttendanceButtons: document.querySelectorAll(
        "[data-close-attendance]",
    ),
    wordPreviewModal: document.querySelector("#word-preview-modal"),
    closeWordPreviewButton: document.querySelector(
        "#close-word-preview-button",
    ),
    wordPreviewLesson: document.querySelector("#word-preview-lesson"),
    wordPreviewCount: document.querySelector("#word-preview-count"),
    wordPreviewStage: document.querySelector("#word-preview-stage"),
    wordPreviewOrder: document.querySelector("#word-preview-order"),
    wordPreviewHanja: document.querySelector("#word-preview-hanja"),
    wordPreviewMeaning: document.querySelector("#word-preview-meaning"),
    previousWordButton: document.querySelector("#previous-word-button"),
    nextWordButton: document.querySelector("#next-word-button"),
    appToast: document.querySelector("#app-toast"),
};

function getResolvedTheme(theme = profile.theme) {
    return theme === "dark" ? "dark" : "light";
}

function applyTheme() {
    const resolvedTheme = getResolvedTheme();
    document.documentElement.dataset.theme = resolvedTheme;
    elements.themeColor.content =
        resolvedTheme === "dark" ? "#11131a" : "#f5f6fb";
}

function isLessonUnlocked(lessonId) {
    return profile.unlockedLessons.includes(lessonId);
}

function canPurchaseLesson(lessonId) {
    return lessonId > 1 && isLessonUnlocked(lessonId - 1);
}

function getNextLockedLesson() {
    return lessons.find((lesson) => !isLessonUnlocked(lesson.id)) || null;
}

function getTodayKey(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function getLevelUpCost(level = profile.level) {
    return 300 + (level - 1) * 200;
}

function areAllLessonsUnlocked() {
    return lessons.every((lesson) => isLessonUnlocked(lesson.id));
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getShopItem(itemId = profile.equippedShopItem) {
    return shopItems.find((item) => item.id === itemId) || DEFAULT_SHOP_ITEM;
}

function isShopItemOwned(itemId) {
    return profile.ownedShopItems.includes(itemId);
}

function getPreviousShopItem(itemId) {
    const itemIndex = shopItems.findIndex((item) => item.id === itemId);
    return itemIndex > 0 ? shopItems[itemIndex - 1] : null;
}

function hasShopPurchasePrerequisite(itemId) {
    const previousItem = getPreviousShopItem(itemId);
    return !previousItem || isShopItemOwned(previousItem.id);
}

function getEquippedShopSkinClass() {
    return getShopItem(profile.equippedShopItem).skinClass;
}

function getEquippedLeaderboardSkinClass() {
    return profile.equippedShopItem === DEFAULT_SHOP_ITEM_ID
        ? ""
        : getEquippedShopSkinClass();
}

function getAdvancedSkinEffectMarkup(itemId, rootClass = "skin-effects") {
    switch (itemId) {
        case "azure-singularity":
            return `<span class="${rootClass} green-effects" aria-hidden="true"><span class="effect-fill"></span><span class="botanical-vine"></span><span class="botanical-leaf leaf-one"></span><span class="botanical-leaf leaf-two"></span><span class="botanical-leaf leaf-three"></span><span class="botanical-leaf leaf-four"></span><span class="botanical-seed seed-a"></span><span class="botanical-seed seed-b"></span><span class="botanical-bloom">✦</span></span>`;
        case "cobalt-tide":
            return `<span class="${rootClass} blue-effects" aria-hidden="true"><span class="effect-fill"></span><span class="ocean-current current-a"></span><span class="ocean-current current-b"></span><span class="ocean-foam foam-a"></span><span class="ocean-foam foam-b"></span><span class="ocean-foam foam-c"></span></span>`;
        case "indigo-depth":
            return `<span class="${rootClass} indigo-effects" aria-hidden="true"><span class="effect-fill"></span><span class="depth-beam"></span><span class="depth-caustic"></span><span class="crystal-shard shard-a"></span><span class="crystal-shard shard-b"></span><span class="crystal-shard shard-c"></span><span class="crystal-shard shard-d"></span><span class="crystal-glint glint-a">✦</span><span class="crystal-glint glint-b">·</span></span>`;
        case "violet-orbit":
            return `<span class="${rootClass} purple-effects" aria-hidden="true"><span class="effect-fill"></span><span class="violet-portal"></span><span class="violet-orbit"></span><span class="violet-spark spark-a">✦</span><span class="violet-spark spark-b">✧</span><span class="violet-spark spark-c">·</span></span>`;
        case "prism-crown":
            return `<span class="${rootClass} rainbow-effects" aria-hidden="true"><span class="effect-fill"></span><span class="legend-beam beam-a"></span><span class="legend-beam beam-b"></span><span class="legend-beam beam-c"></span><span class="legend-crown"></span><span class="legend-core"></span><span class="legend-star star-a">✦</span><span class="legend-star star-b">✧</span><span class="legend-star star-c">✦</span><span class="legend-star star-d">◆</span></span>`;
        default:
            return "";
    }
}

function getShopSkinEffectMarkup(itemId) {
    return getAdvancedSkinEffectMarkup(itemId, "shop-title-effects");
}


function getLeaderboardSkinEffectMarkup(itemId) {
    switch (itemId) {
        case "ember-ring":
        case "violet-nebula":
            return "";
        case "crimson-nova":
            return `<span class="skin-effects yellow-effects" aria-hidden="true"><span class="effect-fill"></span><span class="effect-chip chip-a">★</span><span class="effect-chip chip-b">✦</span><span class="effect-chip chip-c">✧</span><span class="effect-chip chip-d">★</span></span>`;
        case "azure-singularity":
            return getAdvancedSkinEffectMarkup(itemId);
        case "cobalt-tide":
        case "indigo-depth":
        case "violet-orbit":
        case "prism-crown":
            return getAdvancedSkinEffectMarkup(itemId);
        default:
            return "";
    }
}

function getLeaderboardSkinBadgeMarkup(item) {
    if (!item || item.id === DEFAULT_SHOP_ITEM_ID) {
        return "";
    }

    return `<span class="rank-skin-badge ${item.skinClass}">${escapeHTML(item.name)}</span>`;
}

function setAvatarSkin(element, itemId = profile.equippedShopItem) {
    if (!element) {
        return;
    }

    [DEFAULT_SHOP_ITEM, ...shopItems].forEach((item) => {
        element.classList.remove(item.skinClass);
    });
    element.classList.add(getShopItem(itemId).skinClass);
}

function renderShop() {
    const equippedItem = getShopItem();
    const profileInitial = escapeHTML(profile.displayName.trim().charAt(0) || "한");
    const ownedShopItemCount = shopItems.filter((item) =>
        isShopItemOwned(item.id),
    ).length;

    elements.shopPoints.textContent = Math.floor(profile.points);
    elements.shopOwnedCount.textContent = `${ownedShopItemCount}/${shopItems.length}`;
    elements.shopEquippedName.textContent = equippedItem.name;
    elements.shopViewButtons.forEach((button) => {
        const isSelected = button.dataset.shopView === state.shopView;
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-selected", String(isSelected));
    });
    elements.shopStorePanel.hidden = state.shopView !== "store";
    elements.shopInventoryPanel.hidden = state.shopView !== "inventory";
    elements.shopItemList.innerHTML = shopItems
        .map((item) => {
            const isOwned = isShopItemOwned(item.id);
            const previousItem = getPreviousShopItem(item.id);
            const hasPrerequisite = hasShopPurchasePrerequisite(item.id);
            const canAfford = profile.points >= item.price;
            const isDisabled = isOwned || !hasPrerequisite || !canAfford;
            const buttonText = isOwned
                ? "구매 완료"
                : !hasPrerequisite
                  ? "잠금"
                  : canAfford
                    ? `${item.price}P 구매`
                    : `${item.price - profile.points}P 부족`;

            return `
                <article class="shop-item-card store ${item.skinClass} ${item.id === "prism-crown" ? "featured" : ""} ${isOwned ? "owned" : ""}" style="--item-accent: ${item.accent};">
                    ${getShopSkinEffectMarkup(item.id)}
                    <span class="shop-item-rank">${item.rank}</span>
                    <span class="shop-item-icon ${item.skinClass}" aria-hidden="true">${profileInitial}</span>
                    <span class="shop-item-copy">
                        <strong>${escapeHTML(item.name)}</strong>
                        <small>${escapeHTML(item.summary)}</small>
                    </span>
                    <span class="shop-item-meta">
                        <b>${item.price}P</b>
                    </span>
                    <button class="shop-item-action" type="button" data-shop-item-id="${item.id}" data-shop-action="purchase" ${isDisabled ? "disabled" : ""}>${buttonText}</button>
                </article>
            `;
        })
        .join("");

    const inventoryItems = [
        DEFAULT_SHOP_ITEM,
        ...shopItems.filter((item) => isShopItemOwned(item.id)),
    ];
    elements.shopInventoryList.innerHTML = inventoryItems
        .map((item) => {
            const isDefaultItem = item.id === DEFAULT_SHOP_ITEM_ID;
            const isEquipped = profile.equippedShopItem === item.id;
            const action = isEquipped
                ? isDefaultItem
                    ? "equipped"
                    : "unequip"
                : "equip";
            const buttonText = isEquipped
                ? isDefaultItem
                    ? "기본 사용 중"
                    : "사용 안함"
                : isDefaultItem
                  ? "기본으로"
                  : "사용";

            return `
                <article class="shop-item-card inventory ${item.skinClass} ${isEquipped ? "equipped" : ""}" style="--item-accent: ${item.accent};">
                    <span class="shop-item-rank">${isDefaultItem ? "-" : item.rank}</span>
                    <span class="shop-item-icon ${item.skinClass}" aria-hidden="true">${profileInitial}</span>
                    <span class="shop-item-copy">
                        <strong>${escapeHTML(item.name)}</strong>
                        <small>${escapeHTML(item.summary)}</small>
                    </span>
                    <span class="shop-item-meta">
                        <em>${isEquipped ? "사용 중" : "보유"}</em>
                        <b>${isDefaultItem ? "기본" : `${item.rank}단계`}</b>
                    </span>
                    <button class="shop-item-action inventory-action ${isEquipped ? "is-equipped" : ""}" type="button" data-shop-item-id="${item.id}" data-shop-action="${action}" ${action === "equipped" ? "disabled" : ""}>${buttonText}</button>
                </article>
            `;
        })
        .join("");
}

function setShopActionsBusy(isBusy) {
    [elements.shopItemList, elements.shopInventoryList].forEach((list) => {
        list.querySelectorAll("button").forEach((button) => {
            button.disabled = isBusy || button.dataset.shopAction === "equipped";
        });
    });
}

function setShopView(view) {
    state.shopView = view === "inventory" ? "inventory" : "store";
    renderShop();
}

async function purchaseShopItem(itemId) {
    const item = getShopItem(itemId);
    const previousItem = getPreviousShopItem(item.id);

    if (isShopItemOwned(item.id)) {
        state.shopView = "inventory";
        renderShop();
        showToast("이미 보유 중이에요. 보관함에서 사용할 수 있어요.");
        return;
    }

    if (previousItem && !isShopItemOwned(previousItem.id)) {
        showToast(`${previousItem.name} 칭호를 먼저 구매해 주세요.`);
        renderShop();
        return;
    }

    if (isShopPreviewMode()) {
        profile.points = Math.max(0, profile.points - item.price);
        profile.ownedShopItems = Array.from(
            new Set([...profile.ownedShopItems, item.id]),
        );
        saveProfile();
        updateProfileUI();
        renderShop();
        showToast(`${item.name} 구매 완료!`);
        return;
    }


    if (!supabaseClient || !currentUser) {
        showToast("로그인 상태를 다시 확인해 주세요.");
        return;
    }

    setShopActionsBusy(true);
    const { data, error } = await supabaseClient.rpc("purchase_shop_item", {
        item_id_input: item.id,
    });

    if (error) {
        console.error("shop purchase failed", error);
        if (errorIncludes(error, "insufficient_points")) {
            showToast("서버 기준으로 포인트가 부족해요.");
        } else if (errorIncludes(error, "shop_previous_item_required")) {
            showToast(`${previousItem?.name || "이전"} 칭호를 먼저 구매해 주세요.`);
        } else if (errorIncludes(error, "shop_item_already_owned")) {
            await loadRemoteProfile();
            showToast("이미 보유한 아이템이에요.");
        } else {
            showToast("상점 구매를 완료하지 못했어요.");
        }
        updateProfileUI();
        renderShop();
        return;
    }

    applyServerProfile(data);
    updateProfileUI();
    renderShop();
    renderLeaderboard();
    showToast(`${item.name} 구매 완료!`);
}

async function equipShopItem(itemId) {
    const item = getShopItem(itemId);

    if (profile.equippedShopItem === item.id) {
        renderShop();
        return;
    }

    if (isShopPreviewMode()) {
        if (!isShopItemOwned(item.id)) {
            showToast("먼저 구매해야 사용할 수 있어요.");
            return;
        }
        profile.equippedShopItem = item.id;
        saveProfile();
        updateProfileUI();
        renderShop();
        renderLeaderboard();
        showToast(
            item.id === DEFAULT_SHOP_ITEM_ID
                ? "효과를 사용하지 않아요."
                : `${item.name} 사용 중!`,
        );
        return;
    }

    if (!supabaseClient || !currentUser) {
        showToast("로그인 상태를 다시 확인해 주세요.");
        return;
    }

    setShopActionsBusy(true);
    const { data, error } = await supabaseClient.rpc("equip_shop_item", {
        item_id_input: item.id,
    });

    if (error) {
        console.error("shop equip failed", error);
        showToast(
            errorIncludes(error, "shop_item_not_owned")
                ? "먼저 구매해야 장착할 수 있어요."
                : "아이템을 장착하지 못했어요.",
        );
        updateProfileUI();
        renderShop();
        return;
    }

    applyServerProfile(data);
    updateProfileUI();
    renderShop();
    renderLeaderboard();
    showToast(`${item.name} 장착 완료!`);
}

function handleShopItemAction(event) {
    const button = event.target.closest("[data-shop-item-id]");

    if (!button || button.disabled) {
        return;
    }

    const itemId = button.dataset.shopItemId;

    if (button.dataset.shopAction === "purchase") {
        void purchaseShopItem(itemId);
        return;
    }

    if (button.dataset.shopAction === "equip") {
        void equipShopItem(itemId);
        return;
    }

    if (button.dataset.shopAction === "unequip") {
        void equipShopItem(DEFAULT_SHOP_ITEM_ID);
    }
}

function getLeaderboardEntries() {
    const entries = remoteLeaderboardEntries.length
        ? remoteLeaderboardEntries.map((entry) => ({ ...entry }))
        : [];

    if (!entries.some((entry) => entry.isCurrent)) {
        entries.push({
            name: profile.displayName,
            level: profile.level,
            points: profile.points,
            equippedShopItem: profile.equippedShopItem,
            isCurrent: true,
        });
    }

    return entries.sort(
        (first, second) =>
            second.level - first.level ||
            second.points - first.points ||
            first.name.localeCompare(second.name, "ko"),
    );
}

function renderLeaderboard() {
    const entries = getLeaderboardEntries();
    const currentIndex = entries.findIndex((entry) => entry.isCurrent);

    elements.myRank.textContent = currentIndex >= 0 ? currentIndex + 1 : "-";
    elements.myRankSummary.textContent = `레벨 ${profile.level} · ${profile.points}P`;
    elements.leaderboardList.innerHTML = entries
        .map((entry, index) => {
            const rank = index + 1;
            const medal = rank <= 3 ? ["gold", "silver", "bronze"][index] : "";
            const safeName = escapeHTML(entry.name);
            const initial = escapeHTML(entry.name.trim().charAt(0) || "한");
            const equippedItem = getShopItem(entry.equippedShopItem);
            const hasEquippedSkin = Boolean(
                equippedItem && equippedItem.id !== DEFAULT_SHOP_ITEM_ID,
            );
            const rowClass = [
                entry.isCurrent ? "me" : "",
                hasEquippedSkin ? equippedItem.skinClass : "",
            ]
                .filter(Boolean)
                .join(" ");
            const skinEffects = hasEquippedSkin
                ? getLeaderboardSkinEffectMarkup(equippedItem.id)
                : "";
            const skinBadge = hasEquippedSkin
                ? getLeaderboardSkinBadgeMarkup(equippedItem)
                : "";

            return `
                <article class="leaderboard-row ${rowClass}">
                    ${skinEffects}
                    <span class="rank-number ${medal}">${rank}</span>
                    <span class="rank-avatar ${equippedItem.skinClass}" aria-hidden="true">${initial}</span>
                    <span class="rank-user">
                        <strong><span class="rank-name-text">${safeName}</span>${skinBadge}${entry.isCurrent ? " <em>나</em>" : ""}</strong>
                        <small>${entry.points}P 보유</small>
                    </span>
                    <span class="rank-level">Lv.${entry.level}</span>
                </article>
            `;
        })
        .join("");
}

async function refreshLeaderboard() {
    if (!supabaseClient || !currentUser) {
        renderLeaderboard();
        return;
    }

    const { data, error } = await supabaseClient.rpc("get_leaderboard", {
        limit_count: 50,
    });

    if (error) {
        console.error("leaderboard load failed", error);
        remoteLeaderboardEntries = [];
        renderLeaderboard();
        return;
    }

    remoteLeaderboardEntries = (data || []).map((entry) => ({
        name: entry.display_name || DEFAULT_PROFILE.displayName,
        level: Math.max(1, Number(entry.level) || 1),
        points: Math.max(0, Number(entry.points) || 0),
        equippedShopItem:
            typeof entry.equipped_shop_item === "string"
                ? entry.equipped_shop_item
                : DEFAULT_SHOP_ITEM_ID,
        isCurrent: Boolean(entry.is_current),
    }));
    renderLeaderboard();
}

function updateProfileUI() {
    const points = Math.floor(profile.points);
    const unlockedTotal = lessons.filter((lesson) =>
        isLessonUnlocked(lesson.id),
    ).length;
    const nextLesson = getNextLockedLesson();
    const today = getTodayKey();
    const attendanceClaimed = profile.lastAttendanceDate === today;
    const levelUpCost = getLevelUpCost();
    const allLessonsUnlocked = areAllLessonsUnlocked();
    const equippedShopItem = getShopItem();

    elements.profileAvatar.textContent =
        profile.displayName.trim().charAt(0) || "한";
    setAvatarSkin(elements.profileAvatar);
    elements.homeProfileName.textContent = profile.displayName;
    elements.homeLevel.textContent = profile.level;
    elements.homePoints.textContent = points;
    elements.settingsPoints.textContent = points;
    elements.settingsLevel.textContent = profile.level;
    elements.unlockedCount.textContent = `${unlockedTotal}/${lessons.length}과 열림`;
    elements.resultTotalPoints.textContent = `${points}P`;
    elements.shopPoints.textContent = points;
    elements.shopOwnedCount.textContent = `${shopItems.filter((item) => isShopItemOwned(item.id)).length}/${shopItems.length}`;
    elements.shopEquippedName.textContent = equippedShopItem.name;
    elements.profileNameInput.value = profile.displayName;

    elements.attendanceButton.disabled = attendanceClaimed;
    elements.attendanceButton.textContent = attendanceClaimed
        ? "받기 완료"
        : "100P 받기";
    elements.attendanceStatus.textContent = attendanceClaimed
        ? `출석 ${profile.attendanceCount}일째 · 오늘 보상을 받았어요.`
        : `출석 ${profile.attendanceCount}일째 · 오늘 100P를 받을 수 있어요.`;

    elements.levelUpButton.disabled =
        !allLessonsUnlocked || points < levelUpCost;
    elements.levelUpCost.textContent = allLessonsUnlocked
        ? `${levelUpCost}P`
        : "전 단원 해금 후";

    if (!nextLesson) {
        elements.unlockGuideTitle.textContent = "이제 레벨을 올려보세요";
        elements.unlockGuideText.textContent = `다음 레벨까지 ${Math.max(0, levelUpCost - points)}P가 필요해요.`;
        return;
    }

    if (canPurchaseLesson(nextLesson.id)) {
        const missingPoints = Math.max(0, nextLesson.price - points);
        elements.unlockGuideTitle.textContent = `${nextLesson.id}과 잠금 해제까지 ${missingPoints}P`;
        elements.unlockGuideText.textContent =
            missingPoints === 0
                ? `${nextLesson.price}P가 모였어요. 지금 새 단원을 열 수 있어요.`
                : `정답과 연속 보너스로 ${nextLesson.price}P를 모아보세요.`;
        return;
    }

    elements.unlockGuideTitle.textContent = "앞 단원부터 차근차근";
    elements.unlockGuideText.textContent = `${nextLesson.id - 1}과를 먼저 열면 다음 단원을 구매할 수 있어요.`;
}

function syncSettingsUI() {
    elements.themeButtons.forEach((button) => {
        const isSelected = button.dataset.themeOption === profile.theme;
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
    elements.defaultDirectionButtons.forEach((button) => {
        const isSelected =
            button.dataset.defaultDirection === profile.defaultDirection;
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
}

let toastTimer = null;
let attendancePromptShown = false;

function showToast(message) {
    elements.appToast.textContent = message;
    elements.appToast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        elements.appToast.classList.remove("show");
    }, 2200);
}

function errorIncludes(error, code) {
    return String((error && error.message) || "")
        .toLowerCase()
        .includes(code.toLowerCase());
}

function canUseApp() {
    return inviteStatus.inviteApproved || inviteStatus.isAdmin;
}

function setInviteStatus(status = {}) {
    const source = Array.isArray(status) ? status[0] || {} : status || {};

    inviteStatus = {
        inviteApproved: Boolean(
            source.invite_approved ?? source.inviteApproved,
        ),
        isAdmin: Boolean(source.is_admin ?? source.isAdmin),
        currentCode:
            typeof (source.current_code ?? source.currentCode) === "string"
                ? source.current_code ?? source.currentCode
                : "",
    };
    renderInviteStatus();

    return inviteStatus;
}

function renderInviteStatus() {
    if (!elements.adminInvitePanel) {
        return;
    }

    elements.adminInvitePanel.hidden = !inviteStatus.isAdmin;
    elements.currentInviteCode.textContent = inviteStatus.currentCode || "확인 중";
}

async function refreshInviteStatus() {
    if (!supabaseClient || !currentUser) {
        return setInviteStatus();
    }

    const { data, error } = await supabaseClient.rpc("get_invite_status");

    if (error) {
        console.error("invite status load failed", error);
        showToast("접근 권한을 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
        return setInviteStatus();
    }

    return setInviteStatus(data);
}

function getInviteErrorMessage(error) {
    const message = String((error && error.message) || "").toLowerCase();

    if (message.includes("invalid_invite_code")) {
        return "초대코드가 맞지 않아요. 관리자에게 최신 코드를 다시 받아주세요.";
    }
    if (message.includes("profile_not_found")) {
        return "프로필을 찾지 못했어요. 다시 로그인해 주세요.";
    }

    return "초대코드를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

async function handleInviteSubmit(event) {
    event.preventDefault();

    const code = elements.inviteCodeInput.value.trim().toUpperCase();

    if (!code) {
        elements.inviteError.textContent = "초대코드를 입력해 주세요.";
        elements.inviteCodeInput.focus();
        return;
    }
    if (!supabaseClient || !currentUser) {
        elements.inviteError.textContent = "먼저 로그인해 주세요.";
        return;
    }

    elements.inviteSubmitButton.disabled = true;
    elements.inviteError.textContent = "";
    const { data, error } = await supabaseClient.rpc("claim_invite_code", {
        code_input: code,
    });
    elements.inviteSubmitButton.disabled = false;

    if (error) {
        elements.inviteError.textContent = getInviteErrorMessage(error);
        elements.inviteCodeInput.select();
        return;
    }

    setInviteStatus(data);
    elements.inviteCodeInput.value = "";
    showToast("초대코드가 확인됐어요.");
    showScreen("home");
}

async function refreshAdminInviteCode() {
    if (!inviteStatus.isAdmin) {
        return;
    }

    elements.refreshInviteCodeButton.disabled = true;
    await refreshInviteStatus();
    elements.refreshInviteCodeButton.disabled = false;
    showToast("초대코드를 새로 확인했어요.");
}

function isCoarsePointer() {
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}

function updateTypingViewportInset() {
    if (!window.visualViewport || !elements.quizScreen.classList.contains("typing-mode")) {
        return;
    }

    const visualHeight = Math.round(window.visualViewport.height);
    const inset = Math.max(
        0,
        window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop,
    );
    document.documentElement.style.setProperty(
        "--quiz-visual-height",
        `${visualHeight}px`,
    );
    document.documentElement.style.setProperty(
        "--quiz-keyboard-inset",
        `${Math.round(inset)}px`,
    );
}

function resetTypingViewportMetrics() {
    document.documentElement.style.removeProperty("--quiz-keyboard-inset");
    document.documentElement.style.removeProperty("--quiz-visual-height");
}

function setTypingKeyboardActive(isActive) {
    elements.quizScreen.classList.toggle("typing-keyboard-active", isActive);

    if (isActive) {
        updateTypingViewportInset();
    } else {
        resetTypingViewportMetrics();
    }
}

function stabilizeTypingViewport() {
    setTypingKeyboardActive(true);
    window.setTimeout(() => {
        updateTypingViewportInset();
        elements.quizContent.scrollTo({ top: 0, behavior: "auto" });
        window.scrollTo({ top: 0, behavior: "auto" });
    }, 120);
}

function releaseTypingInputFocus() {
    if (document.activeElement === elements.typingAnswerInput) {
        elements.typingAnswerInput.blur();
    }

    setTypingKeyboardActive(false);
    elements.quizContent.scrollTo({ top: 0, behavior: "auto" });
    window.scrollTo({ top: 0, behavior: "auto" });
}

function showScreen(name) {
    if (currentUser && !canUseApp() && name !== "invite" && name !== "login") {
        name = "invite";
    }

    if (name !== "quiz") {
        setTypingKeyboardActive(false);
        elements.quizScreen.classList.remove("typing-mode", "swipe-ready");
        elements.quizContent.classList.remove("typing-mode");
    }

    elements.screens.forEach((screen) => {
        screen.classList.toggle("active", screen.id === `${name}-screen`);
    });

    if (name === "home") {
        renderLessons();
        updateProfileUI();

        if (
            !attendancePromptShown &&
            profile.lastAttendanceDate !== getTodayKey()
        ) {
            window.setTimeout(openAttendanceModal, 180);
        }
    } else if (name === "shop") {
        updateProfileUI();
        renderShop();
    } else if (name === "settings") {
        updateProfileUI();
        syncSettingsUI();
    } else if (name === "leaderboard") {
        updateProfileUI();
        renderLeaderboard();
        void refreshLeaderboard();
    } else if (name === "invite") {
        renderInviteStatus();
        elements.inviteCodeInput.focus();
    }

    window.scrollTo({ top: 0, behavior: "auto" });
}

async function loadRemoteProfile() {
    const { data, error } = await supabaseClient.rpc("get_my_profile");

    if (error) {
        console.error("profile load failed", error);
        Object.assign(profile, normalizeProfile());
        saveProfile();
        elements.loginError.textContent =
            "보안 데이터베이스 설정을 불러오지 못했어요. 관리자에게 문의해 주세요.";
        return false;
    }

    applyServerProfile(data);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_LOGIN_STORAGE_KEY);
    sessionStorage.removeItem("hanja-login");
    return true;
}

async function activateSession(session) {
    if (!session || !session.user) {
        handleSignedOut();
        return;
    }

    const activationToken = ++authActivationToken;
    currentUser = session.user;
    const profileLoaded = await loadRemoteProfile();

    if (!profileLoaded) {
        showScreen("login");
        return;
    }

    await refreshInviteStatus();

    if (activationToken !== authActivationToken) {
        return;
    }

    applyTheme();
    syncSettingsUI();
    updateProfileUI();
    renderLessons();
    elements.loginError.textContent = "";
    elements.inviteError.textContent = "";
    elements.loginForm.reset();
    showScreen(canUseApp() ? "home" : "invite");
}

function handleSignedOut() {
    authActivationToken += 1;
    currentUser = null;
    remoteLeaderboardEntries = [];
    setInviteStatus();
    Object.assign(profile, normalizeProfile());
    state.lesson = null;
    state.quizAttemptId = "";
    attendancePromptShown = false;
    closeAttendanceModal();
    closePurchaseModal();
    closeWordPreview();
    applyTheme();
    syncSettingsUI();
    updateProfileUI();
    renderLessons();
    showScreen("login");
}

async function initializeAuth() {
    if (!supabaseClient) {
        elements.loginError.textContent =
            "Supabase 라이브러리 또는 공개 설정을 불러오지 못했어요.";
        showScreen("login");
        return;
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
            return;
        }
        if (event === "SIGNED_OUT") {
            handleSignedOut();
        } else if (session) {
            void activateSession(session);
        }
    });

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        elements.loginError.textContent = "로그인 상태를 확인하지 못했어요.";
        showScreen("login");
        return;
    }

    if (data.session) {
        await activateSession(data.session);
    } else {
        showScreen("login");
    }
}

function shuffle(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [result[index], result[target]] = [result[target], result[index]];
    }

    return result;
}

function renderLessons() {
    elements.lessonList.innerHTML = lessons
        .map(
            (lesson) => {
                const isUnlocked = isLessonUnlocked(lesson.id);
                const isPurchasable =
                    !isUnlocked && canPurchaseLesson(lesson.id);
                const action = isUnlocked
                    ? "open"
                    : isPurchasable
                      ? "purchase"
                      : "blocked";
                const description = isUnlocked
                    ? `단어 ${lesson.words.length}개 · 순서/랜덤 학습`
                    : isPurchasable
                      ? `${lesson.price}P로 새 단원 열기`
                      : `${lesson.id - 1}과를 먼저 열어주세요`;
                const status = isUnlocked
                    ? `
                        <span class="lesson-status ready" aria-label="학습 가능">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                        </span>
                    `
                    : isPurchasable
                      ? `
                        <span class="lesson-status price" aria-label="${lesson.price}포인트">
                            <span class="point-coin small" aria-hidden="true">P</span>
                            ${lesson.price}
                        </span>
                    `
                      : `
                        <span class="lesson-status locked" aria-label="잠긴 단원">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                        </span>
                    `;

                return `
                <button
                    class="lesson-card ${isUnlocked ? "" : "locked"} ${isPurchasable ? "purchasable" : ""}"
                    type="button"
                    data-lesson-id="${lesson.id}"
                    data-lesson-action="${action}"
                    style="--lesson-color: ${lesson.color}; --lesson-bg: ${lesson.background};"
                >
                    <span class="lesson-number" aria-hidden="true">${lesson.symbol}</span>
                    <span class="lesson-info">
                        <span class="lesson-title-row">
                            <strong>${lesson.id}과</strong>
                            ${isUnlocked && lesson.id === 1 ? '<em>학습 중</em>' : ""}
                        </span>
                        <small>${description}</small>
                    </span>
                    ${status}
                </button>
                `;
            },
        )
        .join("");
}

function openPurchaseModal(lessonId) {
    const lesson = lessons.find((item) => item.id === lessonId);

    if (!lesson || isLessonUnlocked(lessonId)) {
        return;
    }

    if (!canPurchaseLesson(lessonId)) {
        showToast(`${lessonId - 1}과를 먼저 열어주세요.`);
        return;
    }

    state.pendingPurchaseLessonId = lessonId;
    const canAfford = profile.points >= lesson.price;
    const missingPoints = Math.max(0, lesson.price - profile.points);

    elements.purchaseSymbol.textContent = lesson.symbol;
    elements.purchaseSymbol.style.color = lesson.color;
    elements.purchaseSymbol.style.background = lesson.background;
    elements.purchaseTitle.textContent = `${lesson.id}과를 열까요?`;
    elements.purchaseDescription.textContent = canAfford
        ? "구매하면 언제든 반복해서 학습할 수 있어요."
        : `${missingPoints}P를 더 모으면 이 단원을 열 수 있어요.`;
    elements.purchaseCost.textContent = `${lesson.price}P`;
    elements.purchaseBalance.textContent = `${profile.points}P`;
    elements.confirmPurchaseButton.disabled = !canAfford;
    elements.confirmPurchaseButton.textContent = canAfford
        ? `${lesson.price}P로 열기`
        : `${missingPoints}P 부족`;
    elements.purchaseModal.hidden = false;
    document.body.classList.add("modal-open");
}

function openAttendanceModal() {
    if (profile.lastAttendanceDate === getTodayKey()) {
        return;
    }

    attendancePromptShown = true;
    elements.attendanceModal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeAttendanceModal() {
    elements.attendanceModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function closePurchaseModal() {
    state.pendingPurchaseLessonId = null;
    elements.purchaseModal.hidden = true;
    document.body.classList.remove("modal-open");
}

async function purchaseLesson() {
    const lesson = lessons.find(
        (item) => item.id === state.pendingPurchaseLessonId,
    );

    if (
        !lesson ||
        isLessonUnlocked(lesson.id) ||
        !canPurchaseLesson(lesson.id)
    ) {
        closePurchaseModal();
        return;
    }

    if (!supabaseClient || !currentUser) {
        showToast("로그인 상태를 다시 확인해 주세요.");
        return;
    }

    elements.confirmPurchaseButton.disabled = true;
    const { data, error } = await supabaseClient.rpc("purchase_lesson", {
        lesson_id_input: lesson.id,
    });

    if (error) {
        elements.confirmPurchaseButton.disabled = false;
        if (errorIncludes(error, "insufficient_points")) {
            showToast("서버 기준으로 포인트가 부족해요.");
        } else {
            console.error("lesson purchase failed", error);
            showToast("단원을 열지 못했어요. 다시 시도해 주세요.");
        }
        return;
    }

    applyServerProfile(data);
    closePurchaseModal();
    renderLessons();
    updateProfileUI();
    renderLeaderboard();
    showToast(`${lesson.id}과가 열렸어요!`);
}

function openLesson(lessonId) {
    if (!isLessonUnlocked(lessonId)) {
        openPurchaseModal(lessonId);
        return;
    }

    state.lesson = lessons.find((lesson) => lesson.id === lessonId);

    if (!state.lesson) {
        return;
    }

    elements.modeLessonLabel.textContent = `${state.lesson.id}과`;
    elements.lessonSymbol.textContent = state.lesson.symbol;
    elements.lessonSymbol.style.color = state.lesson.color;
    elements.lessonSymbol.style.background = state.lesson.background;
    state.direction = profile.defaultDirection;
    elements.viewWordsTitle.textContent = `${state.lesson.id}과 단어 보기`;
    showScreen("mode");
}

function renderLessonWords() {
    if (!state.lesson) {
        return;
    }

    elements.wordsLessonSymbol.textContent = state.lesson.symbol;
    elements.wordsLessonSymbol.style.color = state.lesson.color;
    elements.wordsLessonSymbol.style.background = state.lesson.background;
    elements.wordsLessonLabel.textContent = `${state.lesson.id}과`;
    elements.wordsCount.textContent = `총 ${state.lesson.words.length}개`;
    elements.lessonWordsList.innerHTML = state.lesson.words
        .map(
            (word, index) => `
                <button class="lesson-word-card" type="button" data-word-index="${index}" aria-label="${word.hanja}, ${word.meaning} 크게 보기">
                    <span class="word-order">${String(index + 1).padStart(2, "0")}</span>
                    <strong>${word.hanja}</strong>
                    <span>${word.meaning}</span>
                </button>
            `,
        )
        .join("");
}

function renderWordPreview() {
    if (!state.lesson) {
        return;
    }

    const words = state.lesson.words;
    const word = words[state.wordPreviewIndex];

    if (!word) {
        return;
    }

    elements.wordPreviewLesson.textContent = `${state.lesson.id}과 단어`;
    elements.wordPreviewCount.textContent = `${state.wordPreviewIndex + 1} / ${words.length}`;
    elements.wordPreviewOrder.textContent = String(
        state.wordPreviewIndex + 1,
    ).padStart(2, "0");
    elements.wordPreviewHanja.textContent = word.hanja;
    elements.wordPreviewMeaning.textContent = word.meaning;
    elements.previousWordButton.disabled = state.wordPreviewIndex === 0;
    elements.nextWordButton.disabled =
        state.wordPreviewIndex === words.length - 1;
}

function openWordPreview(index) {
    if (!state.lesson || !state.lesson.words[index]) {
        return;
    }

    state.wordPreviewIndex = index;
    renderWordPreview();
    elements.wordPreviewModal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeWordPreview() {
    elements.wordPreviewModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function moveWordPreview(offset) {
    if (!state.lesson) {
        return;
    }

    const nextIndex = Math.min(
        state.lesson.words.length - 1,
        Math.max(0, state.wordPreviewIndex + offset),
    );

    if (nextIndex === state.wordPreviewIndex) {
        return;
    }

    state.wordPreviewIndex = nextIndex;
    renderWordPreview();
}

function getAnswerField(direction) {
    return direction === "meaning-to-hanja" ? "hanja" : "meaning";
}

function normalizeTypedAnswer(value) {
    return String(value)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[\s,，·ㆍ.、/()_-]/g, "");
}

function buildAnswerOptions(answer, lessonWords) {
    const answerField = getAnswerField(answer.direction);
    const otherLessons = lessons.flatMap((lesson) => lesson.words);
    const candidates = [...lessonWords, ...otherLessons].filter(
        (word) => word[answerField] !== answer[answerField],
    );
    const uniqueCandidates = Array.from(
        new Map(candidates.map((word) => [word[answerField], word])).values(),
    );

    return shuffle([answer, ...shuffle(uniqueCandidates).slice(0, 3)]);
}

function getRewardForStreak(streak) {
    const basePoints = 5;
    const streakBonus = Math.min(Math.max(streak - 1, 0), 5) * 2;

    return {
        basePoints,
        streakBonus,
        total: basePoints + streakBonus,
    };
}

function updateQuizRewardUI() {
    const nextReward = getRewardForStreak(state.streak + 1);

    elements.quizStreak.textContent = state.streak;
    elements.streakFire.classList.toggle("active", state.streak > 0);
    elements.streakFire.classList.toggle("combo", state.streak >= 3);

    elements.streakMessage.textContent =
        state.streak >= 5
            ? "최고 보너스 유지 중!"
            : state.streak >= 3
              ? "불꽃 콤보가 터졌어요!"
              : state.streak > 0
                ? "연속 정답 진행 중"
                : "첫 정답에 도전해요";
    elements.streakNextReward.textContent = `다음 +${nextReward.total}P`;
    elements.quizPointsEarned.textContent = `+${state.pointsEarned}P`;
}

async function startQuiz() {
    if (
        !state.lesson ||
        !supabaseClient ||
        !currentUser ||
        state.isStartingQuiz
    ) {
        return;
    }

    state.isStartingQuiz = true;
    elements.modeButtons.forEach((button) => {
        button.disabled = true;
    });
    elements.retryButton.disabled = true;

    let data = null;
    let error = null;

    try {
        const response = await supabaseClient.rpc("start_quiz_attempt", {
            lesson_id_input: state.lesson.id,
            mode_input: state.mode,
            direction_input: state.direction,
        });
        data = response.data;
        error = response.error;
    } catch (requestError) {
        error = requestError;
    } finally {
        state.isStartingQuiz = false;
        elements.modeButtons.forEach((button) => {
            button.disabled = false;
        });
        elements.retryButton.disabled = false;
    }

    if (error) {
        console.error("quiz start failed", error);
        showToast(
            errorIncludes(error, "quiz_rate_limit")
                ? "퀴즈 시작 요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요."
                : "보안 퀴즈를 시작하지 못했어요.",
        );
        return;
    }

    const questionOrder = Array.isArray(data.question_order)
        ? data.question_order
        : [];
    const questionDirections = Array.isArray(data.question_directions)
        ? data.question_directions
        : [];

    if (
        !data.attempt_id ||
        questionOrder.length === 0 ||
        questionOrder.length !== questionDirections.length
    ) {
        showToast("서버가 올바른 퀴즈를 반환하지 않았어요.");
        return;
    }

    state.quizAttemptId = data.attempt_id;
    state.questions = questionOrder.map((wordOrder, index) => ({
        ...state.lesson.words[Number(wordOrder) - 1],
        direction: questionDirections[index],
    }));
    state.currentIndex = 0;
    state.correctCount = 0;
    state.wrongAnswers = [];
    state.streak = 0;
    state.pointsEarned = 0;
    state.answered = false;
    state.isSubmittingAnswer = false;
    state.canSwipeNext = false;
    state.isAdvancing = false;
    showScreen("quiz");
    updateQuizRewardUI();
    renderQuestion();
}

function renderQuestion() {
    const question = state.questions[state.currentIndex];
    const total = state.questions.length;
    const progress = ((state.currentIndex + 1) / total) * 100;
    const isTypingQuestion = question.direction === "hanja-to-meaning";
    const options = isTypingQuestion
        ? []
        : buildAnswerOptions(question, state.lesson.words);
    const answerField = getAnswerField(question.direction);
    const nextReward = getRewardForStreak(state.streak + 1);

    state.answered = false;
    state.canSwipeNext = false;
    state.answerOptions = options;
    elements.quizScreen.classList.toggle("typing-mode", isTypingQuestion);
    elements.quizScreen.classList.remove("swipe-ready");
    elements.quizContent.classList.toggle("typing-mode", isTypingQuestion);
    setTypingKeyboardActive(false);
    elements.quizContent.classList.remove("swipe-out");
    elements.quizContent.scrollTo({ top: 0, behavior: "auto" });
    elements.progressBar.style.width = `${progress}%`;
    elements.quizCount.textContent = `${state.currentIndex + 1}/${total}`;
    elements.quizGuide.textContent = isTypingQuestion
        ? "한자의 음과 뜻을 직접 입력해 주세요"
        : "뜻에 맞는 한자를 골라주세요";
    elements.quizPrompt.textContent = isTypingQuestion
        ? question.hanja
        : question.meaning;
    elements.quizPrompt.classList.toggle("hanja-prompt", isTypingQuestion);
    elements.currentReward.innerHTML = `
        <span class="point-coin small" aria-hidden="true">P</span>
        맞히면 ${nextReward.total}P
    `;
    elements.currentReward.classList.remove("earned");
    elements.answerList.hidden = isTypingQuestion;
    elements.typingAnswerForm.hidden = !isTypingQuestion;
    elements.typingAnswerInput.value = "";
    elements.typingAnswerInput.disabled = false;
    elements.typingAnswerButton.disabled = false;
    elements.typingAnswerForm.classList.remove("correct", "wrong");
    elements.quizHint.textContent = isTypingQuestion
        ? "뜻과 음을 함께 써주세요. 예: 사람 인"
        : "알맞은 답을 하나 선택하세요.";
    elements.swipeHint.hidden = isTypingQuestion;
    elements.swipeHint.textContent =
        "답을 확인한 뒤 옆으로 밀어 다음 문제로 넘어가요.";
    elements.swipeHint.classList.remove("ready", "typing-next");
    elements.answerList.innerHTML = isTypingQuestion
        ? ""
        : options
              .map(
                  (option, index) => `
                    <button
                        class="answer-button"
                        type="button"
                        data-answer-index="${index}"
                    >${option[answerField]}</button>
                `,
              )
              .join("");

    if (isTypingQuestion && !isCoarsePointer()) {
        window.setTimeout(() => {
            elements.typingAnswerInput.focus({ preventScroll: true });
        }, 80);
    }
}

async function finishAnswer(submittedAnswer = "", selectedIndex = null) {
    if (
        state.answered ||
        state.isSubmittingAnswer ||
        !state.quizAttemptId ||
        !supabaseClient
    ) {
        return;
    }

    state.isSubmittingAnswer = true;
    const question = state.questions[state.currentIndex];
    const { data, error } = await supabaseClient.rpc("submit_quiz_answer", {
        attempt_id_input: state.quizAttemptId,
        question_index_input: state.currentIndex + 1,
        answer_input: String(submittedAnswer),
    });

    state.isSubmittingAnswer = false;

    if (error) {
        console.error("quiz answer failed", error);
        elements.answerList
            .querySelectorAll(".answer-button")
            .forEach((button) => {
                button.disabled = false;
            });
        elements.typingAnswerInput.disabled = false;
        elements.typingAnswerButton.disabled = false;
        showToast(
            errorIncludes(error, "quiz_question_out_of_order") ||
                errorIncludes(error, "quiz_attempt_expired")
                ? "퀴즈 상태가 만료됐어요. 다시 시작해 주세요."
                : "답안을 서버에서 확인하지 못했어요.",
        );
        return;
    }

    state.answered = true;
    const isCorrect = Boolean(data.is_correct);
    const expectedHanja = String(data.expected_hanja || question.hanja);
    const expectedMeaning = String(
        data.expected_meaning || question.meaning,
    );
    const answerField = getAnswerField(question.direction);
    const expectedAnswer =
        answerField === "hanja" ? expectedHanja : expectedMeaning;
    const answerButtons = elements.answerList.querySelectorAll(
        ".answer-button",
    );

    answerButtons.forEach((button) => {
        button.disabled = true;
        const option = state.answerOptions[Number(button.dataset.answerIndex)];

        if (option && option[answerField] === expectedAnswer) {
            button.classList.add("correct");
        } else if (Number(button.dataset.answerIndex) === selectedIndex) {
            button.classList.add("wrong");
        }
    });

    profile.points = Math.max(0, Number(data.points) || 0);
    state.correctCount = Math.max(0, Number(data.correct_count) || 0);
    state.streak = Math.max(0, Number(data.streak) || 0);
    state.pointsEarned = Math.max(0, Number(data.points_earned) || 0);
    saveProfile();

    if (isCorrect) {
        updateProfileUI();
        updateQuizRewardUI();
        elements.currentReward.innerHTML = `
            <span class="point-coin small" aria-hidden="true">P</span>
            ${Number(data.reward) || 0}P 받았어요!
        `;
        elements.currentReward.classList.add("earned");
        elements.quizHint.textContent = `${expectedHanja} · ${expectedMeaning}`;
    } else {
        state.wrongAnswers.push({
            hanja: expectedHanja,
            meaning: expectedMeaning,
            direction: question.direction,
            submittedAnswer: String(submittedAnswer).trim(),
        });
        updateQuizRewardUI();
        elements.currentReward.textContent = "이번 문제는 0P";
        elements.currentReward.classList.remove("earned");
        elements.quizHint.textContent = `정답: ${expectedHanja} · ${expectedMeaning}`;
    }

    elements.typingAnswerForm.classList.add(
        isCorrect ? "correct" : "wrong",
    );

    const isTypingQuestion = question.direction === "hanja-to-meaning";

    state.canSwipeNext = !isTypingQuestion;
    elements.quizScreen.classList.toggle("swipe-ready", !isTypingQuestion);
    elements.swipeHint.hidden = false;
    elements.swipeHint.textContent = isTypingQuestion
        ? state.currentIndex === state.questions.length - 1
            ? "결과 보기"
            : "다음 문제"
        : state.currentIndex === state.questions.length - 1
          ? "옆으로 밀어 결과를 확인하세요."
          : "옆으로 밀어 다음 문제로 넘어가세요.";
    elements.swipeHint.classList.toggle("typing-next", isTypingQuestion);
    elements.swipeHint.classList.add("ready");
}

function selectAnswer(selectedIndex) {
    if (state.answered || state.isSubmittingAnswer) {
        return;
    }

    const question = state.questions[state.currentIndex];
    const answerField = getAnswerField(question.direction);
    const selectedAnswer = state.answerOptions[selectedIndex];
    const answerButtons = elements.answerList.querySelectorAll(".answer-button");

    answerButtons.forEach((button) => {
        button.disabled = true;
    });

    void finishAnswer(
        selectedAnswer ? selectedAnswer[answerField] : "",
        selectedIndex,
    );
}

function submitTypedAnswer(event) {
    event.preventDefault();

    if (state.answered) {
        return;
    }

    const typedAnswer = normalizeTypedAnswer(
        elements.typingAnswerInput.value,
    );

    if (!typedAnswer) {
        elements.typingAnswerInput.focus();
        showToast("음과 뜻을 입력해 주세요.");
        return;
    }

    releaseTypingInputFocus();
    elements.typingAnswerInput.disabled = true;
    elements.typingAnswerButton.disabled = true;
    void finishAnswer(elements.typingAnswerInput.value);
}

function advanceQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex += 1;
        renderQuestion();
        return;
    }

    showResult();
}

function goToNextQuestion(withSwipeAnimation = false) {
    if (!state.answered || state.isAdvancing) {
        return;
    }

    if (!withSwipeAnimation) {
        advanceQuestion();
        return;
    }

    state.isAdvancing = true;
    elements.quizContent.classList.add("swipe-out");
    window.setTimeout(() => {
        state.isAdvancing = false;
        advanceQuestion();
    }, 150);
}

function showResult() {
    const total = state.questions.length;
    const percent = Math.round((state.correctCount / total) * 100);

    const directionLabels = {
        "meaning-to-hanja": "뜻→한자",
        "hanja-to-meaning": "한자→음·뜻",
        mixed: "혼합",
    };
    elements.resultMessage.textContent = `${state.lesson.id}과 ${state.mode === "random" ? "랜덤" : "순서"} · ${directionLabels[state.direction]} 학습을 모두 마쳤어요.`;
    elements.scorePercent.textContent = `${percent}%`;
    elements.correctCount.textContent = state.correctCount;
    elements.totalCount.textContent = total;
    elements.resultPointsEarned.textContent = `+${state.pointsEarned}P`;
    elements.resultTotalPoints.textContent = `${profile.points}P`;
    elements.wrongAnswerSection.hidden = state.wrongAnswers.length === 0;
    elements.wrongAnswerCount.textContent = `${state.wrongAnswers.length}개`;
    elements.wrongAnswerList.innerHTML = state.wrongAnswers
        .map((answer) => {
            const prompt =
                answer.direction === "meaning-to-hanja"
                    ? answer.meaning
                    : answer.hanja;
            const submitted = answer.submittedAnswer || "답하지 않음";

            return `
                <article class="wrong-answer-row">
                    <span class="wrong-answer-hanja">${escapeHTML(answer.hanja)}</span>
                    <span class="wrong-answer-copy">
                        <strong>${escapeHTML(answer.meaning)}</strong>
                        <small>문제 ${escapeHTML(prompt)} · 내 답 ${escapeHTML(submitted)}</small>
                    </span>
                </article>
            `;
        })
        .join("");
    showScreen("result");
}

function getAuthErrorMessage(error) {
    const message = String((error && error.message) || "").toLowerCase();

    if (message.includes("invalid login credentials")) {
        return "이메일 또는 비밀번호가 올바르지 않아요.";
    }
    if (message.includes("email not confirmed")) {
        return "이메일 인증을 완료한 뒤 로그인해 주세요.";
    }
    if (message.includes("already registered")) {
        return "이미 가입된 이메일이에요.";
    }
    if (message.includes("password")) {
        return "비밀번호는 10자 이상으로 입력해 주세요.";
    }
    if (message.includes("provider") || message.includes("unsupported")) {
        return "Supabase에서 해당 로그인 제공자를 먼저 설정해 주세요.";
    }

    return (error && error.message) || "로그인 처리 중 오류가 발생했어요.";
}

function setAuthButtonsBusy(isBusy) {
    elements.loginSubmitButton.disabled = isBusy;
    elements.signupButton.disabled = isBusy;
}

async function handleLogin(event) {
    event.preventDefault();

    const email = elements.username.value.trim().toLowerCase();
    const password = elements.password.value;

    if (!email || !password) {
        elements.loginError.textContent =
            "이메일과 비밀번호를 모두 입력해 주세요.";
        return;
    }
    if (!supabaseClient) {
        elements.loginError.textContent = "Supabase 연결 설정을 확인해 주세요.";
        return;
    }

    setAuthButtonsBusy(true);
    elements.loginError.textContent = "";
    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });
    setAuthButtonsBusy(false);

    if (error) {
        elements.loginError.textContent = getAuthErrorMessage(error);
        elements.password.focus();
    }
}

async function handleSignup() {
    const email = elements.username.value.trim().toLowerCase();
    const password = elements.password.value;

    if (!email || !password) {
        elements.loginError.textContent =
            "가입할 이메일과 비밀번호를 입력해 주세요.";
        return;
    }
    if (password.length < 10) {
        elements.loginError.textContent =
            "비밀번호는 10자 이상으로 입력해 주세요.";
        return;
    }
    if (!supabaseClient) {
        elements.loginError.textContent = "Supabase 연결 설정을 확인해 주세요.";
        return;
    }

    setAuthButtonsBusy(true);
    elements.loginError.textContent = "";
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: {
                display_name: email.split("@")[0].slice(0, 12),
            },
        },
    });
    setAuthButtonsBusy(false);

    if (error) {
        elements.loginError.textContent = getAuthErrorMessage(error);
        return;
    }

    if (!data.session) {
        elements.loginError.textContent =
            "가입 확인 메일을 보냈어요. 메일의 링크를 눌러주세요.";
        return;
    }

    showToast("회원가입이 완료됐어요.");
}

async function logout() {
    if (!supabaseClient) {
        handleSignedOut();
        return;
    }

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showToast("로그아웃하지 못했어요.");
        return;
    }

    handleSignedOut();
    elements.loginForm.reset();
    elements.password.type = "password";
    elements.passwordToggle.textContent = "보기";
}

async function claimAttendanceReward() {
    if (profile.lastAttendanceDate === getTodayKey()) {
        closeAttendanceModal();
        showToast("오늘 출석 보상은 이미 받았어요.");
        return;
    }

    if (!supabaseClient || !currentUser) {
        showToast("로그인 상태를 다시 확인해 주세요.");
        return;
    }

    elements.attendanceButton.disabled = true;
    elements.attendanceModalButton.disabled = true;
    const { data, error } = await supabaseClient.rpc(
        "claim_attendance_reward",
    );

    if (error) {
        console.error("attendance claim failed", error);
        if (errorIncludes(error, "attendance_already_claimed")) {
            await loadRemoteProfile();
            showToast("오늘 출석 보상은 이미 받았어요.");
        } else {
            showToast("출석 보상을 받지 못했어요. 다시 시도해 주세요.");
        }
        updateProfileUI();
        return;
    }

    applyServerProfile(data);
    updateProfileUI();
    renderLeaderboard();
    closeAttendanceModal();
    showToast("출석 완료! 100P를 받았어요.");
}

async function levelUp() {
    if (!areAllLessonsUnlocked()) {
        showToast("5과까지 모두 열면 레벨업할 수 있어요.");
        return;
    }

    if (!supabaseClient || !currentUser) {
        showToast("로그인 상태를 다시 확인해 주세요.");
        return;
    }

    elements.levelUpButton.disabled = true;
    const { data, error } = await supabaseClient.rpc("level_up");

    if (error) {
        console.error("level up failed", error);
        showToast(
            errorIncludes(error, "insufficient_points")
                ? "서버 기준으로 포인트가 부족해요."
                : "레벨을 올리지 못했어요. 다시 시도해 주세요.",
        );
        updateProfileUI();
        return;
    }

    applyServerProfile(data);
    updateProfileUI();
    renderLeaderboard();
    showToast(`레벨 ${profile.level}이 되었어요!`);
}

async function saveProfilePreferences() {
    if (!supabaseClient || !currentUser) {
        return false;
    }

    const { data, error } = await supabaseClient.rpc(
        "update_profile_preferences",
        {
            display_name_input: profile.displayName,
            theme_input: profile.theme,
            default_direction_input: profile.defaultDirection,
        },
    );

    if (error) {
        console.error("profile preferences save failed", error);
        showToast("설정을 서버에 저장하지 못했어요.");
        return false;
    }

    applyServerProfile(data);
    return true;
}

async function saveProfileName(event) {
    event.preventDefault();
    const displayName = elements.profileNameInput.value.trim().slice(0, 12);

    if (!displayName) {
        showToast("표시할 이름을 입력해 주세요.");
        elements.profileNameInput.focus();
        return;
    }

    const previousName = profile.displayName;
    profile.displayName = displayName;

    if (!(await saveProfilePreferences())) {
        profile.displayName = previousName;
        updateProfileUI();
        return;
    }

    updateProfileUI();
    renderLeaderboard();
    showToast("이름을 저장했어요.");
}

elements.loginForm.addEventListener("submit", handleLogin);
elements.signupButton.addEventListener("click", handleSignup);
elements.inviteForm.addEventListener("submit", handleInviteSubmit);
elements.inviteLogoutButton.addEventListener("click", logout);
elements.refreshInviteCodeButton.addEventListener(
    "click",
    refreshAdminInviteCode,
);

elements.passwordToggle.addEventListener("click", () => {
    const shouldShow = elements.password.type === "password";
    elements.password.type = shouldShow ? "text" : "password";
    elements.passwordToggle.textContent = shouldShow ? "숨김" : "보기";
    elements.passwordToggle.setAttribute(
        "aria-label",
        shouldShow ? "비밀번호 숨기기" : "비밀번호 보기",
    );
});

elements.logoutButton.addEventListener("click", logout);
elements.attendanceButton.addEventListener("click", claimAttendanceReward);
elements.attendanceModalButton.addEventListener(
    "click",
    claimAttendanceReward,
);
elements.closeAttendanceButtons.forEach((button) => {
    button.addEventListener("click", closeAttendanceModal);
});
elements.levelUpButton.addEventListener("click", levelUp);
elements.profileNameForm.addEventListener("submit", saveProfileName);

elements.lessonList.addEventListener("click", (event) => {
    const lessonButton = event.target.closest("[data-lesson-id]");

    if (lessonButton) {
        const lessonId = Number(lessonButton.dataset.lessonId);

        if (lessonButton.dataset.lessonAction === "blocked") {
            showToast(`${lessonId - 1}과를 먼저 열어주세요.`);
        } else if (lessonButton.dataset.lessonAction === "purchase") {
            openPurchaseModal(lessonId);
        } else {
            openLesson(lessonId);
        }
    }
});

elements.screenLinkButtons.forEach((button) => {
    button.addEventListener("click", () => {
        showScreen(button.dataset.screenLink);
    });
});

elements.shopItemList.addEventListener("click", handleShopItemAction);
elements.shopInventoryList.addEventListener("click", handleShopItemAction);
elements.shopViewButtons.forEach((button) => {
    button.addEventListener("click", () => setShopView(button.dataset.shopView));
});

elements.lessonWordsList.addEventListener("click", (event) => {
    const wordCard = event.target.closest("[data-word-index]");

    if (wordCard) {
        openWordPreview(Number(wordCard.dataset.wordIndex));
    }
});

elements.closeWordPreviewButton.addEventListener("click", closeWordPreview);
elements.previousWordButton.addEventListener("click", () =>
    moveWordPreview(-1),
);
elements.nextWordButton.addEventListener("click", () => moveWordPreview(1));

let wordPreviewSwipeStart = null;

elements.wordPreviewStage.addEventListener("pointerdown", (event) => {
    wordPreviewSwipeStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
    };
});

elements.wordPreviewStage.addEventListener("pointerup", (event) => {
    if (
        !wordPreviewSwipeStart ||
        wordPreviewSwipeStart.pointerId !== event.pointerId
    ) {
        return;
    }

    const horizontalDistance = event.clientX - wordPreviewSwipeStart.x;
    const verticalDistance = event.clientY - wordPreviewSwipeStart.y;
    wordPreviewSwipeStart = null;

    if (
        Math.abs(horizontalDistance) < 50 ||
        Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * 1.15
    ) {
        return;
    }

    moveWordPreview(horizontalDistance < 0 ? 1 : -1);
});

elements.wordPreviewStage.addEventListener("pointercancel", () => {
    wordPreviewSwipeStart = null;
});

elements.backButtons.forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.back));
});

elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        state.mode = button.dataset.mode;
        state.direction = profile.defaultDirection;
        void startQuiz();
    });
});

elements.viewWordsButton.addEventListener("click", () => {
    renderLessonWords();
    showScreen("words");
});

elements.themeButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        const previousTheme = profile.theme;
        profile.theme = button.dataset.themeOption;
        applyTheme();
        syncSettingsUI();

        if (!(await saveProfilePreferences())) {
            profile.theme = previousTheme;
            applyTheme();
            syncSettingsUI();
        }
    });
});

elements.defaultDirectionButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        const previousDirection = profile.defaultDirection;
        profile.defaultDirection = button.dataset.defaultDirection;
        state.direction = profile.defaultDirection;
        syncSettingsUI();

        if (!(await saveProfilePreferences())) {
            profile.defaultDirection = previousDirection;
            state.direction = previousDirection;
            syncSettingsUI();
        }
    });
});

elements.confirmPurchaseButton.addEventListener("click", purchaseLesson);
elements.closePurchaseButtons.forEach((button) => {
    button.addEventListener("click", closePurchaseModal);
});

elements.answerList.addEventListener("click", (event) => {
    const answerButton = event.target.closest("[data-answer-index]");

    if (answerButton) {
        selectAnswer(Number(answerButton.dataset.answerIndex));
    }
});

elements.typingAnswerForm.addEventListener("submit", submitTypedAnswer);
elements.typingAnswerInput.addEventListener("focus", stabilizeTypingViewport);
elements.typingAnswerInput.addEventListener("blur", () => {
    window.setTimeout(() => {
        if (document.activeElement !== elements.typingAnswerInput) {
            setTypingKeyboardActive(false);
        }
    }, 120);
});

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateTypingViewportInset);
    window.visualViewport.addEventListener("scroll", updateTypingViewportInset);
}

let swipeStart = null;

function beginQuizSwipe(pointerId, x, y) {
    if (!state.canSwipeNext || state.isAdvancing) {
        swipeStart = null;
        return;
    }

    swipeStart = {
        pointerId,
        x,
        y,
    };
}

function tryQuizSwipe(pointerId, x, y) {
    if (!swipeStart || swipeStart.pointerId !== pointerId) {
        return false;
    }

    const horizontalDistance = x - swipeStart.x;
    const verticalDistance = y - swipeStart.y;

    if (
        Math.abs(horizontalDistance) <= 55 ||
        Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * 1.2
    ) {
        return false;
    }

    swipeStart = null;
    goToNextQuestion(true);
    return true;
}

function completeQuizSwipe(pointerId, x, y) {
    if (!tryQuizSwipe(pointerId, x, y)) {
        swipeStart = null;
    }
}

if ("PointerEvent" in window) {
    elements.quizScreen.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary) {
            return;
        }

        beginQuizSwipe(event.pointerId, event.clientX, event.clientY);

        if (swipeStart && elements.quizScreen.setPointerCapture) {
            elements.quizScreen.setPointerCapture(event.pointerId);
        }
    });

    elements.quizScreen.addEventListener("pointermove", (event) => {
        if (!event.isPrimary) {
            return;
        }

        tryQuizSwipe(event.pointerId, event.clientX, event.clientY);
    });

    elements.quizScreen.addEventListener("pointerup", (event) => {
        if (!event.isPrimary) {
            return;
        }

        completeQuizSwipe(event.pointerId, event.clientX, event.clientY);
    });

    elements.quizScreen.addEventListener("pointercancel", () => {
        swipeStart = null;
    });
} else {
    elements.quizScreen.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) {
            swipeStart = null;
            return;
        }

        const touch = event.touches[0];
        beginQuizSwipe(touch.identifier, touch.clientX, touch.clientY);
    });

    elements.quizScreen.addEventListener(
        "touchmove",
        (event) => {
            const touch = Array.from(event.touches).find(
                (item) => swipeStart && item.identifier === swipeStart.pointerId,
            );

            if (!touch) {
                return;
            }

            event.preventDefault();
            tryQuizSwipe(touch.identifier, touch.clientX, touch.clientY);
        },
        { passive: false },
    );

    elements.quizScreen.addEventListener("touchend", (event) => {
        const touch = Array.from(event.changedTouches).find(
            (item) => swipeStart && item.identifier === swipeStart.pointerId,
        );

        if (touch) {
            completeQuizSwipe(touch.identifier, touch.clientX, touch.clientY);
        }
    });

    elements.quizScreen.addEventListener("touchcancel", () => {
        swipeStart = null;
    });
}

elements.swipeHint.addEventListener("click", () => {
    goToNextQuestion(false);
});

elements.quitQuizButton.addEventListener("click", () => {
    showScreen("mode");
});
elements.retryButton.addEventListener("click", () => void startQuiz());
elements.resultHomeButton.addEventListener("click", () => showScreen("home"));


function isShopPreviewMode() {
    return new URLSearchParams(window.location.search).get("preview") === "shop";
}

function startApp() {
    applyTheme();
    syncSettingsUI();
    updateProfileUI();
    renderLessons();
    renderShop();
    closePurchaseModal();

    if (isShopPreviewMode()) {
        document.documentElement.dataset.shopPreview = "true";
        const previewShopBudget = shopItems.reduce(
            (total, item) => total + item.price,
            0,
        );

        profile.ownedShopItems = [DEFAULT_SHOP_ITEM_ID];
        profile.equippedShopItem = DEFAULT_SHOP_ITEM_ID;
        profile.points = Math.max(profile.points, previewShopBudget);
        state.shopView = "store";
        saveProfile();
        updateProfileUI();
        renderShop();
        showScreen("shop");
        return;
    }

    showScreen("login");
    void initializeAuth();
}

startApp();
