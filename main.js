const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const dateCalcButton = document.getElementById("date-calc-button");
const dateResult = document.getElementById("date-result");

const billAmountInput = document.getElementById("bill-amount");
const billPeopleInput = document.getElementById("bill-people");
const billExtraInput = document.getElementById("bill-extra");
const billCalcButton = document.getElementById("bill-calc-button");
const billResult = document.getElementById("bill-result");

const textInput = document.getElementById("text-input");
const textOutput = document.getElementById("text-output");
const trimSpacesInput = document.getElementById("trim-spaces");
const removeEmptyInput = document.getElementById("remove-empty");
const dedupeLinesInput = document.getElementById("dedupe-lines");
const textCleanButton = document.getElementById("text-clean-button");
const textCopyButton = document.getElementById("text-copy-button");
const textResetButton = document.getElementById("text-reset-button");
const textFeedback = document.getElementById("text-feedback");
const charCount = document.getElementById("char-count");
const lineCount = document.getElementById("line-count");
const wordCount = document.getElementById("word-count");

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

function formatNumber(value) {
    return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function calculateDateDifference() {
    if (!startDateInput || !endDateInput || !dateResult) {
        return;
    }

    if (!startDateInput.value || !endDateInput.value) {
        dateResult.textContent = "시작일과 종료일을 모두 선택해 주세요.";
        return;
    }

    const start = new Date(`${startDateInput.value}T00:00:00`);
    const end = new Date(`${endDateInput.value}T00:00:00`);
    const milliseconds = end.getTime() - start.getTime();
    const days = Math.round(milliseconds / 86400000);
    const absoluteDays = Math.abs(days);
    const weeks = Math.floor(absoluteDays / 7);
    const remainDays = absoluteDays % 7;

    let relationText = "같은 날짜입니다.";
    if (days > 0) {
        relationText = `종료일까지 ${days}일 남았습니다.`;
    } else if (days < 0) {
        relationText = `종료일이 ${absoluteDays}일 지났습니다.`;
    }

    dateResult.innerHTML = `
        <strong>${relationText}</strong><br>
        전체 차이: ${absoluteDays}일<br>
        주 단위 환산: ${weeks}주 ${remainDays}일
    `;
}

function calculateBillSplit() {
    if (!billAmountInput || !billPeopleInput || !billExtraInput || !billResult) {
        return;
    }

    const amount = Number(billAmountInput.value);
    const people = Number(billPeopleInput.value);
    const extra = Number(billExtraInput.value || 0);

    if (!amount || amount <= 0) {
        billResult.textContent = "총 금액을 0보다 크게 입력해 주세요.";
        return;
    }

    if (!people || people < 1) {
        billResult.textContent = "인원 수는 1명 이상이어야 합니다.";
        return;
    }

    const total = amount * (1 + extra / 100);
    const perPerson = total / people;

    billResult.innerHTML = `
        <strong>1인당 ${formatNumber(perPerson)}원</strong><br>
        추가 비율 적용 총액: ${formatNumber(total)}원<br>
        원금 기준 총액: ${formatNumber(amount)}원
    `;
}

function updateTextMetrics(value) {
    const lines = value ? value.split("\n").length : 0;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;

    charCount.textContent = value.length.toString();
    lineCount.textContent = lines.toString();
    wordCount.textContent = words.toString();
}

function cleanText() {
    if (!textInput || !textOutput || !textFeedback || !trimSpacesInput || !removeEmptyInput || !dedupeLinesInput) {
        return;
    }

    const rawText = textInput.value;

    if (!rawText.trim()) {
        textOutput.value = "";
        updateTextMetrics("");
        textFeedback.textContent = "정리할 텍스트를 먼저 입력해 주세요.";
        return;
    }

    let lines = rawText.split("\n");

    if (trimSpacesInput.checked) {
        lines = lines.map((line) => line.trim());
    }

    if (removeEmptyInput.checked) {
        lines = lines.filter((line) => line !== "");
    }

    if (dedupeLinesInput.checked) {
        lines = [...new Set(lines)];
    }

    const cleaned = lines.join("\n");
    textOutput.value = cleaned;
    updateTextMetrics(cleaned);
    textFeedback.textContent = "텍스트 정리가 완료되었습니다.";
}

async function copyTextOutput() {
    if (!textOutput || !textFeedback) {
        return;
    }

    if (!textOutput.value) {
        textFeedback.textContent = "복사할 결과가 없습니다.";
        return;
    }

    try {
        await navigator.clipboard.writeText(textOutput.value);
        textFeedback.textContent = "정리된 텍스트를 클립보드에 복사했습니다.";
    } catch (error) {
        textFeedback.textContent = "브라우저에서 복사를 허용하지 않아 자동 복사에 실패했습니다.";
    }
}

function resetTextTool() {
    if (!textInput || !textOutput || !textFeedback || !trimSpacesInput || !removeEmptyInput || !dedupeLinesInput) {
        return;
    }

    textInput.value = "";
    textOutput.value = "";
    trimSpacesInput.checked = true;
    removeEmptyInput.checked = true;
    dedupeLinesInput.checked = false;
    updateTextMetrics("");
    textFeedback.textContent = "텍스트 입력과 결과를 초기화했습니다.";
}

function initializeDateTool() {
    if (!startDateInput || !endDateInput) {
        return;
    }

    const today = new Date();
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(today.getDate() + 7);

    startDateInput.value = formatDate(today);
    endDateInput.value = formatDate(oneWeekLater);
    calculateDateDifference();
}

if (dateCalcButton) {
    dateCalcButton.addEventListener("click", calculateDateDifference);
}

if (billCalcButton) {
    billCalcButton.addEventListener("click", calculateBillSplit);
}

if (textCleanButton) {
    textCleanButton.addEventListener("click", cleanText);
}

if (textCopyButton) {
    textCopyButton.addEventListener("click", copyTextOutput);
}

if (textResetButton) {
    textResetButton.addEventListener("click", resetTextTool);
}

if (textInput) {
    textInput.addEventListener("input", () => updateTextMetrics(textInput.value));
}

initializeDateTool();

if (charCount && lineCount && wordCount) {
    updateTextMetrics("");
}
