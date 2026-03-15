const URL = "https://teachablemachine.withgoogle.com/models/WdkmPA56A/";

let model, labelContainer, maxPredictions;

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') document.body.classList.add('light-mode');

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
    });
}

// Load the model
async function loadModel() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) {
        const predictionBar = document.createElement("div");
        predictionBar.className = "prediction-bar";
        predictionBar.innerHTML = `
            <div class="label-text">
                <span class="class-label"></span>
                <span class="probability-text">0%</span>
            </div>
            <div class="bar-bg">
                <div class="bar-fill"></div>
            </div>
        `;
        labelContainer.appendChild(predictionBar);
    }
}

// Handle File Selection
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const predictBtn = document.getElementById('predict-btn');

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            predictBtn.style.display = 'inline-block';
            resetPredictions();
        };
        reader.readAsDataURL(file);
    }
});

function resetPredictions() {
    if (labelContainer) {
        for (let i = 0; i < maxPredictions; i++) {
            const bar = labelContainer.childNodes[i];
            if (bar.querySelector) {
                bar.querySelector('.class-label').textContent = "-";
                bar.querySelector('.probability-text').textContent = "0%";
                bar.querySelector('.bar-fill').style.width = "0%";
            }
        }
    }
}

// Run Prediction
async function predict() {
    if (!model) await loadModel();
    
    predictBtn.disabled = true;
    predictBtn.textContent = "Analyzing...";
    
    const prediction = await model.predict(imagePreview);
    for (let i = 0; i < maxPredictions; i++) {
        const classLabel = prediction[i].className;
        const probability = (prediction[i].probability * 100).toFixed(0);
        
        const bar = labelContainer.childNodes[i];
        bar.querySelector('.class-label').textContent = classLabel;
        bar.querySelector('.probability-text').textContent = probability + "%";
        bar.querySelector('.bar-fill').style.width = probability + "%";
    }
    
    predictBtn.disabled = false;
    predictBtn.textContent = "Identify Person";
}

predictBtn.addEventListener('click', predict);

// Initial model load (background)
loadModel();
