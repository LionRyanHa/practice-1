const MODE_CONFIG = {
    polaroid: {
        label: "Polaroid",
        summary: "Polaroid · 1장 촬영",
        guide: "흰 여백이 넓은 폴라로이드 프레임으로 저장됩니다.",
        buttonLabel: "폴라로이드 촬영",
        shots: 1,
        canvasWidth: 1080,
        canvasHeight: 1350,
        defaultCaption: "today's mood"
    },
    film: {
        label: "Film Strip",
        summary: "Film Strip · 4장 연속 촬영",
        guide: "4장을 순서대로 찍어 세로 포토부스 시트로 합성합니다.",
        buttonLabel: "4컷 촬영 시작",
        shots: 4,
        canvasWidth: 960,
        canvasHeight: 1600,
        defaultCaption: "four cuts"
    },
    postcard: {
        label: "Postcard",
        summary: "Postcard · 1장 촬영",
        guide: "가로형 사진과 메모 공간이 함께 들어가는 포스트카드입니다.",
        buttonLabel: "포스트카드 촬영",
        shots: 1,
        canvasWidth: 1400,
        canvasHeight: 980,
        defaultCaption: "wish you were here"
    },
    editorial: {
        label: "Editorial",
        summary: "Editorial · 1장 촬영",
        guide: "강한 타이틀이 들어가는 매거진 커버 스타일입니다.",
        buttonLabel: "매거진 커버 촬영",
        shots: 1,
        canvasWidth: 1080,
        canvasHeight: 1400,
        defaultCaption: "cover story"
    }
};

const FILTER_CONFIG = {
    natural: {
        label: "Natural",
        css: "none"
    },
    warm: {
        label: "Warm Flash",
        css: "saturate(1.08) contrast(1.03) sepia(0.14) hue-rotate(-6deg) brightness(1.02)"
    },
    mono: {
        label: "Mono",
        css: "grayscale(1) contrast(1.1) brightness(1.02)"
    },
    cool: {
        label: "Cool Sky",
        css: "saturate(1.1) contrast(1.05) hue-rotate(12deg) brightness(1.03)"
    },
    sunset: {
        label: "Sunset",
        css: "saturate(1.18) contrast(1.08) sepia(0.24) hue-rotate(-18deg) brightness(1.01)"
    }
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
});

const TIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
});

const startCameraButton = document.getElementById("start-camera-button");
const captureButton = document.getElementById("capture-button");
const stopCameraButton = document.getElementById("stop-camera-button");
const clearResultButton = document.getElementById("clear-result-button");
const downloadButton = document.getElementById("download-button");
const cameraVideo = document.getElementById("camera-video");
const previewShell = document.getElementById("preview-shell");
const resultShell = document.getElementById("result-shell");
const resultCanvas = document.getElementById("result-canvas");
const resultPlaceholder = document.getElementById("result-placeholder");
const cameraStatus = document.getElementById("camera-status");
const modeSummary = document.getElementById("mode-summary");
const previewGuide = document.getElementById("preview-guide");
const countdownBadge = document.getElementById("countdown-badge");
const cameraFacingSelect = document.getElementById("camera-facing");
const captureTimerSelect = document.getElementById("capture-timer");
const captionInput = document.getElementById("caption-input");
const accentColorInput = document.getElementById("accent-color");
const mirrorToggle = document.getElementById("mirror-toggle");
const photoUploadInput = document.getElementById("photo-upload");
const sessionGallery = document.getElementById("session-gallery");
const modeInputs = document.querySelectorAll('input[name="capture-mode"]');
const filterInputs = document.querySelectorAll('input[name="capture-filter"]');

let cameraStream = null;
let capturedFrames = [];
let sessionItems = [];
let isCapturing = false;
let isStartingCamera = false;

function getCheckedValue(name, fallbackValue) {
    const checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : fallbackValue;
}

function getModeKey() {
    return getCheckedValue("capture-mode", "polaroid");
}

function getModeConfig() {
    return MODE_CONFIG[getModeKey()];
}

function getFilterKey() {
    return getCheckedValue("capture-filter", "natural");
}

function getFilterConfig() {
    return FILTER_CONFIG[getFilterKey()];
}

function getAccentColor() {
    return accentColorInput ? accentColorInput.value : "#e85d38";
}

function getCaptionText() {
    const mode = getModeConfig();
    if (!captionInput) {
        return mode.defaultCaption;
    }

    const value = captionInput.value.trim();
    return value || mode.defaultCaption;
}

function setStatus(message, state) {
    if (!cameraStatus) {
        return;
    }

    cameraStatus.textContent = message;
    cameraStatus.dataset.state = state || "neutral";
}

function setCountdown(message) {
    if (!countdownBadge) {
        return;
    }

    countdownBadge.hidden = false;
    countdownBadge.textContent = message;
}

function clearCountdown() {
    if (!countdownBadge) {
        return;
    }

    countdownBadge.hidden = true;
    countdownBadge.textContent = "";
}

function sleep(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function updateInteractiveState() {
    const hasStream = Boolean(cameraStream);

    if (startCameraButton) {
        startCameraButton.disabled = isCapturing || isStartingCamera;
    }

    if (captureButton) {
        captureButton.disabled = !hasStream || isCapturing || isStartingCamera;
    }

    if (stopCameraButton) {
        stopCameraButton.disabled = !hasStream || isCapturing || isStartingCamera;
    }

    if (cameraFacingSelect) {
        cameraFacingSelect.disabled = isCapturing || isStartingCamera;
    }

    if (captureTimerSelect) {
        captureTimerSelect.disabled = isCapturing;
    }
}

function updatePresentation() {
    const modeKey = getModeKey();
    const mode = getModeConfig();
    const filter = getFilterConfig();
    const accent = getAccentColor();

    if (modeSummary) {
        modeSummary.textContent = mode.summary;
    }

    if (previewGuide) {
        previewGuide.textContent = mode.guide;
    }

    if (captureButton) {
        captureButton.textContent = mode.buttonLabel;
    }

    if (previewShell) {
        previewShell.dataset.mode = modeKey;
        previewShell.style.setProperty("--frame-accent", accent);
    }

    if (resultShell) {
        resultShell.dataset.mode = modeKey;
        resultShell.style.setProperty("--frame-accent", accent);
    }

    if (cameraVideo) {
        cameraVideo.style.filter = filter.css;
        cameraVideo.classList.toggle("is-mirrored", Boolean(mirrorToggle && mirrorToggle.checked));
    }

    if (capturedFrames.length > 0) {
        renderCurrentResult();
    }

    updateInteractiveState();
}

function stopCamera(silent) {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => {
            track.stop();
        });
        cameraStream = null;
    }

    if (cameraVideo) {
        cameraVideo.pause();
        cameraVideo.srcObject = null;
        cameraVideo.classList.remove("is-active");
    }

    clearCountdown();
    isCapturing = false;
    isStartingCamera = false;
    updateInteractiveState();

    if (!silent) {
        setStatus("카메라를 종료했습니다. 업로드 기능은 계속 사용할 수 있습니다.", "neutral");
    }
}

function getCameraErrorMessage(error) {
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        return "대부분의 브라우저는 HTTPS 또는 localhost 환경에서만 카메라 권한을 허용합니다.";
    }

    if (!error || !error.name) {
        return "카메라를 시작하지 못했습니다. 브라우저 권한을 확인해 주세요.";
    }

    if (error.name === "NotAllowedError") {
        return "브라우저에서 카메라 권한이 거부되었습니다.";
    }

    if (error.name === "NotFoundError") {
        return "사용 가능한 카메라를 찾지 못했습니다.";
    }

    if (error.name === "NotReadableError") {
        return "다른 앱이 이미 카메라를 사용 중일 수 있습니다.";
    }

    return "카메라를 시작하지 못했습니다. 권한과 기기 상태를 확인해 주세요.";
}

async function startCamera() {
    if (!cameraVideo || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || isCapturing || isStartingCamera) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus("이 브라우저는 카메라 접근을 지원하지 않습니다. 업로드 기능을 사용해 주세요.", "error");
        }
        return;
    }

    isStartingCamera = true;
    updateInteractiveState();
    setStatus("카메라 연결 중입니다...", "neutral");

    try {
        stopCamera(true);
        const facingMode = cameraFacingSelect && cameraFacingSelect.value === "rear" ? { ideal: "environment" } : "user";
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1440 },
                height: { ideal: 1920 }
            },
            audio: false
        });

        cameraStream = stream;
        cameraVideo.srcObject = stream;
        await cameraVideo.play();
        cameraVideo.classList.add("is-active");
        setStatus("카메라가 연결되었습니다. 구도를 맞춘 뒤 촬영하세요.", "success");
    } catch (error) {
        setStatus(getCameraErrorMessage(error), "error");
        if (cameraVideo) {
            cameraVideo.classList.remove("is-active");
        }
    }

    isStartingCamera = false;
    updatePresentation();
}

function clearResult(announce) {
    capturedFrames = [];

    if (resultCanvas) {
        resultCanvas.hidden = true;
    }

    if (resultPlaceholder) {
        resultPlaceholder.hidden = false;
    }

    if (downloadButton) {
        downloadButton.href = "#";
        downloadButton.classList.add("is-disabled");
        downloadButton.setAttribute("aria-disabled", "true");
        downloadButton.download = "frame-atelier.png";
    }

    if (photoUploadInput) {
        photoUploadInput.value = "";
    }

    if (announce) {
        setStatus("결과를 비웠습니다. 다시 촬영하거나 업로드해 보세요.", "neutral");
    }
}

function flashPreview() {
    if (!previewShell) {
        return;
    }

    previewShell.classList.remove("is-flashing");
    window.requestAnimationFrame(() => {
        previewShell.classList.add("is-flashing");
        window.setTimeout(() => {
            previewShell.classList.remove("is-flashing");
        }, 220);
    });
}

function captureCurrentFrame() {
    const frameCanvas = document.createElement("canvas");
    const width = cameraVideo.videoWidth || 1080;
    const height = cameraVideo.videoHeight || 1350;
    const context = frameCanvas.getContext("2d");

    frameCanvas.width = width;
    frameCanvas.height = height;
    context.drawImage(cameraVideo, 0, 0, width, height);

    return frameCanvas;
}

async function runCountdown(seconds, shotIndex, totalShots) {
    for (let remaining = seconds; remaining > 0; remaining -= 1) {
        const prefix = totalShots > 1 ? String(shotIndex) + "/" + String(totalShots) + " · " : "";
        setCountdown(prefix + String(remaining));
        await sleep(1000);
    }

    setCountdown("찰칵");
    await sleep(220);
}

async function captureSequence() {
    if (!cameraStream || !cameraVideo || !cameraVideo.videoWidth || isCapturing) {
        setStatus("카메라가 준비되면 촬영할 수 있습니다.", "error");
        return;
    }

    const modeKey = getModeKey();
    const mode = getModeConfig();
    const timerValue = captureTimerSelect ? Number(captureTimerSelect.value || 0) : 0;
    const countdownValue = timerValue > 0 ? timerValue : mode.shots > 1 ? 1 : 0;
    const frames = [];

    isCapturing = true;
    updateInteractiveState();
    setStatus(mode.shots > 1 ? String(mode.shots) + "장을 순서대로 촬영합니다." : "촬영을 시작합니다.", "neutral");

    try {
        for (let index = 0; index < mode.shots; index += 1) {
            if (countdownValue > 0) {
                await runCountdown(countdownValue, index + 1, mode.shots);
            }

            flashPreview();
            frames.push(captureCurrentFrame());
            setStatus(String(index + 1) + "/" + String(mode.shots) + "장 촬영했습니다.", "success");

            if (index < mode.shots - 1) {
                setCountdown("다음 컷 준비");
                await sleep(700);
            }
        }

        clearCountdown();
        capturedFrames = frames;
        renderCurrentResult();
        pushSessionItem(modeKey);
        setStatus("결과가 생성되었습니다. PNG로 저장할 수 있습니다.", "success");
    } catch (error) {
        clearCountdown();
        setStatus("촬영 중 문제가 발생했습니다. 다시 시도해 주세요.", "error");
    }

    isCapturing = false;
    updateInteractiveState();
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("이미지를 불러오지 못했습니다."));
        };

        image.src = objectUrl;
    });
}

function canvasFromImage(image) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas;
}

async function handleUploadChange(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    try {
        const image = await loadImageFromFile(file);
        capturedFrames = [canvasFromImage(image)];
        renderCurrentResult();
        pushSessionItem(getModeKey());
        setStatus("업로드한 사진으로 프레임을 만들었습니다.", "success");
    } catch (error) {
        setStatus("이미지를 불러오지 못했습니다. 다른 파일로 다시 시도해 주세요.", "error");
    }
}

function formatFileTimestamp(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");

    return year + month + day + "-" + hour + minute + second;
}

function setDownloadLink(modeKey) {
    if (!downloadButton || !resultCanvas) {
        return;
    }

    downloadButton.href = resultCanvas.toDataURL("image/png");
    downloadButton.download = "frame-atelier-" + modeKey + "-" + formatFileTimestamp(new Date()) + ".png";
    downloadButton.classList.remove("is-disabled");
    downloadButton.setAttribute("aria-disabled", "false");
}

function pushSessionItem(modeKey) {
    if (!resultCanvas) {
        return;
    }

    sessionItems.unshift({
        modeKey: modeKey,
        label: MODE_CONFIG[modeKey].label,
        time: TIME_FORMATTER.format(new Date()),
        src: resultCanvas.toDataURL("image/png")
    });

    sessionItems = sessionItems.slice(0, 6);
    renderSessionGallery();
}

function renderSessionGallery() {
    if (!sessionGallery) {
        return;
    }

    sessionGallery.innerHTML = "";

    if (sessionItems.length === 0) {
        const empty = document.createElement("article");
        empty.className = "empty-gallery";
        empty.textContent = "이번 세션 촬영본이 여기에 쌓입니다.";
        sessionGallery.appendChild(empty);
        return;
    }

    sessionItems.forEach((item) => {
        const article = document.createElement("article");
        const thumb = document.createElement("div");
        const image = document.createElement("img");
        const meta = document.createElement("div");
        const label = document.createElement("strong");
        const time = document.createElement("span");

        article.className = "session-item";
        article.dataset.mode = item.modeKey;

        thumb.className = "session-thumb";
        image.src = item.src;
        image.alt = item.label + " 결과";
        image.loading = "lazy";

        meta.className = "session-meta";
        label.textContent = item.label;
        time.textContent = item.time;

        thumb.appendChild(image);
        meta.appendChild(label);
        meta.appendChild(time);
        article.appendChild(thumb);
        article.appendChild(meta);
        sessionGallery.appendChild(article);
    });
}

function buildRoundedRectPath(context, x, y, width, height, radius) {
    const limitedRadius = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + limitedRadius, y);
    context.lineTo(x + width - limitedRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + limitedRadius);
    context.lineTo(x + width, y + height - limitedRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - limitedRadius, y + height);
    context.lineTo(x + limitedRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - limitedRadius);
    context.lineTo(x, y + limitedRadius);
    context.quadraticCurveTo(x, y, x + limitedRadius, y);
    context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
    context.save();
    buildRoundedRectPath(context, x, y, width, height, radius);
    context.fillStyle = fillStyle;
    context.fill();
    context.restore();
}

function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth) {
    context.save();
    buildRoundedRectPath(context, x, y, width, height, radius);
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeStyle;
    context.stroke();
    context.restore();
}

function getCropRect(image, targetWidth, targetHeight) {
    const imageWidth = image.width;
    const imageHeight = image.height;
    const imageRatio = imageWidth / imageHeight;
    const targetRatio = targetWidth / targetHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = imageWidth;
    let sourceHeight = imageHeight;

    if (imageRatio > targetRatio) {
        sourceWidth = imageHeight * targetRatio;
        sourceX = (imageWidth - sourceWidth) / 2;
    } else {
        sourceHeight = imageWidth / targetRatio;
        sourceY = (imageHeight - sourceHeight) / 2;
    }

    return {
        sourceX: sourceX,
        sourceY: sourceY,
        sourceWidth: sourceWidth,
        sourceHeight: sourceHeight
    };
}

function drawPhotoSlot(context, image, x, y, width, height, radius, filterCss, mirrorImage) {
    const crop = getCropRect(image, width, height);

    context.save();
    buildRoundedRectPath(context, x, y, width, height, radius);
    context.clip();
    context.filter = filterCss;

    if (mirrorImage) {
        context.translate(x + width, y);
        context.scale(-1, 1);
        context.drawImage(image, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, 0, 0, width, height);
    } else {
        context.drawImage(image, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, x, y, width, height);
    }

    context.restore();
}

function getFrameAtIndex(index) {
    if (capturedFrames.length === 0) {
        return null;
    }

    return capturedFrames[index % capturedFrames.length];
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const characters = Array.from(text);
    const lines = [];
    let currentLine = "";

    characters.forEach((character) => {
        const testLine = currentLine + character;
        if (context.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine.trim());
            currentLine = character;
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine) {
        lines.push(currentLine.trim());
    }

    const visibleLines = lines.slice(0, maxLines);
    if (lines.length > maxLines && visibleLines.length > 0) {
        visibleLines[visibleLines.length - 1] = visibleLines[visibleLines.length - 1] + "…";
    }

    visibleLines.forEach((line, index) => {
        context.fillText(line, x, y + index * lineHeight);
    });
}

function renderPolaroid(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const image = getFrameAtIndex(0);
    const cardX = 102;
    const cardY = 62;
    const cardWidth = width - 204;
    const cardHeight = height - 118;
    const photoX = cardX + 68;
    const photoY = cardY + 74;
    const photoSize = cardWidth - 136;

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#f6e9d8");
    background.addColorStop(1, "#eadbc9");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.save();
    context.shadowColor = "rgba(36, 24, 17, 0.18)";
    context.shadowBlur = 44;
    context.shadowOffsetY = 22;
    fillRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 34, "#fffdf7");
    context.restore();

    context.save();
    context.translate(cardX + 130, cardY + 20);
    context.rotate(-0.16);
    fillRoundedRect(context, -68, -14, 136, 42, 12, options.accent);
    context.restore();

    drawPhotoSlot(context, image, photoX, photoY, photoSize, photoSize, 16, options.filterCss, options.mirror);
    strokeRoundedRect(context, photoX, photoY, photoSize, photoSize, 16, "rgba(35, 23, 17, 0.1)", 2);

    context.fillStyle = "#b9b0a6";
    context.fillRect(photoX, photoY + photoSize + 44, photoSize, 2);

    context.fillStyle = "#1e1714";
    context.font = "700 58px Fraunces, serif";
    context.fillText(options.caption, photoX, photoY + photoSize + 118);

    context.fillStyle = "#6d6257";
    context.font = "500 24px IBM Plex Sans KR, sans-serif";
    context.fillText(options.dateText, photoX, cardY + cardHeight - 62);
    context.fillText("Frame Atelier", photoX + photoSize - 170, cardY + cardHeight - 62);
}

function renderFilmStrip(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const slotX = 158;
    const slotY = 146;
    const slotWidth = width - 316;
    const slotHeight = 248;
    const slotGap = 34;

    context.fillStyle = "#111010";
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < 17; index += 1) {
        const y = 64 + index * 86;
        fillRoundedRect(context, 38, y, 44, 36, 14, "#ebe3d7");
        fillRoundedRect(context, width - 82, y, 44, 36, 14, "#ebe3d7");
    }

    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    context.fillRect(118, 72, width - 236, height - 144);

    context.fillStyle = options.accent;
    context.fillRect(slotX, 70, slotWidth, 18);

    context.fillStyle = "#efe8dc";
    context.font = "700 32px IBM Plex Sans KR, sans-serif";
    context.fillText("Frame Atelier Booth", slotX, 126);

    for (let index = 0; index < 4; index += 1) {
        const frame = getFrameAtIndex(index);
        const currentY = slotY + index * (slotHeight + slotGap);

        fillRoundedRect(context, slotX, currentY, slotWidth, slotHeight, 20, "#f9f5ef");
        drawPhotoSlot(context, frame, slotX + 18, currentY + 18, slotWidth - 36, slotHeight - 36, 14, options.filterCss, options.mirror);
        strokeRoundedRect(context, slotX + 18, currentY + 18, slotWidth - 36, slotHeight - 36, 14, "rgba(33, 24, 18, 0.12)", 2);
    }

    context.fillStyle = "#efe8dc";
    context.font = "700 48px Fraunces, serif";
    context.fillText(options.caption, slotX, height - 84);

    context.font = "500 24px IBM Plex Sans KR, sans-serif";
    context.fillText(options.dateText + "  ·  " + options.filterLabel, slotX, height - 42);
}

function renderPostcard(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const cardX = 54;
    const cardY = 58;
    const cardWidth = width - 108;
    const cardHeight = height - 116;
    const photoX = cardX + 42;
    const photoY = cardY + 44;
    const photoWidth = 790;
    const photoHeight = cardHeight - 88;
    const noteX = photoX + photoWidth + 42;

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#fff5e9");
    background.addColorStop(1, "#f0ddc5");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.save();
    context.shadowColor = "rgba(39, 26, 18, 0.14)";
    context.shadowBlur = 36;
    context.shadowOffsetY = 18;
    fillRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 26, "#fffdf8");
    context.restore();

    drawPhotoSlot(context, getFrameAtIndex(0), photoX, photoY, photoWidth, photoHeight, 20, options.filterCss, options.mirror);
    strokeRoundedRect(context, photoX, photoY, photoWidth, photoHeight, 20, "rgba(39, 26, 18, 0.12)", 2);

    context.strokeStyle = "rgba(83, 61, 48, 0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(noteX - 20, cardY + 50);
    context.lineTo(noteX - 20, cardY + cardHeight - 50);
    context.stroke();

    fillRoundedRect(context, cardX + cardWidth - 180, cardY + 34, 112, 112, 24, "#f7e0cc");
    strokeRoundedRect(context, cardX + cardWidth - 180, cardY + 34, 112, 112, 24, options.accent, 4);

    context.fillStyle = options.accent;
    context.font = "700 28px Fraunces, serif";
    context.fillText("POST", cardX + cardWidth - 150, cardY + 98);

    context.fillStyle = "#201713";
    context.font = "700 56px Fraunces, serif";
    drawWrappedText(context, options.caption, noteX + 12, cardY + 146, 320, 64, 3);

    context.fillStyle = "#64574f";
    context.font = "500 27px IBM Plex Sans KR, sans-serif";
    context.fillText(options.dateText, noteX + 12, cardY + 268);
    context.fillText("filter: " + options.filterLabel, noteX + 12, cardY + 314);

    context.strokeStyle = "rgba(83, 61, 48, 0.22)";
    context.lineWidth = 2;
    for (let index = 0; index < 5; index += 1) {
        const y = cardY + 398 + index * 74;
        context.beginPath();
        context.moveTo(noteX + 12, y);
        context.lineTo(cardX + cardWidth - 46, y);
        context.stroke();
    }

    context.fillStyle = "#5b5149";
    context.font = "500 24px IBM Plex Sans KR, sans-serif";
    context.fillText("from Frame Atelier", noteX + 12, cardY + cardHeight - 58);
}

function renderEditorial(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const image = getFrameAtIndex(0);

    drawPhotoSlot(context, image, 0, 0, width, height, 0, options.filterCss, options.mirror);

    const overlay = context.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, "rgba(11, 14, 20, 0.18)");
    overlay.addColorStop(0.54, "rgba(11, 14, 20, 0.06)");
    overlay.addColorStop(1, "rgba(11, 14, 20, 0.72)");
    context.fillStyle = overlay;
    context.fillRect(0, 0, width, height);

    fillRoundedRect(context, 68, 72, 240, 54, 16, options.accent);
    context.fillStyle = "#fff9f5";
    context.font = "700 28px IBM Plex Sans KR, sans-serif";
    context.fillText("FRAME ATELIER", 98, 108);

    context.fillStyle = "#fff8f3";
    context.font = "700 112px Fraunces, serif";
    drawWrappedText(context, options.caption.toUpperCase(), 72, height - 302, width - 144, 108, 2);

    context.font = "500 30px IBM Plex Sans KR, sans-serif";
    context.fillText(options.dateText + "  ·  " + options.filterLabel, 74, height - 140);
    context.fillText("web photo booth edition", 74, height - 96);

    fillRoundedRect(context, width - 166, height - 154, 90, 90, 24, "rgba(255, 255, 255, 0.18)");
    context.fillStyle = "#fff8f3";
    context.font = "700 44px Fraunces, serif";
    context.fillText("04", width - 142, height - 98);
}

function renderCurrentResult() {
    if (!resultCanvas || capturedFrames.length === 0) {
        return;
    }

    const modeKey = getModeKey();
    const mode = getModeConfig();
    const context = resultCanvas.getContext("2d");
    const options = {
        accent: getAccentColor(),
        caption: getCaptionText(),
        dateText: DATE_FORMATTER.format(new Date()),
        filterCss: getFilterConfig().css,
        filterLabel: getFilterConfig().label,
        mirror: Boolean(mirrorToggle && mirrorToggle.checked)
    };

    resultCanvas.width = mode.canvasWidth;
    resultCanvas.height = mode.canvasHeight;
    context.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

    if (modeKey === "polaroid") {
        renderPolaroid(context, options);
    } else if (modeKey === "film") {
        renderFilmStrip(context, options);
    } else if (modeKey === "postcard") {
        renderPostcard(context, options);
    } else {
        renderEditorial(context, options);
    }

    if (resultPlaceholder) {
        resultPlaceholder.hidden = true;
    }

    resultCanvas.hidden = false;
    setDownloadLink(modeKey);
}

if (startCameraButton) {
    startCameraButton.addEventListener("click", startCamera);
}

if (captureButton) {
    captureButton.addEventListener("click", captureSequence);
}

if (stopCameraButton) {
    stopCameraButton.addEventListener("click", () => {
        stopCamera(false);
    });
}

if (clearResultButton) {
    clearResultButton.addEventListener("click", () => {
        clearResult(true);
    });
}

if (photoUploadInput) {
    photoUploadInput.addEventListener("change", handleUploadChange);
}

if (cameraFacingSelect) {
    cameraFacingSelect.addEventListener("change", () => {
        if (cameraStream) {
            startCamera();
        }
    });
}

modeInputs.forEach((input) => {
    input.addEventListener("change", updatePresentation);
});

filterInputs.forEach((input) => {
    input.addEventListener("change", updatePresentation);
});

if (captionInput) {
    captionInput.addEventListener("input", () => {
        if (capturedFrames.length > 0) {
            renderCurrentResult();
        }
    });
}

if (accentColorInput) {
    accentColorInput.addEventListener("input", updatePresentation);
}

if (mirrorToggle) {
    mirrorToggle.addEventListener("change", updatePresentation);
}

window.addEventListener("beforeunload", () => {
    stopCamera(true);
});

clearResult(false);
renderSessionGallery();
updatePresentation();
setStatus("카메라를 시작하면 상태가 여기에 표시됩니다.", "neutral");

function getModeConfig() {
    return MODE_CONFIG[getModeKey()] || MODE_CONFIG.polaroid;
}

function getFilterConfig() {
    return FILTER_CONFIG[getFilterKey()] || FILTER_CONFIG.natural;
}

function getAccentColor() {
    return accentColorInput ? accentColorInput.value : "#c8a97e";
}

function getCaptionText() {
    const mode = getModeConfig();
    const value = captionInput ? captionInput.value.trim() : "";
    return value || mode.defaultCaption;
}

function getCameraFacingValue() {
    return getCheckedValue("camera-facing", "front");
}

function getCaptureTimerValue() {
    return Number(getCheckedValue("capture-timer", "0"));
}

function syncProxyButtons() {
    document.querySelectorAll("[data-proxy-click]").forEach((button) => {
        const target = document.getElementById(button.dataset.proxyClick);

        if (!target) {
            button.disabled = true;
            return;
        }

        const isDisabled = target.tagName === "A"
            ? target.getAttribute("aria-disabled") === "true"
            : Boolean(target.disabled);

        button.disabled = isDisabled;
    });
}

function updateInteractiveState() {
    const hasStream = Boolean(cameraStream);

    if (startCameraButton) {
        startCameraButton.disabled = isCapturing || isStartingCamera;
    }

    if (captureButton) {
        captureButton.disabled = !hasStream || isCapturing || isStartingCamera;
    }

    if (stopCameraButton) {
        stopCameraButton.disabled = !hasStream || isCapturing || isStartingCamera;
    }

    document.querySelectorAll('input[name="camera-facing"]').forEach((input) => {
        input.disabled = isCapturing || isStartingCamera;
    });

    document.querySelectorAll('input[name="capture-timer"]').forEach((input) => {
        input.disabled = isCapturing;
    });

    syncProxyButtons();
}

function updatePresentation() {
    const modeKey = getModeKey();
    const mode = getModeConfig();
    const filter = getFilterConfig();
    const accent = getAccentColor();
    const captureLabel = captureButton ? captureButton.querySelector("span") : null;

    if (modeSummary) {
        modeSummary.textContent = mode.summary;
    }

    if (previewGuide) {
        previewGuide.textContent = mode.guide;
    }

    if (captureButton) {
        if (captureLabel) {
            captureLabel.textContent = mode.buttonLabel;
        } else {
            captureButton.textContent = mode.buttonLabel;
        }
    }

    if (previewShell) {
        previewShell.dataset.mode = modeKey;
        previewShell.style.setProperty("--frame-accent", accent);
    }

    if (resultShell) {
        resultShell.dataset.mode = modeKey;
        resultShell.style.setProperty("--frame-accent", accent);
    }

    if (cameraVideo) {
        cameraVideo.style.filter = filter.css;
        cameraVideo.classList.toggle("is-mirrored", Boolean(mirrorToggle && mirrorToggle.checked));
    }

    if (capturedFrames.length > 0) {
        renderCurrentResult();
    }

    updateInteractiveState();
}

function clearResult(announce) {
    capturedFrames = [];

    if (resultCanvas) {
        resultCanvas.hidden = true;
    }

    if (resultPlaceholder) {
        resultPlaceholder.hidden = false;
    }

    if (downloadButton) {
        downloadButton.href = "#";
        downloadButton.download = "frame-atelier.png";
        downloadButton.classList.add("is-disabled");
        downloadButton.setAttribute("aria-disabled", "true");
    }

    if (photoUploadInput) {
        photoUploadInput.value = "";
    }

    syncProxyButtons();

    if (announce) {
        setStatus("결과를 비웠습니다. 다시 촬영하거나 업로드해 보세요.", "neutral");
    }
}

function setDownloadLink(modeKey) {
    if (!downloadButton || !resultCanvas) {
        return;
    }

    downloadButton.href = resultCanvas.toDataURL("image/png");
    downloadButton.download = "frame-atelier-" + modeKey + "-" + formatFileTimestamp(new Date()) + ".png";
    downloadButton.classList.remove("is-disabled");
    downloadButton.setAttribute("aria-disabled", "false");
    syncProxyButtons();
}

function flashPreview() {
    if (!previewShell) {
        return;
    }

    previewShell.classList.remove("is-flashing");
    window.requestAnimationFrame(() => {
        previewShell.classList.add("is-flashing");
        window.setTimeout(() => {
            previewShell.classList.remove("is-flashing");
        }, 120);
    });
}

async function startCamera() {
    if (!cameraVideo || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || isCapturing || isStartingCamera) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus("이 브라우저는 카메라 접근을 지원하지 않습니다. 업로드 기능을 사용해 주세요.", "error");
        }
        return;
    }

    isStartingCamera = true;
    updateInteractiveState();
    setStatus("카메라 연결 중입니다...", "neutral");

    try {
        stopCamera(true);
        const facingMode = getCameraFacingValue() === "rear" ? { ideal: "environment" } : "user";
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1440 },
                height: { ideal: 1920 }
            },
            audio: false
        });

        cameraStream = stream;
        cameraVideo.srcObject = stream;
        await cameraVideo.play();
        cameraVideo.classList.add("is-active");
        setStatus("카메라가 연결되었습니다. 구도를 맞춘 뒤 촬영하세요.", "success");
    } catch (error) {
        setStatus(getCameraErrorMessage(error), "error");
        if (cameraVideo) {
            cameraVideo.classList.remove("is-active");
        }
    }

    isStartingCamera = false;
    updatePresentation();
}

async function captureSequence() {
    if (!cameraStream || !cameraVideo || !cameraVideo.videoWidth || isCapturing) {
        setStatus("카메라가 준비되면 촬영할 수 있습니다.", "error");
        return;
    }

    const modeKey = getModeKey();
    const mode = getModeConfig();
    const timerValue = getCaptureTimerValue();
    const countdownValue = timerValue > 0 ? timerValue : mode.shots > 1 ? 1 : 0;
    const frames = [];

    isCapturing = true;
    updateInteractiveState();
    setStatus(mode.shots > 1 ? String(mode.shots) + "장을 순서대로 촬영합니다." : "촬영을 시작합니다.", "neutral");

    try {
        for (let index = 0; index < mode.shots; index += 1) {
            if (countdownValue > 0) {
                await runCountdown(countdownValue, index + 1, mode.shots);
            }

            flashPreview();
            frames.push(captureCurrentFrame());
            setStatus(String(index + 1) + "/" + String(mode.shots) + "장 촬영했습니다.", "success");

            if (index < mode.shots - 1) {
                setCountdown("다음 컷 준비");
                await sleep(700);
            }
        }

        clearCountdown();
        capturedFrames = frames;
        renderCurrentResult();
        pushSessionItem(modeKey);
        setStatus("결과가 생성되었습니다. PNG로 저장할 수 있습니다.", "success");
    } catch (error) {
        clearCountdown();
        setStatus("촬영 중 문제가 발생했습니다. 다시 시도해 주세요.", "error");
    }

    isCapturing = false;
    updateInteractiveState();
}

function pushSessionItem(modeKey) {
    if (!resultCanvas) {
        return;
    }

    const stamp = formatFileTimestamp(new Date());

    sessionItems.unshift({
        modeKey: modeKey,
        label: MODE_CONFIG[modeKey].label,
        time: TIME_FORMATTER.format(new Date()),
        src: resultCanvas.toDataURL("image/png"),
        filename: "frame-atelier-" + modeKey + "-" + stamp + ".png"
    });

    sessionItems = sessionItems.slice(0, 6);
    renderSessionGallery();
}

function renderSessionGallery() {
    const gallery = document.getElementById("session-gallery");

    if (!gallery) {
        return;
    }

    gallery.innerHTML = "";

    if (sessionItems.length === 0) {
        const empty = document.createElement("article");
        empty.className = "empty-gallery";
        empty.textContent = "이번 세션의 결과물이 여기에 쌓입니다.";
        gallery.appendChild(empty);
        return;
    }

    sessionItems.forEach((item) => {
        const link = document.createElement("a");
        const thumb = document.createElement("span");
        const image = document.createElement("img");
        const overlay = document.createElement("span");
        const meta = document.createElement("span");
        const label = document.createElement("strong");
        const time = document.createElement("span");

        link.className = "session-item";
        link.dataset.mode = item.modeKey;
        link.href = item.src;
        link.download = item.filename;
        link.setAttribute("aria-label", item.label + " 결과 다운로드");

        thumb.className = "session-thumb";
        image.src = item.src;
        image.alt = item.label + " 결과";
        image.loading = "lazy";

        overlay.className = "session-overlay";
        overlay.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5v10"></path><path d="m8.5 11 3.5 3.5 3.5-3.5"></path><path d="M5 18.5h14"></path></svg>';

        meta.className = "session-meta";
        label.textContent = item.label;
        time.textContent = item.time;

        thumb.appendChild(image);
        thumb.appendChild(overlay);
        meta.appendChild(label);
        meta.appendChild(time);
        link.appendChild(thumb);
        link.appendChild(meta);
        gallery.appendChild(link);
    });
}

function renderPolaroid(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const cardX = 96;
    const cardY = 72;
    const cardWidth = width - 192;
    const cardHeight = height - 144;
    const photoX = cardX + 54;
    const photoY = cardY + 54;
    const photoWidth = cardWidth - 108;
    const photoHeight = photoWidth;

    context.fillStyle = "#efeae2";
    context.fillRect(0, 0, width, height);
    fillRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 4, "#f7f5f0");
    strokeRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 4, "#e2ddd6", 2);

    drawPhotoSlot(context, getFrameAtIndex(0), photoX, photoY, photoWidth, photoHeight, 4, options.filterCss, options.mirror);
    strokeRoundedRect(context, photoX, photoY, photoWidth, photoHeight, 4, "rgba(26, 26, 24, 0.08)", 2);

    context.fillStyle = options.accent;
    context.fillRect(photoX, photoY + photoHeight + 40, 120, 2);

    context.fillStyle = "#1a1a18";
    context.font = '300 62px "Cormorant Garamond", "Noto Serif KR", serif';
    drawWrappedText(context, options.caption, photoX, photoY + photoHeight + 88, photoWidth, 58, 2);

    context.fillStyle = "#8a8578";
    context.font = '300 24px "DM Sans", "Noto Sans KR", sans-serif';
    context.fillText(options.dateText, photoX, cardY + cardHeight - 44);
    context.textAlign = "right";
    context.fillText("FRAME ATELIER", photoX + photoWidth, cardY + cardHeight - 44);
    context.textAlign = "left";
}

function renderFilmStrip(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const slotX = 146;
    const slotY = 138;
    const slotWidth = width - 292;
    const slotHeight = 244;
    const slotGap = 32;

    context.fillStyle = "#1c1b19";
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < 16; index += 1) {
        const y = 64 + index * 92;
        fillRoundedRect(context, 34, y, 42, 36, 4, "#f0ebe3");
        fillRoundedRect(context, width - 76, y, 42, 36, 4, "#f0ebe3");
    }

    context.fillStyle = options.accent;
    context.fillRect(slotX, 78, slotWidth, 2);

    context.fillStyle = "#f7f5f0";
    context.font = '300 18px "DM Sans", "Noto Sans KR", sans-serif';
    context.fillText("FRAME ATELIER BOOTH", slotX, 62);

    for (let index = 0; index < 4; index += 1) {
        const frame = getFrameAtIndex(index);
        const currentY = slotY + index * (slotHeight + slotGap);

        fillRoundedRect(context, slotX, currentY, slotWidth, slotHeight, 4, "#f7f5f0");
        drawPhotoSlot(context, frame, slotX + 16, currentY + 16, slotWidth - 32, slotHeight - 32, 4, options.filterCss, options.mirror);
        strokeRoundedRect(context, slotX + 16, currentY + 16, slotWidth - 32, slotHeight - 32, 4, "rgba(26, 26, 24, 0.08)", 2);
    }

    context.fillStyle = "#f7f5f0";
    context.font = '300 46px "Cormorant Garamond", "Noto Serif KR", serif';
    context.fillText(options.caption, slotX, height - 84);

    context.fillStyle = "#8a8578";
    context.font = '300 22px "DM Sans", "Noto Sans KR", sans-serif';
    context.fillText(options.dateText + "  ·  " + options.filterLabel, slotX, height - 42);
}

function renderPostcard(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const cardX = 54;
    const cardY = 56;
    const cardWidth = width - 108;
    const cardHeight = height - 112;
    const photoX = cardX + 34;
    const photoY = cardY + 34;
    const photoWidth = 800;
    const photoHeight = cardHeight - 68;
    const noteX = photoX + photoWidth + 42;

    context.fillStyle = "#efeae2";
    context.fillRect(0, 0, width, height);
    fillRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 4, "#f7f5f0");
    strokeRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 4, "#e2ddd6", 2);

    drawPhotoSlot(context, getFrameAtIndex(0), photoX, photoY, photoWidth, photoHeight, 4, options.filterCss, options.mirror);
    strokeRoundedRect(context, photoX, photoY, photoWidth, photoHeight, 4, "rgba(26, 26, 24, 0.08)", 2);

    context.strokeStyle = "#e2ddd6";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(noteX - 18, cardY + 34);
    context.lineTo(noteX - 18, cardY + cardHeight - 34);
    context.stroke();

    strokeRoundedRect(context, cardX + cardWidth - 170, cardY + 32, 104, 104, 4, options.accent, 2);
    context.fillStyle = options.accent;
    context.font = '300 22px "DM Sans", "Noto Sans KR", sans-serif';
    context.fillText("POST", cardX + cardWidth - 145, cardY + 90);

    context.fillStyle = "#1a1a18";
    context.font = '300 52px "Cormorant Garamond", "Noto Serif KR", serif';
    drawWrappedText(context, options.caption, noteX + 8, cardY + 146, 320, 56, 3);

    context.fillStyle = "#8a8578";
    context.font = '300 24px "DM Sans", "Noto Sans KR", sans-serif';
    context.fillText(options.dateText, noteX + 8, cardY + 270);
    context.fillText(options.filterLabel, noteX + 8, cardY + 316);

    context.strokeStyle = "#e2ddd6";
    for (let index = 0; index < 5; index += 1) {
        const y = cardY + 404 + index * 72;
        context.beginPath();
        context.moveTo(noteX + 8, y);
        context.lineTo(cardX + cardWidth - 40, y);
        context.stroke();
    }
}

function renderEditorial(context, options) {
    const width = context.canvas.width;
    const height = context.canvas.height;

    drawPhotoSlot(context, getFrameAtIndex(0), 0, 0, width, height, 0, options.filterCss, options.mirror);

    const overlay = context.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, "rgba(28, 27, 25, 0.08)");
    overlay.addColorStop(0.6, "rgba(28, 27, 25, 0.14)");
    overlay.addColorStop(1, "rgba(28, 27, 25, 0.74)");
    context.fillStyle = overlay;
    context.fillRect(0, 0, width, height);

    context.fillStyle = options.accent;
    context.fillRect(72, 74, 148, 2);

    context.fillStyle = "#f7f5f0";
    context.font = '300 22px "DM Sans", "Noto Sans KR", sans-serif';
    context.fillText("FRAME ATELIER", 72, 108);

    context.font = '300 104px "Cormorant Garamond", "Noto Serif KR", serif';
    drawWrappedText(context, options.caption, 72, height - 272, width - 144, 98, 2);

    context.font = '300 24px "DM Sans", "Noto Sans KR", sans-serif';
    context.fillText(options.dateText + "  ·  " + options.filterLabel, 72, height - 108);

    context.textAlign = "right";
    context.font = '300 42px "Cormorant Garamond", "Noto Serif KR", serif';
    context.fillText("04", width - 72, height - 92);
    context.textAlign = "left";
}

function refreshStudioConfig() {
    MODE_CONFIG.polaroid.summary = "Polaroid · 1장 촬영";
    MODE_CONFIG.polaroid.guide = "넓은 종이 여백이 있는 폴라로이드 레이아웃으로 저장됩니다.";
    MODE_CONFIG.polaroid.buttonLabel = "Polaroid 촬영";
    MODE_CONFIG.polaroid.defaultCaption = "today's mood";

    MODE_CONFIG.film.summary = "Film Strip · 4장 촬영";
    MODE_CONFIG.film.guide = "네 컷을 순서대로 찍어 세로 필름 시트로 정리합니다.";
    MODE_CONFIG.film.buttonLabel = "Film Strip 촬영";
    MODE_CONFIG.film.defaultCaption = "contact sheet";

    MODE_CONFIG.postcard.summary = "Postcard · 1장 촬영";
    MODE_CONFIG.postcard.guide = "사진과 메모가 함께 놓인 포스트카드 레이아웃으로 저장됩니다.";
    MODE_CONFIG.postcard.buttonLabel = "Postcard 촬영";
    MODE_CONFIG.postcard.defaultCaption = "wish you were here";

    MODE_CONFIG.editorial.summary = "Editorial · 1장 촬영";
    MODE_CONFIG.editorial.guide = "큰 제목과 커버 무드가 들어가는 에디토리얼 프레임으로 저장됩니다.";
    MODE_CONFIG.editorial.buttonLabel = "Editorial 촬영";
    MODE_CONFIG.editorial.defaultCaption = "cover line";

    Object.keys(FILTER_CONFIG).forEach((key) => {
        delete FILTER_CONFIG[key];
    });

    Object.assign(FILTER_CONFIG, {
        natural: {
            label: "Natural",
            css: "none"
        },
        paper: {
            label: "Paper Warm",
            css: "saturate(1.02) sepia(0.08) brightness(1.04)"
        },
        mono: {
            label: "Mono Grain",
            css: "grayscale(1) contrast(1.08) brightness(1.02)"
        },
        sepia: {
            label: "Sepia Fade",
            css: "sepia(0.3) saturate(0.95) contrast(1.06) brightness(1.03)"
        },
        noir: {
            label: "Studio Noir",
            css: "grayscale(0.4) sepia(0.18) contrast(1.16) brightness(0.94)"
        }
    });
}

function setMenuOpen(open) {
    const toggle = document.querySelector(".menu-toggle");
    const drawer = document.getElementById("mobile-drawer");

    if (!toggle || !drawer) {
        return;
    }

    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    drawer.hidden = !open;
    document.body.classList.toggle("is-menu-open", open);
}

function setSettingsOpen(open) {
    const scrim = document.querySelector(".studio-settings-scrim");

    if (!window.matchMedia("(max-width: 767px)").matches) {
        document.body.classList.remove("is-settings-open");
        if (scrim) {
            scrim.hidden = true;
        }
        return;
    }

    document.body.classList.toggle("is-settings-open", open);

    if (scrim) {
        scrim.hidden = !open;
    }
}

function updateHeaderState() {
    document.body.classList.toggle("is-scrolled", window.scrollY > 16);
}

function initRevealObserver() {
    const targets = document.querySelectorAll("[data-reveal]");

    if (!targets.length) {
        return;
    }

    if (!("IntersectionObserver" in window)) {
        targets.forEach((target) => target.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.6
    });

    targets.forEach((target) => observer.observe(target));
}

function initSharedUI() {
    const menuToggle = document.querySelector(".menu-toggle");

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
            setMenuOpen(!isOpen);
        });
    }

    document.querySelectorAll(".mobile-nav a").forEach((link) => {
        link.addEventListener("click", () => {
            setMenuOpen(false);
        });
    });

    document.querySelectorAll("[data-open-settings]").forEach((button) => {
        button.addEventListener("click", () => {
            setSettingsOpen(true);
        });
    });

    document.querySelectorAll("[data-close-settings]").forEach((button) => {
        button.addEventListener("click", () => {
            setSettingsOpen(false);
        });
    });

    document.querySelectorAll("[data-proxy-click]").forEach((button) => {
        button.addEventListener("click", () => {
            const target = document.getElementById(button.dataset.proxyClick);

            if (!target) {
                return;
            }

            if (target.tagName === "A" && target.getAttribute("aria-disabled") === "true") {
                return;
            }

            if (target.disabled) {
                return;
            }

            target.click();
        });
    });

    document.querySelectorAll("[data-mode-target]").forEach((link) => {
        link.addEventListener("click", (event) => {
            const nextMode = link.dataset.modeTarget;
            const nextInput = document.querySelector('input[name="capture-mode"][value="' + nextMode + '"]');

            if (!nextInput) {
                return;
            }

            event.preventDefault();
            nextInput.checked = true;
            updatePresentation();

            const studio = document.getElementById("studio");
            if (studio) {
                studio.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });

    document.querySelectorAll('input[name="camera-facing"]').forEach((input) => {
        input.addEventListener("change", () => {
            if (cameraStream) {
                startCamera();
            } else {
                updateInteractiveState();
            }
        });
    });

    window.addEventListener("scroll", updateHeaderState, { passive: true });
    window.addEventListener("resize", () => {
        if (!window.matchMedia("(max-width: 767px)").matches) {
            setMenuOpen(false);
            setSettingsOpen(false);
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuOpen(false);
            setSettingsOpen(false);
        }
    });

    updateHeaderState();
    initRevealObserver();
    window.requestAnimationFrame(() => {
        document.body.classList.add("is-page-ready");
    });
}

refreshStudioConfig();
initSharedUI();
updatePresentation();
renderSessionGallery();
syncProxyButtons();
