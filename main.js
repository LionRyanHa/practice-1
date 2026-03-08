
document.getElementById('generate').addEventListener('click', () => {
    const numbersContainer = document.getElementById('numbers');
    numbersContainer.innerHTML = '';
    const numbers = new Set();
    while (numbers.size < 6) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFA1'];

    Array.from(numbers).sort((a, b) => a - b).forEach((number, index) => {
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('number');
        numberDiv.textContent = number;
        numberDiv.style.backgroundColor = colors[index];
        numbersContainer.appendChild(numberDiv);
    });
});
