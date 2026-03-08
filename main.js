const URL = "https://teachablemachine.withgoogle.com/models/WdkmPA56A/";

let model, webcam, labelContainer, maxPredictions;

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') document.body.classList.add('light-mode');

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

// Load the image model and setup the webcam
async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    const loadingOverlay = document.getElementById('loading-overlay');
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = true;
    startBtn.textContent = "Initializing...";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Convenience function to setup a webcam
        const flip = true; // whether to flip the webcam
        webcam = new tmImage.Webcam(300, 300, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        window.requestAnimationFrame(loop);

        // append elements to the DOM
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) { // and class labels
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

        loadingOverlay.style.display = "none";
        startBtn.style.display = "none";
    } catch (error) {
        console.error(error);
        alert("Webcam access denied or error loading model.");
        startBtn.disabled = false;
        startBtn.textContent = "Start Camera";
    }
}

async function loop() {
    webcam.update(); // update the webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}

// run the webcam image through the image model
async function predict() {
    const prediction = await model.predict(webcam.canvas);
    for (let i = 0; i < maxPredictions; i++) {
        const classLabel = prediction[i].className;
        const probability = (prediction[i].probability * 100).toFixed(0);
        
        const bar = labelContainer.childNodes[i];
        bar.querySelector('.class-label').textContent = classLabel;
        bar.querySelector('.probability-text').textContent = probability + "%";
        bar.querySelector('.bar-fill').style.width = probability + "%";
    }
}

document.getElementById('start-btn').addEventListener('click', init);
