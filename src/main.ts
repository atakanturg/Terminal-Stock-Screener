import './style.css';

console.log('Terminal-X Home Operational');

// Basic home logic
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.querySelector('.primary-glow');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            window.location.href = '/screener.html';
        });
    }
});
