const puzzles = [
    {
        id: 1,
        title: "숫자 패턴",
        difficulty: "쉬움",
        question: "다음 숫자 배열의 빈칸에 들어갈 수를 맞혀 보세요. 2, 4, 8, 16, ?",
        hint: "앞 숫자에 같은 연산을 반복하고 있습니다.",
        answer: "32",
        success: "2배씩 커지는 패턴입니다. 다음 레벨이 열렸습니다."
    },
    {
        id: 2,
        title: "단어 추리",
        difficulty: "쉬움",
        question: "바다에도 있고 하늘에도 있습니다. 낮에는 잘 안 보이고 밤에는 빛납니다. 무엇일까요?",
        hint: "밤하늘을 올려다보면 많이 보입니다.",
        answer: "별",
        success: "정답입니다. 짧은 수수께끼를 통과했습니다."
    },
    {
        id: 3,
        title: "방향 퍼즐",
        difficulty: "보통",
        question: "동쪽을 보고 서 있다가 오른쪽으로 한 번, 다시 오른쪽으로 한 번 돌았습니다. 지금 바라보는 방향은?",
        hint: "오른쪽 회전은 시계 방향 90도입니다.",
        answer: "서쪽",
        success: "정확합니다. 회전 방향을 잘 계산했습니다."
    },
    {
        id: 4,
        title: "문자 규칙",
        difficulty: "보통",
        question: "A, C, F, J 다음에 올 알파벳은 무엇일까요?",
        hint: "간격이 2, 3, 4로 늘어나고 있습니다.",
        answer: "O",
        success: "간격이 하나씩 증가하는 규칙을 찾았습니다."
    },
    {
        id: 5,
        title: "최종 관문",
        difficulty: "어려움",
        question: "세 자리 수 중 각 자리 숫자의 합이 6이고, 백의 자리는 십의 자리보다 1 크며, 일의 자리는 2입니다. 이 수는?",
        hint: "백의 자리를 x라고 하면 십의 자리는 x-1, 일의 자리는 2입니다.",
        answer: "312",
        success: "마지막 퍼즐까지 클리어했습니다. 전체 레벨 완료입니다."
    }
];

const state = {
    currentLevel: 1,
    unlockedLevel: 1,
    completedLevels: new Set(),
    hintVisible: false
};

const levelList = document.getElementById("level-list");
const puzzleTag = document.getElementById("puzzle-tag");
const puzzleTitle = document.getElementById("puzzle-title");
const difficultyBadge = document.getElementById("difficulty-badge");
const puzzleQuestion = document.getElementById("puzzle-question");
const puzzleHint = document.getElementById("puzzle-hint");
const answerInput = document.getElementById("answer-input");
const feedbackBox = document.getElementById("feedback-box");
const submitButton = document.getElementById("submit-button");
const hintButton = document.getElementById("hint-button");
const resetButton = document.getElementById("reset-button");
const progressText = document.getElementById("progress-text");
const currentLevelText = document.getElementById("current-level-text");
const statusChip = document.getElementById("status-chip");
const progressBar = document.getElementById("progress-bar");

function normalizeAnswer(value) {
    return value.trim().toLowerCase().replace(/\s+/g, "");
}

function getPuzzle(level) {
    return puzzles.find((puzzle) => puzzle.id === level);
}

function setFeedback(message, type = "info") {
    feedbackBox.textContent = message;
    feedbackBox.className = `feedback-box ${type}`;
}

function renderLevels() {
    levelList.innerHTML = "";

    puzzles.forEach((puzzle) => {
        const button = document.createElement("button");
        const locked = puzzle.id > state.unlockedLevel;
        const completed = state.completedLevels.has(puzzle.id);

        button.type = "button";
        button.className = "level-button";
        if (puzzle.id === state.currentLevel) {
            button.classList.add("current");
        }
        if (completed) {
            button.classList.add("completed");
        }
        button.disabled = locked;
        button.innerHTML = `
            <strong>Level ${puzzle.id}. ${puzzle.title}</strong>
            <span>${locked ? "잠김" : completed ? "클리어 완료" : puzzle.difficulty}</span>
        `;

        if (!locked) {
            button.addEventListener("click", () => {
                state.currentLevel = puzzle.id;
                state.hintVisible = false;
                render();
            });
        }

        levelList.appendChild(button);
    });
}

function renderPuzzle() {
    const puzzle = getPuzzle(state.currentLevel);

    puzzleTag.textContent = `LEVEL ${puzzle.id}`;
    puzzleTitle.textContent = puzzle.title;
    difficultyBadge.textContent = puzzle.difficulty;
    puzzleQuestion.textContent = puzzle.question;
    puzzleHint.textContent = state.hintVisible ? puzzle.hint : "힌트 버튼을 눌러 필요할 때만 확인하세요.";
    answerInput.value = "";
    answerInput.focus();
}

function renderProgress() {
    const completedCount = state.completedLevels.size;
    const totalCount = puzzles.length;
    const progress = (completedCount / totalCount) * 100;

    progressText.textContent = `${completedCount} / ${totalCount} 완료`;
    currentLevelText.textContent = `Level ${state.currentLevel}`;
    statusChip.textContent = completedCount === totalCount ? "전체 클리어" : state.completedLevels.has(state.currentLevel) ? "클리어" : "진행 중";
    progressBar.style.width = `${progress}%`;
}

function render() {
    renderLevels();
    renderPuzzle();
    renderProgress();
}

function unlockNextLevel(level) {
    state.completedLevels.add(level);
    state.unlockedLevel = Math.max(state.unlockedLevel, Math.min(level + 1, puzzles.length));
}

function submitAnswer() {
    const puzzle = getPuzzle(state.currentLevel);
    const userAnswer = normalizeAnswer(answerInput.value);
    const correctAnswer = normalizeAnswer(puzzle.answer);

    if (!userAnswer) {
        setFeedback("정답을 입력한 뒤 확인해 주세요.", "error");
        return;
    }

    if (userAnswer !== correctAnswer) {
        setFeedback("정답이 아닙니다. 힌트를 보거나 다시 생각해 보세요.", "error");
        return;
    }

    unlockNextLevel(puzzle.id);

    if (puzzle.id < puzzles.length) {
        state.currentLevel = puzzle.id + 1;
        state.hintVisible = false;
        setFeedback(`${puzzle.success} Level ${state.currentLevel}로 이동합니다.`, "success");
    } else {
        setFeedback(`${puzzle.success} 처음부터 다시 도전해 보세요.`, "success");
    }

    render();
}

function showHint() {
    state.hintVisible = true;
    const puzzle = getPuzzle(state.currentLevel);
    puzzleHint.textContent = puzzle.hint;
    setFeedback("힌트를 열었습니다. 답을 다시 조합해 보세요.", "info");
}

function resetGame() {
    state.currentLevel = 1;
    state.unlockedLevel = 1;
    state.completedLevels = new Set();
    state.hintVisible = false;
    setFeedback("진행 상황을 초기화했습니다. Level 1부터 다시 시작합니다.", "info");
    render();
}

submitButton.addEventListener("click", submitAnswer);
hintButton.addEventListener("click", showHint);
resetButton.addEventListener("click", resetGame);
answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        submitAnswer();
    }
});

render();
