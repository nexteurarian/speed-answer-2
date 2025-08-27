// Game State Management
const gameState = {
    isPlaying: false,
    gameStarted: false,
    gameEnded: false,
    currentLetter: null,
    letterStates: {}, // track state of each letter: 'unanswered', 'correct', 'wrong', 'passed'
    elapsedTime: 0,
    questionTimer: null,
    mainTimer: null,
    // Tracking for scoring
    answeredCount: 0,
    correctCount: 0,
    wrongCount: 0,
    passedCount: 0
};

// Scoring configuration
const MAX_QUESTIONS = 15; // End after 15 total answers
const T_MAX = 177;        // seconds
const ALPHA = 0.9;        // weight on answer component

function computeAccuracyScore(correct, wrong, elapsedSeconds) {
    const Q = MAX_QUESTIONS;
    const A = (correct - wrong + Q) / (2 * Q);
    const S = 1 - Math.min(elapsedSeconds, T_MAX) / T_MAX;
    const score01 = (ALPHA * A) + ((1 - ALPHA) * S);
    return Math.max(0, Math.min(1, score01)) * 100;
}

// DOM Elements
const mainBoard = document.getElementById('mainBoard');
const questionScreen = document.getElementById('questionScreen');
const letterGrid = document.querySelector('.letter-grid');
const stopwatch = document.getElementById('stopwatch');
const flashOverlay = document.getElementById('flashOverlay');

// Initialize the game
function initializeGame() {
    // Create letter boxes A-Z
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    letters.forEach(letter => {
        const letterBox = document.createElement('div');
        letterBox.className = 'letter-box';
        letterBox.textContent = letter;
        letterBox.dataset.letter = letter;
        letterGrid.appendChild(letterBox);
        
        // Allow selecting letter by mouse click as well
        letterBox.addEventListener('click', () => {
            if (!gameState.gameEnded && gameState.letterStates[letter] === 'unanswered') {
                selectLetter(letter);
            } else if (gameState.letterStates[letter] !== 'unanswered') {
                triggerScreenShake();
            }
        });
        
        // Initialize letter state
        gameState.letterStates[letter] = 'unanswered';
    });
    
    // Add event listeners
    setupEventListeners();
}

// Setup all event listeners
function setupEventListeners() {
    // Keyboard listener for letter selection
    document.addEventListener('keydown', handleKeyPress);
    
    // Stopwatch click to end game
    stopwatch.addEventListener('click', endGame);
}

// Shake the whole screen to indicate invalid action (e.g., already-answered letter)
function triggerScreenShake() {
    const body = document.body;
    if (!body) return;
    if (body.classList.contains('shake')) {
        body.classList.remove('shake');
        // Force reflow to restart animation
        void body.offsetWidth;
    }
    body.classList.add('shake');
    const remove = () => body.classList.remove('shake');
    body.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 600);
}

// Handle keyboard input
function handleKeyPress(event) {
    const key = event.key.toUpperCase();
    
    // Check if on question screen
    if (questionScreen.classList.contains('active')) {
        handleQuestionKeyPress(key);
        return;
    }
    
    // Check if on main board and key is a letter
    if (mainBoard.classList.contains('active') && /^[A-Z]$/.test(key)) {
        // Check if game hasn't ended and letter is unanswered
        if (!gameState.gameEnded && gameState.letterStates[key] === 'unanswered') {
            selectLetter(key);
        } else if (gameState.letterStates[key] !== 'unanswered') {
            // Letter already answered -> shake screen
            triggerScreenShake();
        }
    }
}

// Handle key presses on question screen
function handleQuestionKeyPress(key) {
    switch(key) {
        case 'C':
            handleAnswer('correct');
            break;
        case 'W':
            handleAnswer('wrong');
            break;
        case 'P':
            handleAnswer('passed');
            break;
    }
}

// Select a letter and show question
function selectLetter(letter) {
    // Start the game timer if this is the first selection
    if (!gameState.gameStarted) {
        startMainTimer();
        gameState.gameStarted = true;
    }
    
    gameState.currentLetter = letter;
    showQuestion(letter);
}

// Display the question screen
function showQuestion(letter) {
    // Transition to question screen
    mainBoard.classList.remove('active');
    questionScreen.classList.add('active');
    
    // Set up question content
    const question = questions[letter];
    document.querySelector('.current-letter').textContent = letter;
    document.querySelector('.question-text').textContent = question.question;
    document.querySelector('.answer-text').textContent = question.answer;
    document.querySelector('.answer-text').classList.remove('visible');
    
    // Start countdown timer
    startQuestionTimer();
}

// Start the 10-second question timer
function startQuestionTimer() {
    let timeLeft = 10;
    const timerDisplay = document.querySelector('.countdown-timer');
    timerDisplay.textContent = timeLeft;
    timerDisplay.classList.remove('warning');
    
    gameState.questionTimer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        // Add warning class for last 3 seconds
        if (timeLeft <= 3) {
            timerDisplay.classList.add('warning');
        }
        
        // Time's up - treat as pass
        if (timeLeft === 0) {
            clearInterval(gameState.questionTimer);
            handleAnswer('passed');
        }
    }, 1000);
}

// Handle answer judgment
function handleAnswer(result) {
    // Clear the question timer
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
    }
    
    // Update letter state
    gameState.letterStates[gameState.currentLetter] = result;
    // Update counters for scoring
    switch (result) {
        case 'correct':
            gameState.correctCount++;
            break;
        case 'wrong':
            gameState.wrongCount++;
            break;
        case 'passed':
            gameState.passedCount++;
            break;
    }
    gameState.answeredCount++;
    
    // Show appropriate feedback
    showFeedback(result);
}

// Show visual feedback for answer
function showFeedback(result) {
    let flashClass = '';
    let delay = 1000; // Default 1 second delay
    
    switch(result) {
        case 'correct':
            flashClass = 'flash-green';
            delay = 1000;
            break;
        case 'wrong':
            flashClass = 'flash-red';
            delay = 1500;
            // Show the answer
            document.querySelector('.answer-text').classList.add('visible');
            break;
        case 'passed':
            flashClass = 'flash-orange';
            delay = 1500;
            // Show the answer
            document.querySelector('.answer-text').classList.add('visible');
            break;
    }
    
    // Flash the screen
    flashOverlay.classList.add(flashClass);
    
    setTimeout(() => {
        flashOverlay.classList.remove(flashClass);
        
        // Update letter box first, then return to main board
        setTimeout(() => {
            updateLetterBox(gameState.currentLetter, result);
            returnToMainBoard();
        }, delay);
    }, 300);
}

// Return to main board
function returnToMainBoard() {
    questionScreen.classList.remove('active');
    mainBoard.classList.add('active');
    gameState.currentLetter = null;
    maybeEndGameIfDone();
}

// Update letter box appearance
function updateLetterBox(letter, state) {
    const letterBox = document.querySelector(`[data-letter="${letter}"]`);
    letterBox.classList.add('answered', state);
    // Explicitly set text color for strong contrast and visibility
    switch (state) {
        case 'correct':
            letterBox.style.color = '#083b1a'; // dark green
            break;
        case 'wrong':
            letterBox.style.color = '#4a0000'; // dark red
            break;
        case 'passed':
            letterBox.style.color = '#4a2a00'; // dark orange/brown
            break;
    }
}

// Start the main game timer
function startMainTimer() {
    stopwatch.classList.add('running');
    
    gameState.mainTimer = setInterval(() => {
        gameState.elapsedTime++;
        updateStopwatchDisplay();
    }, 1000);
}

function maybeEndGameIfDone() {
    if (!gameState.gameEnded && gameState.answeredCount >= MAX_QUESTIONS) {
        endGame();
    }
}

function showResultsOverlay(correct, passed, wrong, accuracyPercent, elapsedSeconds) {
    // Remove existing overlay if present
    const existing = document.getElementById('resultsOverlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'resultsOverlay';
    
    const card = document.createElement('div');
    card.className = 'results-card';
    
    const heading = document.createElement('div');
    heading.className = 'result-heading';
    heading.textContent = 'Final Results';

    // Prominent percentage at the top (no label)
    const accuracy = document.createElement('div');
    accuracy.className = 'result-accuracy';
    accuracy.innerHTML = '<div class="result-accuracy-value"></div>';
    accuracy.querySelector('.result-accuracy-value').textContent = `${accuracyPercent.toFixed(1)}%`;

    const breakdown = document.createElement('div');
    breakdown.className = 'result-breakdown';
    
    const lineCorrect = document.createElement('div');
    lineCorrect.className = 'result-line';
    lineCorrect.innerHTML = '<span class="result-label">Correct:</span> <span class="result-value result-correct"></span>';
    lineCorrect.querySelector('.result-value').textContent = correct;
    
    const linePass = document.createElement('div');
    linePass.className = 'result-line';
    linePass.innerHTML = '<span class="result-label">Passed:</span> <span class="result-value result-pass"></span>';
    linePass.querySelector('.result-value').textContent = passed;
    
    const lineWrong = document.createElement('div');
    lineWrong.className = 'result-line';
    lineWrong.innerHTML = '<span class="result-label">Wrong:</span> <span class="result-value result-wrong"></span>';
    lineWrong.querySelector('.result-value').textContent = wrong;

    const lineTime = document.createElement('div');
    lineTime.className = 'result-line';
    const mm = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const ss = (elapsedSeconds % 60).toString().padStart(2, '0');
    lineTime.innerHTML = '<span class="result-label">Time:</span> <span class="result-value result-time"></span>';
    lineTime.querySelector('.result-time').textContent = `${mm}:${ss}`;
    
    breakdown.appendChild(lineCorrect);
    breakdown.appendChild(linePass);
    breakdown.appendChild(lineWrong);
    breakdown.appendChild(lineTime);
    
    card.appendChild(heading);
    card.appendChild(accuracy);
    card.appendChild(breakdown);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Prepare bouncing score card (DVD-style)
    card.style.position = 'absolute';
    card.style.willChange = 'transform';
    card.style.zIndex = '2';
    startDVDBounce(overlay, card);

}

function startDVDBounce(overlay, card) {
    let x = 20;
    let y = 20;
    // Slower speeds to reduce stutter perception
    let vx = 120; // px/sec
    let vy = 90;  // px/sec
    if (Math.random() < 0.5) vx = -vx;
    if (Math.random() < 0.5) vy = -vy;
    let last = performance.now();
    // Measure card once to avoid per-frame layout reads
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;

    function step(now) {
        let dt = (now - last) / 1000;
        // Clamp delta to avoid big jumps when tab regains focus
        if (dt > 0.05) dt = 0.05;
        last = now;
        // Use viewport size as overlay is fullscreen
        const ow = window.innerWidth;
        const oh = window.innerHeight;

        x += vx * dt;
        y += vy * dt;

        if (x <= 0) { x = 0; vx = Math.abs(vx); }
        else if (x + cw >= ow) { x = Math.max(0, ow - cw); vx = -Math.abs(vx); }

        if (y <= 0) { y = 0; vy = Math.abs(vy); }
        else if (y + ch >= oh) { y = Math.max(0, oh - ch); vy = -Math.abs(vy); }

        card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        requestAnimationFrame(step);
    }

    requestAnimationFrame(() => {
        const ow = window.innerWidth;
        const oh = window.innerHeight;
        x = Math.random() * Math.max(1, ow - cw);
        y = Math.random() * Math.max(1, oh - ch);
        last = performance.now();
        requestAnimationFrame(step);
    });
}

// (Confetti removed as requested)

// Update stopwatch display
function updateStopwatchDisplay() {
    const minutes = Math.floor(gameState.elapsedTime / 60);
    const seconds = gameState.elapsedTime % 60;
    stopwatch.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// End the game
function endGame() {
    if (!gameState.gameStarted || gameState.gameEnded) return;
    
    gameState.gameEnded = true;
    
    // Stop the main timer
    if (gameState.mainTimer) {
        clearInterval(gameState.mainTimer);
        gameState.mainTimer = null;
    }
    
    // Stop any question timer
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
    }
    
    // If on question screen, return to main board
    if (questionScreen.classList.contains('active')) {
        returnToMainBoard();
    }
    
    // Compute and display final accuracy score with breakdown
    const c = gameState.correctCount;
    const p = gameState.passedCount;
    const w = gameState.wrongCount;
    const score = computeAccuracyScore(c, w, gameState.elapsedTime);
    showResultsOverlay(c, p, w, score, gameState.elapsedTime);
    
    // Update UI to show game over state
    mainBoard.classList.add('game-over');
    stopwatch.classList.remove('running');
    
    // Disable all unanswered letters
    document.querySelectorAll('.letter-box').forEach(box => {
        if (!box.classList.contains('answered')) {
            box.classList.add('disabled');
        }
    });
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', initializeGame);
