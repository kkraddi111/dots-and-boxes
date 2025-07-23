document.addEventListener('DOMContentLoaded', () => {

    /**
     * Configuration object for game settings, colors, and animations.
     */
    const CONFIG = {
        playerColors: {
            1: { line: 'bg-blue-500', box: 'bg-blue-500/30', score: 'bg-blue-600' },
            2: { line: 'bg-red-500', box: 'bg-red-500/30', score: 'bg-red-600' }
        },
        animation: {
            lineDrawDuration: 0.3,
            boxFillDuration: 0.4,
            scoreUpdateDuration: 0.5,
            modalFadeDuration: 0.5,
            boardFadeDuration: 0.5
        },
        confettiColors: ['#a7f3d0', '#bae6fd', '#f9a8d4', '#fde047', '#d8b4fe'],
        aiThinkTime: 500
    };

    // --- DOM Element References ---
    const dom = {
        gameBoard: document.getElementById('game-board'),
        player1ScoreEl: document.querySelector('#player1-score p'),
        player2ScoreEl: document.querySelector('#player2-score p'),
        player1ScoreContainer: document.getElementById('player1-score'),
        player2ScoreContainer: document.getElementById('player2-score'),
        player2NameEl: document.querySelector('#player2-score span'),
        turnIndicator: document.getElementById('turn-indicator'),
        newGameBtn: document.getElementById('newGame'),
        gridSizeSelect: document.getElementById('gridSize'),
        gameModeSelect: document.getElementById('gameMode'),
        aiDifficultySelect: document.getElementById('aiDifficulty'),
        aiDifficultyWrapper: document.getElementById('aiDifficultyWrapper'),
        gameOverModal: document.getElementById('gameOverModal'),
        modalHeadline: document.getElementById('modal-headline'),
        modalFinalScore: document.getElementById('modal-final-score'),
        playAgainBtn: document.getElementById('playAgainBtn'),
        mainMenuBtn: document.getElementById('mainMenuBtn'),
        confettiCanvas: document.getElementById('confetti-canvas')
    };

    /**
     * UI / Renderer Module: Handles all direct DOM manipulation.
     */
    const ui = {
        confettiCtx: dom.confettiCanvas.getContext('2d'),
        confettiParticles: [],

        /**
         * Renders the initial grid structure (dots, lines, boxes).
         * @param {number} size - The grid size (e.g., 4 for a 4x4 grid).
         */
        createGrid(size) {
            dom.gameBoard.innerHTML = '';
            dom.gameBoard.style.gridTemplateColumns = `repeat(${size * 2 + 1}, 1fr)`;
            dom.gameBoard.style.gridTemplateRows = `repeat(${size * 2 + 1}, 1fr)`;

            for (let r = 0; r < size * 2 + 1; r++) {
                for (let c = 0; c < size * 2 + 1; c++) {
                    const cell = document.createElement('div');
                    cell.dataset.row = r;
                    cell.dataset.col = c;

                    if (r % 2 === 0 && c % 2 === 0) {
                        cell.className = 'bg-white rounded-full w-3 h-3 place-self-center';
                    } else if (r % 2 === 0 && c % 2 !== 0) {
                        cell.className = 'h-line bg-gray-700 hover:bg-blue-400 cursor-pointer h-1 w-full place-self-center';
                        cell.dataset.lineType = 'h';
                        cell.dataset.lineRow = r / 2;
                        cell.dataset.lineCol = (c - 1) / 2;
                    } else if (r % 2 !== 0 && c % 2 === 0) {
                        cell.className = 'v-line bg-gray-700 hover:bg-blue-400 cursor-pointer w-1 h-full place-self-center';
                        cell.dataset.lineType = 'v';
                        cell.dataset.lineRow = (r - 1) / 2;
                        cell.dataset.lineCol = c / 2;
                    } else {
                        cell.className = 'box';
                        cell.dataset.boxRow = (r - 1) / 2;
                        cell.dataset.boxCol = (c - 1) / 2;
                    }
                    dom.gameBoard.appendChild(cell);
                }
            }
        },

        /**
         * Updates the score display with an animation.
         * @param {object} scores - The scores object, e.g., { 1: 0, 2: 0 }.
         * @param {number} currentPlayer - The current player (1 or 2).
         */
        updateScoreboard(scores, currentPlayer) {
            gsap.to(dom.player1ScoreEl, { duration: CONFIG.animation.scoreUpdateDuration, textContent: scores[1], ease: "power1.inOut" });
            gsap.to(dom.player2ScoreEl, { duration: CONFIG.animation.scoreUpdateDuration, textContent: scores[2], ease: "power1.inOut" });
            
            dom.player1ScoreContainer.classList.toggle(CONFIG.playerColors[1].score, currentPlayer === 1);
            dom.player1ScoreContainer.classList.toggle('bg-transparent', currentPlayer !== 1);
            dom.player2ScoreContainer.classList.toggle(CONFIG.playerColors[2].score, currentPlayer === 2);
            dom.player2ScoreContainer.classList.toggle('bg-transparent', currentPlayer !== 2);
        },

        /**
         * Updates the turn indicator text.
         * @param {number} currentPlayer - The current player (1 or 2).
         * @param {string} gameMode - The current game mode ('pvp' or 'pva').
         */
        updateTurnIndicator(currentPlayer, gameMode) {
            const player2Label = gameMode === 'pva' ? 'AI' : 'Player 2';
            dom.player2NameEl.textContent = player2Label;
            dom.turnIndicator.textContent = `Player ${currentPlayer}'s Turn`;
            if (gameMode === 'pva' && currentPlayer === 2) {
                dom.turnIndicator.textContent = "AI's Turn";
            }
        },

        /**
         * Visually claims a line for a player.
         * @param {HTMLElement} line - The line element to claim.
         * @param {number} player - The player claiming the line.
         */
        claimLine(line, player) {
            const playerColor = CONFIG.playerColors[player].line;
            line.classList.remove('bg-gray-700', 'hover:bg-blue-400');
            line.classList.add(playerColor);
            const { lineType } = line.dataset;
            gsap.from(line, { scaleX: lineType === 'h' ? 0 : 1, scaleY: lineType === 'v' ? 0 : 1, duration: CONFIG.animation.lineDrawDuration, ease: 'power2.out' });
        },

        /**
         * Fills a completed box with the player's color.
         * @param {number} r - The row of the box.
         * @param {number} c - The column of the box.
         * @param {number} player - The player who completed the box.
         */
        fillBox(r, c, player) {
            const boxEl = dom.gameBoard.querySelector(`.box[data-box-row='${r}'][data-box-col='${c}']`);
            const playerColor = CONFIG.playerColors[player].box;
            boxEl.classList.add(playerColor);
            gsap.from(boxEl, { scale: 0.5, opacity: 0, duration: CONFIG.animation.boxFillDuration, ease: 'elastic.out(1, 0.5)' });
        },

        /**
         * Shows the game over modal.
         * @param {string} headline - The text for the main headline.
         * @param {string} finalScore - The text for the final score.
         */
        showGameOverModal(headline, finalScore) {
            dom.modalHeadline.textContent = headline;
            dom.modalFinalScore.textContent = finalScore;
            dom.gameOverModal.classList.remove('hidden');
            gsap.fromTo(dom.gameOverModal, { opacity: 0 }, { opacity: 1, duration: CONFIG.animation.modalFadeDuration });
        },

        /**
         * Hides the game over modal.
         */
        hideGameOverModal() {
            gsap.to(dom.gameOverModal, {
                opacity: 0,
                duration: CONFIG.animation.modalFadeDuration,
                onComplete: () => {
                    dom.gameOverModal.classList.add('hidden');
                    this.stopConfetti();
                }
            });
        },

        /**
         * Starts the confetti animation.
         */
        startConfetti() {
            dom.confettiCanvas.width = window.innerWidth;
            dom.confettiCanvas.height = window.innerHeight;
            this.confettiParticles = [];
            const particleCount = 200;
            for (let i = 0; i < particleCount; i++) {
                this.confettiParticles.push({
                    x: Math.random() * dom.confettiCanvas.width,
                    y: Math.random() * dom.confettiCanvas.height - dom.confettiCanvas.height,
                    size: Math.random() * 5 + 2,
                    color: CONFIG.confettiColors[Math.floor(Math.random() * CONFIG.confettiColors.length)],
                    speed: Math.random() * 3 + 2,
                    angle: Math.random() * Math.PI * 2,
                    tilt: Math.random() * 10 - 5,
                    tiltAngle: 0
                });
            }
            this.renderConfetti();
        },

        /**
         * Renders a single frame of the confetti animation.
         */
        renderConfetti() {
            if (this.confettiParticles.length === 0) {
                this.confettiCtx.clearRect(0, 0, dom.confettiCanvas.width, dom.confettiCanvas.height);
                return;
            }
            this.confettiCtx.clearRect(0, 0, dom.confettiCanvas.width, dom.confettiCanvas.height);
            this.confettiParticles.forEach((p, i) => {
                p.y += p.speed;
                p.tiltAngle += 0.1;
                p.x += Math.sin(p.tiltAngle) * 2;
                
                this.confettiCtx.fillStyle = p.color;
                this.confettiCtx.beginPath();
                this.confettiCtx.lineWidth = p.size;
                this.confettiCtx.moveTo(p.x + p.tilt, p.y);
                this.confettiCtx.lineTo(p.x, p.y + p.tilt + p.size);
                this.confettiCtx.stroke();

                if (p.y > dom.confettiCanvas.height) {
                    this.confettiParticles.splice(i, 1);
                }
            });
            requestAnimationFrame(this.renderConfetti.bind(this));
        },

        /**
         * Stops the confetti animation and clears the canvas.
         */
        stopConfetti() {
            this.confettiParticles = [];
        }
    };

    /**
     * AI Logic Module: Handles all AI decision-making.
     */
    const ai = {
        /**
         * Determines the AI's next move based on difficulty.
         * @param {object} state - The current game state.
         * @returns {object|null} The best move object or null if no moves are available.
         */
        getMove(state) {
            let move = this.findWinningMove(state);
            if (!move && state.aiDifficulty === 'hard') {
                move = this.findBestMove_Medium(state); // Hard AI uses Medium logic as a strong base
            }
            if (!move && state.aiDifficulty === 'medium') {
                move = this.findBestMove_Medium(state);
            }
            if (!move) {
                move = this.findRandomMove(state);
            }
            return move;
        },

        /**
         * Finds a move that immediately completes a box.
         * @param {object} state - The current game state.
         * @returns {object|null} A winning move or null.
         */
        findWinningMove(state) {
            for (let r = 0; r <= state.gridSize; r++) {
                for (let c = 0; c < state.gridSize; c++) {
                    if (!state.horizontalLines[r][c] && this.wouldCompleteBox(state, 'h', r, c)) return { r, c, type: 'h' };
                }
            }
            for (let r = 0; r < state.gridSize; r++) {
                for (let c = 0; c <= state.gridSize; c++) {
                    if (!state.verticalLines[r][c] && this.wouldCompleteBox(state, 'v', r, c)) return { r, c, type: 'v' };
                }
            }
            return null;
        },

        /**
         * Finds the best move for Medium/Hard difficulty (avoids setting up the opponent).
         * @param {object} state - The current game state.
         * @returns {object|null} A safe move or a random available move.
         */
        findBestMove_Medium(state) {
            const safeMoves = [];
            const availableMoves = [];
            for (let r = 0; r <= state.gridSize; r++) {
                for (let c = 0; c < state.gridSize; c++) {
                    if (!state.horizontalLines[r][c]) {
                        const move = { r, c, type: 'h' };
                        availableMoves.push(move);
                        if (!this.createsSetup(state, 'h', r, c)) safeMoves.push(move);
                    }
                }
            }
            for (let r = 0; r < state.gridSize; r++) {
                for (let c = 0; c <= state.gridSize; c++) {
                    if (!state.verticalLines[r][c]) {
                        const move = { r, c, type: 'v' };
                        availableMoves.push(move);
                        if (!this.createsSetup(state, 'v', r, c)) safeMoves.push(move);
                    }
                }
            }
            return safeMoves.length > 0 ? safeMoves[Math.floor(Math.random() * safeMoves.length)] : availableMoves[Math.floor(Math.random() * availableMoves.length)];
        },

        /**
         * Finds any available random move.
         * @param {object} state - The current game state.
         * @returns {object|null} A random available move.
         */
        findRandomMove(state) {
            const availableMoves = [];
            for (let r = 0; r <= state.gridSize; r++) {
                for (let c = 0; c < state.gridSize; c++) {
                    if (!state.horizontalLines[r][c]) availableMoves.push({ r, c, type: 'h' });
                }
            }
            for (let r = 0; r < state.gridSize; r++) {
                for (let c = 0; c <= state.gridSize; c++) {
                    if (!state.verticalLines[r][c]) availableMoves.push({ r, c, type: 'v' });
                }
            }
            return availableMoves.length > 0 ? availableMoves[Math.floor(Math.random() * availableMoves.length)] : null;
        },

        /**
         * Checks if a potential move would complete a box.
         * @param {object} state - The current game state.
         * @param {string} type - The line type ('h' or 'v').
         * @param {number} r - The row of the line.
         * @param {number} c - The column of the line.
         * @returns {boolean} True if the move completes a box.
         */
        wouldCompleteBox(state, type, r, c) {
            if (type === 'h') {
                return (r < state.gridSize && this.countSides(state, r, c) === 3) ||
                       (r > 0 && this.countSides(state, r - 1, c) === 3);
            } else {
                return (c < state.gridSize && this.countSides(state, r, c) === 3) ||
                       (c > 0 && this.countSides(state, r, c - 1) === 3);
            }
        },

        /**
         * Checks if a move would give the opponent a box on their next turn.
         * @param {object} state - The current game state.
         * @param {string} type - The line type ('h' or 'v').
         * @param {number} r - The row of the line.
         * @param {number} c - The column of the line.
         * @returns {boolean} True if the move creates a setup.
         */
        createsSetup(state, type, r, c) {
            if (type === 'h') {
                return (r < state.gridSize && this.countSides(state, r, c) === 2) ||
                       (r > 0 && this.countSides(state, r - 1, c) === 2);
            } else {
                return (c < state.gridSize && this.countSides(state, r, c) === 2) ||
                       (c > 0 && this.countSides(state, r, c - 1) === 2);
            }
        },
        
        /**
         * Counts the number of claimed sides for a given box.
         * @param {object} state - The current game state.
         * @param {number} r - The row of the box.
         * @param {number} c - The column of the box.
         * @returns {number} The number of claimed sides (0-4).
         */
        countSides(state, r, c) {
            let sides = 0;
            if (state.horizontalLines[r][c]) sides++;
            if (state.horizontalLines[r + 1][c]) sides++;
            if (state.verticalLines[r][c]) sides++;
            if (state.verticalLines[r][c + 1]) sides++;
            return sides;
        }
    };

    /**
     * Game Logic Module: Manages the game state and core logic.
     */
    const game = {
        state: {},

        /**
         * Initializes a new game or resets the current one.
         */
        init() {
            gsap.to(dom.gameBoard, {
                duration: CONFIG.animation.boardFadeDuration,
                opacity: 0,
                ease: 'power2.in',
                onComplete: () => {
                    const gridSize = parseInt(dom.gridSizeSelect.value);
                    this.state = {
                        gridSize: gridSize,
                        gameMode: dom.gameModeSelect.value,
                        aiDifficulty: dom.aiDifficultySelect.value,
                        currentPlayer: 1,
                        scores: { 1: 0, 2: 0 },
                        gameOver: false,
                        horizontalLines: Array(gridSize + 1).fill(0).map(() => Array(gridSize).fill(0)),
                        verticalLines: Array(gridSize).fill(0).map(() => Array(gridSize + 1).fill(0)),
                        boxes: Array(gridSize).fill(0).map(() => Array(gridSize).fill(0)),
                    };

                    ui.createGrid(this.state.gridSize);
                    ui.updateScoreboard(this.state.scores, this.state.currentPlayer);
                    ui.updateTurnIndicator(this.state.currentPlayer, this.state.gameMode);
                    
                    gsap.to(dom.gameBoard, { duration: CONFIG.animation.boardFadeDuration, opacity: 1, ease: 'power2.out' });
                }
            });
        },

        /**
         * Handles a click on a line element.
         * @param {HTMLElement} line - The line element that was clicked.
         */
        handleLineClick(line) {
            if (this.state.gameOver || !line || !line.matches('.h-line, .v-line')) return;

            const { lineType, lineRow, lineCol } = line.dataset;
            const r = parseInt(lineRow);
            const c = parseInt(lineCol);

            if (this.claimLine(r, c, lineType)) {
                ui.claimLine(line, this.state.currentPlayer);
                const boxesCompleted = this.checkForCompletedBoxes(r, c, lineType);

                if (boxesCompleted > 0) {
                    this.state.scores[this.state.currentPlayer] += boxesCompleted;
                    ui.updateScoreboard(this.state.scores, this.state.currentPlayer);
                    const isGameOver = this.checkGameOver();
                    if (!isGameOver && this.state.gameMode === 'pva' && this.state.currentPlayer === 2) {
                        setTimeout(() => this.triggerAiMove(), CONFIG.aiThinkTime);
                    }
                } else {
                    this.switchPlayer();
                }
            }
        },

        /**
         * Updates the state to claim a line.
         * @param {number} r - The row of the line.
         * @param {number} c - The column of the line.
         * @param {string} type - The type of line ('h' or 'v').
         * @returns {boolean} True if the line was successfully claimed.
         */
        claimLine(r, c, type) {
            const lines = type === 'h' ? this.state.horizontalLines : this.state.verticalLines;
            if (lines[r][c]) return false;
            lines[r][c] = this.state.currentPlayer;
            return true;
        },

        /**
         * Checks for and processes any completed boxes after a move.
         * @param {number} r - The row of the line that was just claimed.
         * @param {number} c - The column of the line that was just claimed.
         * @param {string} lineType - The type of line ('h' or 'v').
         * @returns {number} The number of boxes completed.
         */
        checkForCompletedBoxes(r, c, lineType) {
            let completedCount = 0;
            if (lineType === 'h') {
                if (r < this.state.gridSize && this.isBoxComplete(r, c)) {
                    ui.fillBox(r, c, this.state.currentPlayer);
                    completedCount++;
                }
                if (r > 0 && this.isBoxComplete(r - 1, c)) {
                    ui.fillBox(r - 1, c, this.state.currentPlayer);
                    completedCount++;
                }
            } else {
                if (c < this.state.gridSize && this.isBoxComplete(r, c)) {
                    ui.fillBox(r, c, this.state.currentPlayer);
                    completedCount++;
                }
                if (c > 0 && this.isBoxComplete(r, c - 1)) {
                    ui.fillBox(r, c - 1, this.state.currentPlayer);
                    completedCount++;
                }
            }
            return completedCount;
        },

        /**
         * Checks if a specific box is complete.
         * @param {number} r - The row of the box.
         * @param {number} c - The column of the box.
         * @returns {boolean} True if the box is complete.
         */
        isBoxComplete(r, c) {
            return this.state.horizontalLines[r][c] &&
                   this.state.horizontalLines[r + 1][c] &&
                   this.state.verticalLines[r][c] &&
                   this.state.verticalLines[r][c + 1];
        },

        /**
         * Switches the current player and triggers the AI if necessary.
         */
        switchPlayer() {
            this.state.currentPlayer = this.state.currentPlayer === 1 ? 2 : 1;
            ui.updateTurnIndicator(this.state.currentPlayer, this.state.gameMode);
            if (this.state.gameMode === 'pva' && this.state.currentPlayer === 2 && !this.state.gameOver) {
                setTimeout(() => this.triggerAiMove(), CONFIG.aiThinkTime);
            }
        },

        /**
         * Checks if the game is over and triggers the game over modal if it is.
         * @returns {boolean} True if the game is over.
         */
        checkGameOver() {
            const totalBoxes = this.state.gridSize * this.state.gridSize;
            const currentTotal = this.state.scores[1] + this.state.scores[2];
            if (currentTotal < totalBoxes) return false;

            this.state.gameOver = true;
            let headline, finalScoreText;
            const player2Label = this.state.gameMode === 'pva' ? 'AI' : 'Player 2';

            if (this.state.scores[1] > this.state.scores[2]) {
                headline = 'Player 1 Wins!';
                ui.startConfetti();
            } else if (this.state.scores[2] > this.state.scores[1]) {
                headline = `${player2Label} Wins!`;
                ui.startConfetti();
            } else {
                headline = "It's a Draw!";
            }
            finalScoreText = `Final Score: ${this.state.scores[1]} - ${this.state.scores[2]}`;
            ui.showGameOverModal(headline, finalScoreText);
            return true;
        },

        /**
         * Gets a move from the AI module and executes it.
         */
        triggerAiMove() {
            if (this.state.gameOver) return;
            const move = ai.getMove(this.state);
            if (move) {
                const { r, c, type } = move;
                const lineEl = dom.gameBoard.querySelector(`.${type}-line[data-line-row='${r}'][data-line-col='${c}']`);
                this.handleLineClick(lineEl);
            }
        }
    };

    // --- Event Listeners ---
    dom.gameBoard.addEventListener('click', (e) => game.handleLineClick(e.target));
    dom.newGameBtn.addEventListener('click', () => game.init());
    dom.gridSizeSelect.addEventListener('change', () => game.init());
    dom.gameModeSelect.addEventListener('change', () => {
        dom.aiDifficultyWrapper.style.display = dom.gameModeSelect.value === 'pva' ? 'block' : 'none';
        game.init();
    });
    dom.aiDifficultySelect.addEventListener('change', () => game.init());
    dom.playAgainBtn.addEventListener('click', () => {
        ui.hideGameOverModal();
        setTimeout(() => game.init(), CONFIG.aiThinkTime);
    });
    dom.mainMenuBtn.addEventListener('click', () => {
        ui.hideGameOverModal();
        setTimeout(() => game.init(), CONFIG.aiThinkTime);
    });

    // --- Initial Game Setup ---
    dom.aiDifficultyWrapper.style.display = 'none';
    game.init();
});