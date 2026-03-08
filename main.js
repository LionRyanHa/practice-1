const generateBtn = document.getElementById('generate');
const clearBtn = document.getElementById('clear');
const numbersContainer = document.getElementById('numbers');
const bonusSection = document.getElementById('bonus-section');
const bonusNumberDiv = document.getElementById('bonus-number');
const historyList = document.getElementById('history-list');

const getLottoColor = (num) => {
    if (num <= 10) return '#fbc400'; // Yellow
    if (num <= 20) return '#69c8f2'; // Blue
    if (num <= 30) return '#ff7272'; // Red
    if (num <= 40) return '#aaaaaa'; // Gray
    return '#b0d840'; // Green
};

const generateNumbers = () => {
    const numbers = new Set();
    while (numbers.size < 7) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }
    
    const numbersArray = Array.from(numbers);
    const mainNumbers = numbersArray.slice(0, 6).sort((a, b) => a - b);
    const bonusNumber = numbersArray[6];

    renderNumbers(mainNumbers, bonusNumber);
    addToHistory(mainNumbers, bonusNumber);
};

const renderNumbers = (mainNumbers, bonusNumber) => {
    numbersContainer.innerHTML = '';
    bonusSection.style.display = 'flex';

    mainNumbers.forEach((num, index) => {
        setTimeout(() => {
            const numDiv = document.createElement('div');
            numDiv.className = 'number';
            numDiv.textContent = num;
            numDiv.style.backgroundColor = getLottoColor(num);
            numbersContainer.appendChild(numDiv);
        }, index * 100);
    });

    setTimeout(() => {
        bonusNumberDiv.textContent = bonusNumber;
        bonusNumberDiv.style.backgroundColor = getLottoColor(bonusNumber);
    }, 700);
};

const addToHistory = (mainNumbers, bonusNumber) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
        <span>${mainNumbers.join(', ')} <small>(+${bonusNumber})</small></span>
        <span style="color: #95a5a6; font-size: 0.7rem;">${new Date().toLocaleTimeString()}</span>
    `;
    historyList.prepend(li);
    
    if (historyList.children.length > 5) {
        historyList.removeChild(historyList.lastChild);
    }
};

const clearDisplay = () => {
    numbersContainer.innerHTML = '<div class="placeholder">Ready to generate?</div>';
    bonusSection.style.display = 'none';
};

generateBtn.addEventListener('click', generateNumbers);
clearBtn.addEventListener('click', clearDisplay);
