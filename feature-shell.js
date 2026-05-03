const CAPTURE_FILTERS = {
    natural: {
        label: "Natural",
        previewCss: "none",
        captureCss: "none"
    },
    selfie: {
        label: "Selfie Pop",
        previewCss: "saturate(1.08) contrast(1.04) brightness(1.02)",
        captureCss: "saturate(1.08) contrast(1.04) brightness(1.02)"
    },
    cool: {
        label: "Cool Air",
        previewCss: "saturate(1.04) contrast(1.06) hue-rotate(8deg) brightness(1.02)",
        captureCss: "saturate(1.04) contrast(1.06) hue-rotate(8deg) brightness(1.02)"
    },
    sunset: {
        label: "Sunset",
        previewCss: "saturate(1.12) contrast(1.08) sepia(0.16) hue-rotate(-8deg)",
        captureCss: "saturate(1.12) contrast(1.08) sepia(0.16) hue-rotate(-8deg)"
    },
    mono: {
        label: "Mono",
        previewCss: "grayscale(1) contrast(1.12) brightness(1.04)",
        captureCss: "grayscale(1) contrast(1.12) brightness(1.04)"
    }
};

const EDIT_PRESETS = {
    natural: {
        label: "Natural",
        brightness: 100,
        contrast: 100,
        saturation: 100,
        warmth: 0,
        fade: 0
    },
    bright: {
        label: "Bright",
        brightness: 108,
        contrast: 104,
        saturation: 108,
        warmth: 4,
        fade: 0
    },
    soft: {
        label: "Soft",
        brightness: 104,
        contrast: 94,
        saturation: 92,
        warmth: 12,
        fade: 8
    },
    cool: {
        label: "Cool",
        brightness: 102,
        contrast: 106,
        saturation: 104,
        warmth: -18,
        fade: 2
    },
    vintage: {
        label: "Vintage",
        brightness: 102,
        contrast: 92,
        saturation: 82,
        warmth: 22,
        fade: 16
    },
    mono: {
        label: "Mono",
        brightness: 104,
        contrast: 116,
        saturation: 0,
        warmth: 0,
        fade: 4
    },
    custom: {
        label: "Custom",
        brightness: 100,
        contrast: 100,
        saturation: 100,
        warmth: 0,
        fade: 0
    }
};

const FRAME_STYLES = {
    clean: { label: "Clean White" },
    rounded: { label: "Rounded" },
    polaroid: { label: "Polaroid" },
    ticket: { label: "Ticket" }
};

const BOOTH_STYLES = {
    clean: {
        label: "Clean",
        background: "#faf6f1",
        panel: "#ffffff",
        border: "rgba(18, 18, 18, 0.12)",
        accent: "#171717",
        text: "#171717",
        perforation: "#ede4da"
    },
    dark: {
        label: "Dark",
        background: "#151311",
        panel: "#211d18",
        border: "rgba(255, 248, 241, 0.1)",
        accent: "#f1d3b3",
        text: "#f5ede4",
        perforation: "#2d2721"
    },
    pop: {
        label: "Pop",
        background: "#fff2d1",
        panel: "#fffdf8",
        border: "rgba(255, 109, 67, 0.24)",
        accent: "#ff6d43",
        text: "#2a1d19",
        perforation: "#ffd6c8"
    }
};

const CAMERA_FACING_OPTIONS = {
    front: { label: "전면" },
    rear: { label: "후면" }
};

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

const TIME_LABEL_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
});

const elements = {
    selectedCountBadge: document.getElementById("selectedCountBadge"),
    status: document.getElementById("app-status"),
    previewFrame: document.getElementById("preview-frame"),
    cameraVideo: document.getElementById("camera-video"),
    filterChip: document.getElementById("filter-chip"),
    zoomChip: document.getElementById("zoom-chip"),
    startCameraButton: document.getElementById("start-camera-button"),
    captureButton: document.getElementById("capture-button"),
    stopCameraButton: document.getElementById("stop-camera-button"),
    uploadInput: document.getElementById("photo-upload"),
    cameraFacing: document.getElementById("camera-facing"),
    captureFilter: document.getElementById("capture-filter"),
    cameraZoom: document.getElementById("camera-zoom"),
    cameraZoomValue: document.getElementById("camera-zoom-value"),
    zoomHint: document.getElementById("zoom-support-hint"),
    shotCount: document.getElementById("shot-count"),
    shotLibrary: document.getElementById("shot-library"),
    editSelectionLabel: document.getElementById("edit-selection-label"),
    editEmpty: document.getElementById("edit-empty"),
    editCanvas: document.getElementById("edit-canvas"),
    applyEditButton: document.getElementById("apply-edit-button"),
    downloadEditButton: document.getElementById("download-edit-button"),
    editFrame: document.getElementById("edit-frame"),
    editPreset: document.getElementById("edit-preset"),
    brightnessRange: document.getElementById("brightness-range"),
    brightnessValue: document.getElementById("brightness-value"),
    contrastRange: document.getElementById("contrast-range"),
    contrastValue: document.getElementById("contrast-value"),
    saturationRange: document.getElementById("saturation-range"),
    saturationValue: document.getElementById("saturation-value"),
    warmthRange: document.getElementById("warmth-range"),
    warmthValue: document.getElementById("warmth-value"),
    fadeRange: document.getElementById("fade-range"),
    fadeValue: document.getElementById("fade-value"),
    boothCount: document.getElementById("booth-count"),
    boothEmpty: document.getElementById("booth-empty"),
    boothCanvas: document.getElementById("booth-canvas"),
    boothStyle: document.getElementById("booth-style"),
    boothSelection: document.getElementById("booth-selection"),
    generateStripButton: document.getElementById("generate-strip-button"),
    downloadStripButton: document.getElementById("download-strip-button"),
    navButtons: Array.from(document.querySelectorAll(".nav-btn")),
    pageSections: Array.from(document.querySelectorAll(".page-section"))
};

const state = {
    cameraStream: null,
    isStartingCamera: false,
    isCapturing: false,
    capture: {
        facingMode: "front",
        filterKey: "natural",
        zoom: 1,
        nativeZoomSupported: false
    },
    shots: [],
    edit: {
        selectedShotId: null,
        draft: createDefaultEditSettings(),
        dirty: false
    },
    booth: {
        selectedIds: [],
        styleKey: "clean"
    },
    ui: {
        activeSectionId: "cameraSection"
    }
};

const editRangeBindings = [
    { key: "brightness", input: elements.brightnessRange, output: elements.brightnessValue },
    { key: "contrast", input: elements.contrastRange, output: elements.contrastValue },
    { key: "saturation", input: elements.saturationRange, output: elements.saturationValue },
    { key: "warmth", input: elements.warmthRange, output: elements.warmthValue },
    { key: "fade", input: elements.fadeRange, output: elements.fadeValue }
];

initialize();

function initialize() {
    populateSelect(elements.cameraFacing, CAMERA_FACING_OPTIONS, state.capture.facingMode);
    populateSelect(elements.captureFilter, CAPTURE_FILTERS, state.capture.filterKey);
    populateSelect(elements.editFrame, FRAME_STYLES, state.edit.draft.frameKey);
    populateSelect(elements.editPreset, EDIT_PRESETS, state.edit.draft.presetKey);
    populateSelect(elements.boothStyle, BOOTH_STYLES, state.booth.styleKey);
    bindEvents();
    syncEditControls();
    configureDigitalZoomFallback();
    updateCapturePreview();
    renderShotLibrary();
    renderEditPreview();
    renderBoothSelection();
    renderBoothPreview();
    updateActionState();
    showSection(state.ui.activeSectionId);
    exposeFeatureApi();
}

function bindEvents() {
    elements.navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            showSection(button.dataset.target);
        });
    });

    elements.startCameraButton.addEventListener("click", () => {
        void startCamera();
    });

    elements.captureButton.addEventListener("click", () => {
        void capturePhoto();
    });

    elements.stopCameraButton.addEventListener("click", () => {
        stopCamera(false);
    });

    elements.uploadInput.addEventListener("change", (event) => {
        void handlePhotoUpload(event);
    });

    elements.cameraFacing.addEventListener("change", () => {
        state.capture.facingMode = elements.cameraFacing.value;
        updateCapturePreview();
        if (state.cameraStream) {
            void startCamera();
        }
    });

    elements.captureFilter.addEventListener("change", () => {
        state.capture.filterKey = elements.captureFilter.value;
        updateCapturePreview();
    });

    elements.cameraZoom.addEventListener("input", () => {
        void handleZoomInput();
    });

    elements.editPreset.addEventListener("change", () => {
        if (!getSelectedShot()) {
            return;
        }

        const frameKey = state.edit.draft.frameKey;
        state.edit.draft = createDefaultEditSettings(elements.editPreset.value, frameKey);
        state.edit.dirty = true;
        syncEditControls();
        renderEditPreview();
        renderBoothPreview();
        updateActionState();
    });

    elements.editFrame.addEventListener("change", () => {
        if (!getSelectedShot()) {
            return;
        }

        state.edit.draft.frameKey = elements.editFrame.value;
        state.edit.dirty = true;
        syncEditControls();
        renderEditPreview();
        renderBoothPreview();
        updateActionState();
    });

    editRangeBindings.forEach((binding) => {
        binding.input.addEventListener("input", () => {
            if (!getSelectedShot()) {
                return;
            }

            state.edit.draft[binding.key] = Number(binding.input.value);
            state.edit.draft.presetKey = "custom";
            state.edit.dirty = true;
            syncEditControls();
            renderEditPreview();
            renderBoothPreview();
            updateActionState();
        });
    });

    elements.applyEditButton.addEventListener("click", () => {
        applyEditToSelectedShot();
    });

    elements.boothStyle.addEventListener("change", () => {
        state.booth.styleKey = elements.boothStyle.value;
        renderBoothPreview();
        updateActionState();
    });

    elements.generateStripButton.addEventListener("click", () => {
        renderBoothPreview();

        if (getSelectedBoothShots().length > 0) {
            pulseSurface(elements.boothCanvas.closest(".strip-box"), "generated");
            setStatus("4컷 스트립을 갱신했습니다.", "success");
        }
    });

    elements.shotLibrary.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-action]");

        if (!actionButton) {
            return;
        }

        const shotId = actionButton.dataset.shotId;

        if (actionButton.dataset.action === "select-shot") {
            selectShot(shotId, true);
            return;
        }

        if (actionButton.dataset.action === "toggle-booth") {
            toggleBoothSelection(shotId);
        }
    });

    elements.boothSelection.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-action]");

        if (!actionButton) {
            return;
        }

        const shotId = actionButton.dataset.shotId;

        if (actionButton.dataset.action === "select-shot") {
            selectShot(shotId, true);
            return;
        }

        if (actionButton.dataset.action === "remove-booth") {
            toggleBoothSelection(shotId);
        }
    });

    window.addEventListener("beforeunload", () => {
        stopCamera(true);
    });
}

function showSection(sectionId) {
    const targetId = sectionId || "cameraSection";

    state.ui.activeSectionId = targetId;

    elements.pageSections.forEach((section) => {
        section.classList.toggle("hidden", section.id !== targetId);
    });

    elements.navButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.target === targetId);
    });
}

function pulseSurface(element, className) {
    if (!element) {
        return;
    }

    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
}

function updateSelectedCountBadge(count) {
    if (!elements.selectedCountBadge) {
        return;
    }

    elements.selectedCountBadge.textContent = String(count) + "/4 선택";
}

function populateSelect(select, options, selectedKey) {
    select.innerHTML = "";

    Object.entries(options).forEach(([key, config]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = config.label;
        select.appendChild(option);
    });

    select.value = selectedKey;
}

function createDefaultEditSettings(presetKey = "natural", frameKey = "clean") {
    const preset = EDIT_PRESETS[presetKey] || EDIT_PRESETS.natural;

    return {
        presetKey: presetKey,
        frameKey: frameKey,
        brightness: preset.brightness,
        contrast: preset.contrast,
        saturation: preset.saturation,
        warmth: preset.warmth,
        fade: preset.fade
    };
}

function setStatus(message, tone) {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone || "neutral";
}

function updateCapturePreview() {
    const filter = getCaptureFilter();
    const previewZoom = state.capture.nativeZoomSupported ? 1 : state.capture.zoom;
    const transformParts = [];

    if (state.capture.facingMode === "front") {
        transformParts.push("scaleX(-1)");
    }

    transformParts.push("scale(" + previewZoom.toFixed(3) + ")");

    elements.cameraVideo.style.filter = filter.previewCss;
    elements.cameraVideo.style.transform = transformParts.join(" ");
    elements.filterChip.textContent = filter.label;
    elements.zoomChip.textContent = state.capture.zoom.toFixed(1) + "x";
    elements.cameraZoomValue.textContent = state.capture.zoom.toFixed(1) + "x";
    elements.zoomHint.textContent = state.capture.nativeZoomSupported
        ? "기기 줌을 사용 중입니다."
        : "기기 줌을 지원하지 않으면 디지털 줌으로 동작합니다.";
}

function updateActionState() {
    const hasStream = Boolean(state.cameraStream);
    const hasSelectedShot = Boolean(getSelectedShot());
    const hasBoothSelection = getSelectedBoothShots().length > 0;

    elements.startCameraButton.disabled = hasStream || state.isStartingCamera || state.isCapturing;
    elements.captureButton.disabled = !hasStream || state.isStartingCamera || state.isCapturing;
    elements.stopCameraButton.disabled = !hasStream || state.isStartingCamera || state.isCapturing;
    elements.cameraFacing.disabled = state.isStartingCamera || state.isCapturing;
    elements.captureFilter.disabled = state.isCapturing;
    elements.cameraZoom.disabled = state.isCapturing;
    elements.uploadInput.disabled = state.isCapturing;
    elements.uploadInput.closest(".upload-btn").classList.toggle("is-disabled", state.isCapturing);

    elements.editPreset.disabled = !hasSelectedShot;
    elements.editFrame.disabled = !hasSelectedShot;
    elements.applyEditButton.disabled = !hasSelectedShot;

    editRangeBindings.forEach((binding) => {
        binding.input.disabled = !hasSelectedShot;
    });

    elements.boothStyle.disabled = !hasBoothSelection;
    elements.generateStripButton.disabled = !hasBoothSelection;

    if (!hasSelectedShot || elements.editCanvas.hidden) {
        setAnchorState(elements.downloadEditButton, false);
    }

    if (!hasBoothSelection || elements.boothCanvas.hidden) {
        setAnchorState(elements.downloadStripButton, false);
    }
}

function setAnchorState(anchor, enabled, href, filename) {
    anchor.classList.toggle("is-disabled", !enabled);
    anchor.setAttribute("aria-disabled", enabled ? "false" : "true");

    if (enabled) {
        anchor.href = href;
        anchor.download = filename;
    } else {
        anchor.href = "#";
    }
}

function getCaptureFilter() {
    return CAPTURE_FILTERS[state.capture.filterKey] || CAPTURE_FILTERS.natural;
}

function getSelectedShot() {
    return getShotById(state.edit.selectedShotId);
}

function getShotById(shotId) {
    return state.shots.find((shot) => shot.id === shotId) || null;
}

function getSelectedBoothShots() {
    return state.booth.selectedIds
        .map((shotId) => getShotById(shotId))
        .filter(Boolean);
}

function getCameraTrack() {
    if (!state.cameraStream) {
        return null;
    }

    return state.cameraStream.getVideoTracks()[0] || null;
}

function configureDigitalZoomFallback() {
    state.capture.nativeZoomSupported = false;
    state.capture.zoom = clamp(state.capture.zoom, 1, 3);
    elements.cameraZoom.min = "1";
    elements.cameraZoom.max = "3";
    elements.cameraZoom.step = "0.1";
    elements.cameraZoom.value = String(state.capture.zoom);
}

async function configureZoomSupport() {
    const track = getCameraTrack();

    if (!track || typeof track.getCapabilities !== "function") {
        configureDigitalZoomFallback();
        updateCapturePreview();
        return;
    }

    const capabilities = track.getCapabilities();

    if (!capabilities || typeof capabilities.zoom === "undefined") {
        configureDigitalZoomFallback();
        updateCapturePreview();
        return;
    }

    state.capture.nativeZoomSupported = true;
    elements.cameraZoom.min = String(capabilities.zoom.min || 1);
    elements.cameraZoom.max = String(capabilities.zoom.max || 3);
    elements.cameraZoom.step = String(capabilities.zoom.step || 0.1);
    state.capture.zoom = clamp(
        state.capture.zoom,
        Number(elements.cameraZoom.min),
        Number(elements.cameraZoom.max)
    );
    elements.cameraZoom.value = String(state.capture.zoom);

    await applyNativeZoom(state.capture.zoom);
    updateCapturePreview();
}

async function applyNativeZoom(value) {
    const track = getCameraTrack();

    if (!track || typeof track.applyConstraints !== "function") {
        return;
    }

    try {
        await track.applyConstraints({
            advanced: [{ zoom: value }]
        });
    } catch (error) {
        configureDigitalZoomFallback();
    }
}

async function handleZoomInput() {
    state.capture.zoom = Number(elements.cameraZoom.value);

    if (state.cameraStream && state.capture.nativeZoomSupported) {
        await applyNativeZoom(state.capture.zoom);
    }

    updateCapturePreview();
}

async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || state.isStartingCamera || state.isCapturing) {
        setStatus("이 브라우저에서는 카메라를 열 수 없습니다. 사진 불러오기를 사용하세요.", "error");
        return;
    }

    state.isStartingCamera = true;
    updateActionState();
    setStatus("카메라를 연결 중입니다.", "neutral");

    try {
        stopCamera(true);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: state.capture.facingMode === "rear" ? { ideal: "environment" } : "user",
                width: { ideal: 1440 },
                height: { ideal: 1920 }
            },
            audio: false
        });

        state.cameraStream = stream;
        elements.cameraVideo.srcObject = stream;
        await elements.cameraVideo.play();
        elements.previewFrame.classList.add("is-live");
        await configureZoomSupport();
        updateCapturePreview();
        setStatus("카메라가 준비되었습니다.", "success");
    } catch (error) {
        elements.previewFrame.classList.remove("is-live");
        setStatus(getCameraErrorMessage(error), "error");
    }

    state.isStartingCamera = false;
    updateActionState();
}

function stopCamera(silent) {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach((track) => {
            track.stop();
        });
        state.cameraStream = null;
    }

    elements.cameraVideo.pause();
    elements.cameraVideo.srcObject = null;
    elements.previewFrame.classList.remove("is-live");
    configureDigitalZoomFallback();
    updateCapturePreview();
    updateActionState();

    if (!silent) {
        setStatus("카메라를 종료했습니다.", "neutral");
    }
}

function getCameraErrorMessage(error) {
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        return "카메라는 HTTPS 또는 localhost 환경에서만 정상 동작합니다.";
    }

    if (!error || !error.name) {
        return "카메라를 시작하지 못했습니다.";
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

    return "카메라를 시작하지 못했습니다.";
}

async function capturePhoto() {
    if (!state.cameraStream || !elements.cameraVideo.videoWidth || state.isCapturing) {
        setStatus("카메라가 준비되면 촬영할 수 있습니다.", "error");
        return;
    }

    state.isCapturing = true;
    pulseSurface(elements.captureButton, "is-capturing");
    updateActionState();
    setStatus("촬영 중입니다.", "neutral");

    try {
        flashPreview();
        let frameCanvas = captureFrameFromVideo();
        frameCanvas = await runExternalCaptureProcessor(frameCanvas);
        const shot = createShot(frameCanvas);
        addShot(shot);
        setStatus("촬영본을 추가했습니다.", "success");
    } catch (error) {
        setStatus("촬영에 실패했습니다.", "error");
    }

    state.isCapturing = false;
    updateActionState();
}

function flashPreview() {
    elements.previewFrame.classList.remove("is-flashing");
    window.requestAnimationFrame(() => {
        elements.previewFrame.classList.add("is-flashing");
        window.setTimeout(() => {
            elements.previewFrame.classList.remove("is-flashing");
        }, 180);
    });
}

function captureFrameFromVideo() {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const videoWidth = elements.cameraVideo.videoWidth || 1080;
    const videoHeight = elements.cameraVideo.videoHeight || 1440;
    const effectiveZoom = state.capture.nativeZoomSupported ? 1 : state.capture.zoom;
    const cropWidth = videoWidth / effectiveZoom;
    const cropHeight = videoHeight / effectiveZoom;
    const sourceX = (videoWidth - cropWidth) / 2;
    const sourceY = (videoHeight - cropHeight) / 2;

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    context.filter = getCaptureFilter().captureCss;
    context.drawImage(
        elements.cameraVideo,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        videoWidth,
        videoHeight
    );

    return canvas;
}

async function runExternalCaptureProcessor(canvas) {
    const filter = getCaptureFilter();

    if (typeof filter.processor !== "function") {
        return canvas;
    }

    const output = await filter.processor(cloneCanvas(canvas), getStateSnapshot());
    return output instanceof HTMLCanvasElement ? output : canvas;
}

function createShot(canvas) {
    return {
        id: createId(),
        name: "컷 " + String(state.shots.length + 1),
        createdAt: new Date(),
        originalCanvas: cloneCanvas(canvas),
        originalUrl: canvas.toDataURL("image/png"),
        editedCanvas: null,
        editedUrl: "",
        editSettings: null
    };
}

function addShot(shot) {
    state.shots.unshift(shot);

    if (state.booth.selectedIds.length < 4) {
        state.booth.selectedIds = state.booth.selectedIds.concat(shot.id);
    }

    selectShot(shot.id, false);
    renderShotLibrary();
    renderBoothSelection();
    renderBoothPreview();
    updateActionState();
}

async function handlePhotoUpload(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    try {
        const image = await loadImageFromFile(file);
        addShot(createShot(canvasFromImage(image)));
        setStatus("사진을 불러왔습니다.", "success");
    } catch (error) {
        setStatus("사진을 불러오지 못했습니다.", "error");
    }

    event.target.value = "";
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("image-load-failed"));
        };

        image.src = url;
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

function selectShot(shotId, announce) {
    const shot = getShotById(shotId);

    if (!shot) {
        return;
    }

    state.edit.selectedShotId = shot.id;
    state.edit.draft = shot.editSettings
        ? { ...shot.editSettings }
        : createDefaultEditSettings();
    state.edit.dirty = false;
    syncEditControls();
    renderEditPreview();
    renderShotLibrary();
    updateActionState();

    if (announce) {
        showSection("editSection");
        setStatus(shot.name + " 편집을 열었습니다.", "neutral");
    }
}

function syncEditControls() {
    const draft = state.edit.draft;

    elements.editFrame.value = draft.frameKey;
    elements.editPreset.value = draft.presetKey;

    editRangeBindings.forEach((binding) => {
        binding.input.value = String(draft[binding.key]);
        binding.output.textContent = String(draft[binding.key]);
    });
}

function applyEditToSelectedShot() {
    const shot = getSelectedShot();

    if (!shot || elements.editCanvas.hidden) {
        return;
    }

    shot.editedCanvas = cloneCanvas(elements.editCanvas);
    shot.editedUrl = shot.editedCanvas.toDataURL("image/png");
    shot.editSettings = { ...state.edit.draft };
    state.edit.dirty = false;
    renderShotLibrary();
    renderBoothSelection();
    renderBoothPreview();
    updateActionState();
    pulseSurface(elements.editCanvas.closest(".preview-box"), "updated");
    setStatus(shot.name + "에 편집을 적용했습니다.", "success");
}

function renderShotLibrary() {
    elements.shotCount.textContent = String(state.shots.length) + "장";
    elements.shotLibrary.innerHTML = "";

    if (state.shots.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-grid";
        empty.textContent = "촬영하거나 불러온 사진이 여기에 쌓입니다.";
        elements.shotLibrary.appendChild(empty);
        return;
    }

    state.shots.forEach((shot) => {
        const card = document.createElement("article");
        const thumbWrap = document.createElement("div");
        const image = document.createElement("img");
        const meta = document.createElement("div");
        const title = document.createElement("strong");
        const time = document.createElement("span");
        const badges = document.createElement("div");
        const actions = document.createElement("div");
        const selectButton = document.createElement("button");
        const boothButton = document.createElement("button");
        const boothIndex = state.booth.selectedIds.indexOf(shot.id);

        card.className = "shot-card";

        if (state.edit.selectedShotId === shot.id) {
            card.classList.add("is-selected");
        }

        thumbWrap.className = "shot-thumb";
        image.src = shot.editedUrl || shot.originalUrl;
        image.alt = shot.name;
        image.loading = "lazy";
        thumbWrap.appendChild(image);

        if (boothIndex > -1) {
            const boothBadge = document.createElement("span");
            boothBadge.className = "order-badge";
            boothBadge.textContent = String(boothIndex + 1);
            thumbWrap.appendChild(boothBadge);
        }

        meta.className = "shot-meta";
        title.textContent = shot.name;
        time.textContent = TIME_LABEL_FORMATTER.format(shot.createdAt);
        meta.appendChild(title);
        meta.appendChild(time);

        badges.className = "tag-row";

        if (shot.editedCanvas) {
            badges.appendChild(createTag("편집됨"));
        }

        if (state.edit.selectedShotId === shot.id && state.edit.dirty) {
            badges.appendChild(createTag("미적용 변경"));
        }

        actions.className = "mini-actions";

        selectButton.type = "button";
        selectButton.className = "secondary-button";
        selectButton.dataset.action = "select-shot";
        selectButton.dataset.shotId = shot.id;
        selectButton.textContent = state.edit.selectedShotId === shot.id ? "편집중" : "편집 선택";

        boothButton.type = "button";
        boothButton.className = "secondary-button";
        boothButton.dataset.action = "toggle-booth";
        boothButton.dataset.shotId = shot.id;
        boothButton.textContent = boothIndex > -1 ? "4컷 제외" : "4컷 추가";

        actions.appendChild(selectButton);
        actions.appendChild(boothButton);

        card.appendChild(thumbWrap);
        card.appendChild(meta);
        card.appendChild(badges);
        card.appendChild(actions);
        elements.shotLibrary.appendChild(card);
    });
}

function renderEditPreview() {
    const shot = getSelectedShot();

    if (!shot) {
        elements.editSelectionLabel.textContent = "선택 없음";
        elements.editEmpty.hidden = false;
        elements.editCanvas.hidden = true;
        setAnchorState(elements.downloadEditButton, false);
        updateActionState();
        return;
    }

    elements.editSelectionLabel.textContent = shot.name;
    renderEditedCanvas(elements.editCanvas, shot, state.edit.draft);
    elements.editCanvas.hidden = false;
    elements.editEmpty.hidden = true;
    setAnchorState(
        elements.downloadEditButton,
        true,
        elements.editCanvas.toDataURL("image/png"),
        "edited-" + formatFileTimestamp(new Date()) + ".png"
    );
    updateActionState();
}

function renderEditedCanvas(targetCanvas, shot, settings) {
    const context = targetCanvas.getContext("2d");

    targetCanvas.width = 1200;
    targetCanvas.height = 1500;
    context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    if (settings.frameKey === "rounded") {
        renderRoundedFrame(context, shot, settings);
        return;
    }

    if (settings.frameKey === "polaroid") {
        renderPolaroidFrame(context, shot, settings);
        return;
    }

    if (settings.frameKey === "ticket") {
        renderTicketFrame(context, shot, settings);
        return;
    }

    renderCleanFrame(context, shot, settings);
}

function renderCleanFrame(context, shot, settings) {
    const background = context.createLinearGradient(0, 0, 0, context.canvas.height);
    background.addColorStop(0, "#f2ede6");
    background.addColorStop(1, "#e8e1d8");
    context.fillStyle = background;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    context.save();
    context.shadowColor = "rgba(22, 18, 15, 0.14)";
    context.shadowBlur = 36;
    context.shadowOffsetY = 16;
    fillRoundedRect(context, 72, 72, 1056, 1356, 42, "#ffffff");
    context.restore();

    drawEditedPhoto(context, shot.originalCanvas, 102, 102, 996, 1296, 30, settings);
    strokeRoundedRect(context, 102, 102, 996, 1296, 30, "rgba(17, 17, 17, 0.08)", 2);
}

function renderRoundedFrame(context, shot, settings) {
    const background = context.createLinearGradient(0, 0, context.canvas.width, context.canvas.height);
    background.addColorStop(0, "#fff2e8");
    background.addColorStop(1, "#f4dfd4");
    context.fillStyle = background;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    fillRoundedRect(context, 52, 52, 1096, 1396, 70, "rgba(255, 252, 248, 0.8)");
    drawEditedPhoto(context, shot.originalCanvas, 110, 110, 980, 1280, 48, settings);
    strokeRoundedRect(context, 110, 110, 980, 1280, 48, "rgba(120, 89, 74, 0.12)", 3);
}

function renderPolaroidFrame(context, shot, settings) {
    context.fillStyle = "#ece5dd";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    context.save();
    context.shadowColor = "rgba(18, 14, 11, 0.16)";
    context.shadowBlur = 44;
    context.shadowOffsetY = 22;
    fillRoundedRect(context, 132, 78, 936, 1320, 28, "#fffdf9");
    context.restore();

    drawEditedPhoto(context, shot.originalCanvas, 182, 124, 836, 980, 18, settings);
    strokeRoundedRect(context, 182, 124, 836, 980, 18, "rgba(17, 17, 17, 0.1)", 2);

    context.fillStyle = "#1d1a17";
    context.font = "600 44px sans-serif";
    context.fillText(shot.name, 182, 1216);
    context.fillStyle = "#6f655c";
    context.font = "500 28px sans-serif";
    context.fillText(DATE_LABEL_FORMATTER.format(shot.createdAt), 182, 1266);
}

function renderTicketFrame(context, shot, settings) {
    context.fillStyle = "#171411";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    fillRoundedRect(context, 82, 72, 1036, 1356, 36, "#f7efe4");

    context.fillStyle = "#171411";
    [272, 750, 1228].forEach((y) => {
        context.beginPath();
        context.arc(82, y, 24, 0, Math.PI * 2);
        context.arc(1118, y, 24, 0, Math.PI * 2);
        context.fill();
    });

    drawEditedPhoto(context, shot.originalCanvas, 132, 112, 936, 1096, 28, settings);
    context.save();
    context.setLineDash([18, 14]);
    strokeRoundedRect(context, 132, 112, 936, 1096, 28, "rgba(34, 27, 21, 0.22)", 3);
    context.restore();

    context.fillStyle = "#2b221c";
    context.font = "700 34px sans-serif";
    context.fillText("PHOTO PASS", 132, 1288);
    context.font = "500 28px sans-serif";
    context.fillText(shot.name + "  ·  " + TIME_LABEL_FORMATTER.format(shot.createdAt), 132, 1334);
}

function drawEditedPhoto(context, image, x, y, width, height, radius, settings) {
    const crop = getCropRect(image, width, height);

    context.save();
    buildRoundedRectPath(context, x, y, width, height, radius);
    context.clip();
    context.filter = buildEditFilter(settings);
    context.drawImage(
        image,
        crop.sourceX,
        crop.sourceY,
        crop.sourceWidth,
        crop.sourceHeight,
        x,
        y,
        width,
        height
    );
    context.restore();

    applyWarmthOverlay(context, x, y, width, height, radius, settings.warmth);
    applyFadeOverlay(context, x, y, width, height, radius, settings.fade);
}

function buildEditFilter(settings) {
    return [
        "brightness(" + (settings.brightness / 100).toFixed(2) + ")",
        "contrast(" + (settings.contrast / 100).toFixed(2) + ")",
        "saturate(" + (settings.saturation / 100).toFixed(2) + ")"
    ].join(" ");
}

function applyWarmthOverlay(context, x, y, width, height, radius, warmth) {
    if (!warmth) {
        return;
    }

    const alpha = Math.min(Math.abs(warmth) / 100, 0.24);
    const fillStyle = warmth > 0
        ? "rgba(255, 150, 78, " + alpha.toFixed(3) + ")"
        : "rgba(94, 148, 255, " + alpha.toFixed(3) + ")";

    context.save();
    buildRoundedRectPath(context, x, y, width, height, radius);
    context.clip();
    context.fillStyle = fillStyle;
    context.fillRect(x, y, width, height);
    context.restore();
}

function applyFadeOverlay(context, x, y, width, height, radius, fade) {
    if (!fade) {
        return;
    }

    const alpha = Math.min(fade / 100, 0.28);

    context.save();
    buildRoundedRectPath(context, x, y, width, height, radius);
    context.clip();
    context.fillStyle = "rgba(255, 255, 255, " + alpha.toFixed(3) + ")";
    context.fillRect(x, y, width, height);
    context.restore();
}

function toggleBoothSelection(shotId) {
    const currentIndex = state.booth.selectedIds.indexOf(shotId);

    if (currentIndex > -1) {
        state.booth.selectedIds = state.booth.selectedIds.filter((id) => id !== shotId);
        renderShotLibrary();
        renderBoothSelection();
        renderBoothPreview();
        updateActionState();
        return;
    }

    if (state.booth.selectedIds.length >= 4) {
        setStatus("포토부스에는 최대 4장까지 넣을 수 있습니다.", "error");
        return;
    }

    state.booth.selectedIds = state.booth.selectedIds.concat(shotId);
    renderShotLibrary();
    renderBoothSelection();
    renderBoothPreview();
    updateActionState();
}

function renderBoothSelection() {
    const selectedShots = getSelectedBoothShots();

    elements.boothCount.textContent = String(selectedShots.length) + " / 4";
    updateSelectedCountBadge(selectedShots.length);
    elements.boothSelection.innerHTML = "";

    if (selectedShots.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-grid";
        empty.textContent = "촬영본에서 4컷에 넣을 사진을 고르세요.";
        elements.boothSelection.appendChild(empty);
        return;
    }

    selectedShots.forEach((shot, index) => {
        const row = document.createElement("div");
        const order = document.createElement("span");
        const thumb = document.createElement("img");
        const text = document.createElement("div");
        const title = document.createElement("strong");
        const time = document.createElement("span");
        const actions = document.createElement("div");
        const editButton = document.createElement("button");
        const removeButton = document.createElement("button");

        row.className = "selection-item";

        order.className = "selection-order";
        order.textContent = String(index + 1);

        thumb.className = "selection-thumb";
        thumb.src = shot.editedUrl || shot.originalUrl;
        thumb.alt = shot.name;

        text.className = "selection-text";
        title.textContent = shot.name;
        time.textContent = TIME_LABEL_FORMATTER.format(shot.createdAt);
        text.appendChild(title);
        text.appendChild(time);

        actions.className = "mini-actions";

        editButton.type = "button";
        editButton.className = "secondary-button";
        editButton.dataset.action = "select-shot";
        editButton.dataset.shotId = shot.id;
        editButton.textContent = "편집";

        removeButton.type = "button";
        removeButton.className = "secondary-button";
        removeButton.dataset.action = "remove-booth";
        removeButton.dataset.shotId = shot.id;
        removeButton.textContent = "제외";

        actions.appendChild(editButton);
        actions.appendChild(removeButton);

        row.appendChild(order);
        row.appendChild(thumb);
        row.appendChild(text);
        row.appendChild(actions);
        elements.boothSelection.appendChild(row);
    });
}

function renderBoothPreview() {
    const selectedShots = getSelectedBoothShots();

    if (selectedShots.length === 0) {
        elements.boothEmpty.hidden = false;
        elements.boothCanvas.hidden = true;
        setAnchorState(elements.downloadStripButton, false);
        updateActionState();
        return;
    }

    drawBoothStrip(elements.boothCanvas, selectedShots, BOOTH_STYLES[state.booth.styleKey]);
    elements.boothCanvas.hidden = false;
    elements.boothEmpty.hidden = true;
    setAnchorState(
        elements.downloadStripButton,
        true,
        elements.boothCanvas.toDataURL("image/png"),
        "photo-booth-strip-" + formatFileTimestamp(new Date()) + ".png"
    );
    updateActionState();
}

function drawBoothStrip(targetCanvas, selectedShots, style) {
    const context = targetCanvas.getContext("2d");
    const slotX = 150;
    const slotWidth = 780;
    const slotHeight = 470;
    const slotGap = 42;
    const startY = 182;

    targetCanvas.width = 1080;
    targetCanvas.height = 2300;

    context.fillStyle = style.background;
    context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    for (let index = 0; index < 15; index += 1) {
        const y = 102 + index * 138;
        fillRoundedRect(context, 42, y, 46, 78, 18, style.perforation);
        fillRoundedRect(context, 992, y, 46, 78, 18, style.perforation);
    }

    context.fillStyle = style.accent;
    context.fillRect(slotX, 92, slotWidth, 14);

    context.fillStyle = style.text;
    context.font = "700 40px sans-serif";
    context.fillText("PHOTO BOOTH", slotX, 148);
    context.font = "500 24px sans-serif";
    context.fillText(DATE_LABEL_FORMATTER.format(new Date()), slotX, 176);

    for (let index = 0; index < 4; index += 1) {
        const currentY = startY + index * (slotHeight + slotGap);
        const shot = selectedShots[index];

        fillRoundedRect(context, slotX, currentY, slotWidth, slotHeight, 28, style.panel);
        strokeRoundedRect(context, slotX, currentY, slotWidth, slotHeight, 28, style.border, 2);

        if (shot) {
            drawCanvasCover(context, getRenderableCanvasForShot(shot), slotX + 18, currentY + 18, slotWidth - 36, slotHeight - 36, 22);
        } else {
            context.save();
            context.setLineDash([18, 18]);
            strokeRoundedRect(context, slotX + 18, currentY + 18, slotWidth - 36, slotHeight - 36, 22, style.border, 2);
            context.restore();
            context.fillStyle = style.accent;
            context.font = "600 28px sans-serif";
            context.fillText("EMPTY", slotX + 320, currentY + 244);
        }

        context.fillStyle = style.accent;
        context.font = "700 22px sans-serif";
        context.fillText("0" + String(index + 1), slotX + slotWidth - 74, currentY + 42);
    }

    context.fillStyle = style.text;
    context.font = "500 24px sans-serif";
    context.fillText(String(selectedShots.length) + " cut strip", slotX, targetCanvas.height - 82);
}

function getRenderableCanvasForShot(shot) {
    if (state.edit.selectedShotId === shot.id && !elements.editCanvas.hidden) {
        return elements.editCanvas;
    }

    return shot.editedCanvas || shot.originalCanvas;
}

function createTag(text) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = text;
    return tag;
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return "shot-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function cloneCanvas(sourceCanvas) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    context.drawImage(sourceCanvas, 0, 0);

    return canvas;
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

function drawCanvasCover(context, image, x, y, width, height, radius) {
    const crop = getCropRect(image, width, height);

    context.save();
    buildRoundedRectPath(context, x, y, width, height, radius);
    context.clip();
    context.drawImage(
        image,
        crop.sourceX,
        crop.sourceY,
        crop.sourceWidth,
        crop.sourceHeight,
        x,
        y,
        width,
        height
    );
    context.restore();
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

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

function getStateSnapshot() {
    return {
        capture: {
            facingMode: state.capture.facingMode,
            filterKey: state.capture.filterKey,
            zoom: state.capture.zoom
        },
        edit: {
            selectedShotId: state.edit.selectedShotId,
            draft: { ...state.edit.draft }
        },
        booth: {
            selectedIds: state.booth.selectedIds.slice(),
            styleKey: state.booth.styleKey
        },
        shotCount: state.shots.length
    };
}

function registerCaptureFilter(key, definition) {
    if (!key || !definition || !definition.label) {
        return;
    }

    CAPTURE_FILTERS[key] = {
        label: definition.label,
        previewCss: definition.previewCss || "none",
        captureCss: definition.captureCss || definition.previewCss || "none",
        processor: typeof definition.processor === "function" ? definition.processor : null
    };

    populateSelect(elements.captureFilter, CAPTURE_FILTERS, state.capture.filterKey);
}

function exposeFeatureApi() {
    window.photoBoothFeature = {
        startCamera: startCamera,
        stopCamera: () => stopCamera(false),
        capturePhoto: capturePhoto,
        selectShot: selectShot,
        toggleBoothSelection: toggleBoothSelection,
        applyCurrentEdit: applyEditToSelectedShot,
        renderStrip: renderBoothPreview,
        registerCaptureFilter: registerCaptureFilter,
        getState: getStateSnapshot
    };
}
