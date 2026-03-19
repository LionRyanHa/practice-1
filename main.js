const MODEL_URL = "https://teachablemachine.withgoogle.com/models/WdkmPA56A/";

let model;
let labelContainer;
let maxPredictions = 0;

const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const predictBtn = document.getElementById("predict-btn");
const statusMessage = document.getElementById("status-message");

function updateStatus(message, type = "info") {
    if (!statusMessage) {
        return;
    }

    statusMessage.textContent = message;
    statusMessage.dataset.state = type;
}

function getSafeLabel(index) {
    const labels = ["예시 인물 A", "예시 인물 B"];
    return labels[index] || `예시 인물 ${index + 1}`;
}

async function loadModel() {
    updateStatus("모델을 준비하는 중입니다.");

    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";

    for (let i = 0; i < maxPredictions; i += 1) {
        const predictionBar = document.createElement("div");
        predictionBar.className = "prediction-bar";
        predictionBar.innerHTML = `
            <div class="label-text">
                <span class="class-label">${getSafeLabel(i)}</span>
                <span class="probability-text">0%</span>
            </div>
            <div class="bar-bg">
                <div class="bar-fill"></div>
            </div>
        `;
        labelContainer.appendChild(predictionBar);
    }

    updateStatus("모델 준비가 완료되었습니다. 사진을 올리고 분석을 시작해 주세요.", "success");
}

function resetPredictions() {
    if (!labelContainer) {
        return;
    }

    Array.from(labelContainer.children).forEach((bar, index) => {
        bar.querySelector(".class-label").textContent = getSafeLabel(index);
        bar.querySelector(".probability-text").textContent = "0%";
        bar.querySelector(".bar-fill").style.width = "0%";
    });
}

imageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        imagePreview.src = loadEvent.target.result;
        imagePreview.style.display = "block";
        uploadPlaceholder.style.display = "none";
        predictBtn.style.display = "inline-block";
        resetPredictions();
        updateStatus("이미지가 준비되었습니다. 분석 시작 버튼을 눌러 주세요.", "info");
    };
    reader.readAsDataURL(file);
});

async function predict() {
    if (!imagePreview.src) {
        updateStatus("먼저 분석할 이미지를 선택해 주세요.", "error");
        return;
    }

    try {
        if (!model) {
            await loadModel();
        }

        predictBtn.disabled = true;
        predictBtn.textContent = "분석 중...";
        updateStatus("브라우저에서 이미지를 분석하고 있습니다.", "info");

        const prediction = await model.predict(imagePreview);
        prediction.forEach((item, index) => {
            const probability = Math.round(item.probability * 100);
            const bar = labelContainer.children[index];
            bar.querySelector(".class-label").textContent = getSafeLabel(index);
            bar.querySelector(".probability-text").textContent = `${probability}%`;
            bar.querySelector(".bar-fill").style.width = `${probability}%`;
        });

        updateStatus("분석이 완료되었습니다. 결과는 참고용 상대 점수입니다.", "success");
    } catch (error) {
        console.error(error);
        updateStatus("모델을 불러오거나 분석하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
        predictBtn.disabled = false;
        predictBtn.textContent = "분석 시작";
    }
}

predictBtn.addEventListener("click", predict);

loadModel().catch((error) => {
    console.error(error);
    updateStatus("모델 준비에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 열어 주세요.", "error");
});
