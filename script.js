document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('helloBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            alert('Привет!');
        });
    }
});

// Вращающийся куб с помощью Three.js
const cubeContainer = document.getElementById('cube-container');
if (cubeContainer && window.THREE) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 300/200, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(300, 200);
    cubeContainer.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 3;

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

// Переключение вкладок
const tabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const physarumCanvas = document.getElementById('physarum-canvas');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById('tab-' + tabName).classList.add('active');
        // Показывать physarum только на Home
        if (physarumCanvas) {
            physarumCanvas.style.display = (tabName === 'home') ? 'block' : 'none';
        }
    });
});

// При загрузке показывать только если Home активен
if (physarumCanvas) {
    physarumCanvas.style.display = document.querySelector('.nav-tab.active[data-tab="home"]') ? 'block' : 'none';
}

// Заготовка для physarum simulation
function resizePhysarumCanvas() {
    const canvas = document.getElementById('physarum-canvas');
    const main = document.querySelector('main');
    if (!canvas || !main) return;
    const dpr = window.devicePixelRatio || 1;
    const padding = 24 * 2;
    const width = Math.floor(main.clientWidth - padding - 10 - 20);
    const height = Math.floor(main.clientHeight - padding - 20 - 20);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
}
window.addEventListener('resize', resizePhysarumCanvas);
resizePhysarumCanvas();

// === PHYSARUM SIMULATION ===
let AGENT_COUNT = 2000;
let SENSOR_DIST = 9;
let SENSOR_ANGLE = Math.PI / 4;
let TURN_ANGLE = Math.PI / 8;
let STEP_SIZE = 1.2;
const EVAPORATE = 0.02;
const DIFFUSE = 0.2;

let simW = 0, simH = 0;
let pheromone, agents;

function initPhysarum() {
    const main = document.querySelector('main');
    const padding = 24 * 2;
    simW = Math.ceil((main.clientWidth - padding - 10 - 20) / 4);
    simH = Math.ceil((main.clientHeight - padding - 20 - 20) / 4);
    pheromone = new Float32Array(simW * simH);
    agents = [];
    for (let i = 0; i < AGENT_COUNT; i++) {
        agents.push({
            x: Math.random() * simW,
            y: Math.random() * simH,
            angle: Math.random() * Math.PI * 2
        });
    }
}

function sense(x, y, angle) {
    let sx = Math.round(x + Math.cos(angle) * SENSOR_DIST);
    let sy = Math.round(y + Math.sin(angle) * SENSOR_DIST);
    if (sx < 0 || sx >= simW || sy < 0 || sy >= simH) return 0;
    return pheromone[sy * simW + sx];
}

function updatePhysarum() {
    // Move agents
    for (let agent of agents) {
        // Sense
        let f = sense(agent.x, agent.y, agent.angle);
        let l = sense(agent.x, agent.y, agent.angle - SENSOR_ANGLE);
        let r = sense(agent.x, agent.y, agent.angle + SENSOR_ANGLE);
        // Turn
        if (f > l && f > r) {
            // go straight
        } else if (l > r) {
            agent.angle -= TURN_ANGLE;
        } else if (r > l) {
            agent.angle += TURN_ANGLE;
        } else {
            agent.angle += (Math.random() - 0.5) * TURN_ANGLE;
        }
        // Move
        agent.x += Math.cos(agent.angle) * STEP_SIZE;
        agent.y += Math.sin(agent.angle) * STEP_SIZE;
        // Wrap
        if (agent.x < 0) agent.x += simW;
        if (agent.x >= simW) agent.x -= simW;
        if (agent.y < 0) agent.y += simH;
        if (agent.y >= simH) agent.y -= simH;
        // Deposit pheromone
        let ix = Math.round(agent.x);
        let iy = Math.round(agent.y);
        if (ix >= 0 && ix < simW && iy >= 0 && iy < simH) {
            pheromone[iy * simW + ix] += 1.0;
        }
    }
    // Evaporate & diffuse pheromone
    let next = new Float32Array(simW * simH);
    for (let y = 0; y < simH; y++) {
        for (let x = 0; x < simW; x++) {
            let idx = y * simW + x;
            let sum = pheromone[idx];
            let count = 1;
            // 4-neighbor diffusion
            if (x > 0) { sum += pheromone[idx - 1]; count++; }
            if (x < simW - 1) { sum += pheromone[idx + 1]; count++; }
            if (y > 0) { sum += pheromone[idx - simW]; count++; }
            if (y < simH - 1) { sum += pheromone[idx + simW]; count++; }
            next[idx] = (sum / count) * (1 - EVAPORATE);
        }
    }
    pheromone = next;
}

function drawPhysarum() {
    const canvas = document.getElementById('physarum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const main = document.querySelector('main');
    const padding = 24 * 2;
    const width = Math.floor(main.clientWidth - padding - 10 - 20);
    const height = Math.floor(main.clientHeight - padding - 20 - 20);
    // Render pheromone field
    const imageData = ctx.createImageData(simW, simH);
    for (let i = 0; i < simW * simH; i++) {
        let v = Math.min(pheromone[i] * 32, 255);
        imageData.data[i*4+0] = v;
        imageData.data[i*4+1] = v;
        imageData.data[i*4+2] = 0;
        imageData.data[i*4+3] = 255;
    }
    // Масштабируем на весь canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = simW;
    tempCanvas.height = simH;
    tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
    ctx.save();
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, simW, simH, 0, 0, width, height);
    ctx.restore();
}

function animatePhysarum() {
    updatePhysarum();
    drawPhysarum();
    requestAnimationFrame(animatePhysarum);
}

// Инициализация при загрузке и ресайзе
function physarumResizeAndInit() {
    resizePhysarumCanvas();
    initPhysarum();
}
window.addEventListener('resize', physarumResizeAndInit);
physarumResizeAndInit();
animatePhysarum();

function randomizeAgentParams() {
    // TURN_ANGLE теперь может быть отрицательным или положительным
    const maxTurn = Math.PI / 6; // ~30°
    TURN_ANGLE = (Math.random() * 2 - 1) * maxTurn; // [-maxTurn, +maxTurn]
    // SENSOR_ANGLE и SENSOR_DIST остаются положительными
    SENSOR_ANGLE = Math.PI / 8 + Math.random() * (Math.PI / 3); // ~22°..60°
    SENSOR_DIST = 6 + Math.random() * 18; // 6..24
    STEP_SIZE = 0.8 + Math.random() * 2.0; // 0.8..2.8
}
setInterval(randomizeAgentParams, 10000);
randomizeAgentParams();

// Секретная кнопка на 4-й карточке
function setupSecretBtn() {
    document.querySelectorAll('.card').forEach(card => {
        const btn = card.querySelector('.secret-btn');
        const text = card.querySelector('.secret-text');
        if (btn && text) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (text.style.display === 'none' || !text.style.display) {
                    text.style.display = 'block';
                } else {
                    text.style.display = 'none';
                }
            });
        }
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSecretBtn);
} else {
    setupSecretBtn();
}

// Snake Game with AI
class SnakeGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        // Calculate grid size based on canvas dimensions
        this.cellSize = 20; // Fixed cell size
        this.gridWidth = Math.floor(this.canvas.width / this.cellSize);
        this.gridHeight = Math.floor(this.canvas.height / this.cellSize);
        
        // Center the game field
        this.offsetX = (this.canvas.width - (this.gridWidth * this.cellSize)) / 2;
        this.offsetY = (this.canvas.height - (this.gridHeight * this.cellSize)) / 2;
        
        this.reset();
        this.start();
    }

    reset() {
        // Initialize snake in the middle
        this.snake = [{
            x: Math.floor(this.gridWidth / 2),
            y: Math.floor(this.gridHeight / 2)
        }];
        this.direction = 'right';
        this.food = this.generateFood();
        this.score = 0;
        this.gameOver = false;
        this.speed = 33; // Уменьшаем базовую задержку с 100мс до 33мс (примерно в 3 раза быстрее)
    }

    generateFood() {
        while (true) {
            const food = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
            
            // Check if food is not on snake
            if (!this.snake.some(segment => segment.x === food.x && segment.y === food.y)) {
                return food;
            }
        }
    }

    aiThink() {
        const head = this.snake[0];
        const dx = this.food.x - head.x;
        const dy = this.food.y - head.y;
        
        const possibleMoves = [
            {dir: 'right', dx: 1, dy: 0},
            {dir: 'left', dx: -1, dy: 0},
            {dir: 'up', dx: 0, dy: -1},
            {dir: 'down', dx: 0, dy: 1}
        ];

        const safeMoves = possibleMoves.filter(move => {
            const newX = head.x + move.dx;
            const newY = head.y + move.dy;
            
            // Check wall collision
            if (newX < 0 || newX >= this.gridWidth || newY < 0 || newY >= this.gridHeight) {
                return false;
            }
            
            // Check self collision
            return !this.snake.some(segment => segment.x === newX && segment.y === newY);
        });

        if (safeMoves.length === 0) {
            return this.direction;
        }

        let bestMove = safeMoves[0];
        let bestDistance = Infinity;

        for (const move of safeMoves) {
            const newX = head.x + move.dx;
            const newY = head.y + move.dy;
            const distance = Math.abs(this.food.x - newX) + Math.abs(this.food.y - newY);
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMove = move;
            }
        }

        return bestMove.dir;
    }

    update() {
        if (this.gameOver) {
            setTimeout(() => this.reset(), 1000);
            return;
        }

        this.direction = this.aiThink();

        const head = {...this.snake[0]};
        switch (this.direction) {
            case 'right': head.x++; break;
            case 'left': head.x--; break;
            case 'up': head.y--; break;
            case 'down': head.y++; break;
        }

        if (head.x < 0 || head.x >= this.gridWidth ||
            head.y < 0 || head.y >= this.gridHeight ||
            this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver = true;
            return;
        }

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.food = this.generateFood();
            this.speed = Math.max(16, 33 - this.score * 1); // Увеличиваем скорость быстрее, минимальная задержка теперь 16мс
        } else {
            this.snake.pop();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        // Draw vertical lines
        for (let x = 0; x <= this.gridWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX + x * this.cellSize, this.offsetY);
            this.ctx.lineTo(this.offsetX + x * this.cellSize, this.offsetY + this.gridHeight * this.cellSize);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= this.gridHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, this.offsetY + y * this.cellSize);
            this.ctx.lineTo(this.offsetX + this.gridWidth * this.cellSize, this.offsetY + y * this.cellSize);
            this.ctx.stroke();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw snake
        this.ctx.fillStyle = '#4CAF50';
        this.snake.forEach(segment => {
            this.ctx.fillRect(
                this.offsetX + segment.x * this.cellSize,
                this.offsetY + segment.y * this.cellSize,
                this.cellSize - 1,
                this.cellSize - 1
            );
        });

        // Draw food
        this.ctx.fillStyle = '#FF5722';
        this.ctx.fillRect(
            this.offsetX + this.food.x * this.cellSize,
            this.offsetY + this.food.y * this.cellSize,
            this.cellSize - 1,
            this.cellSize - 1
        );

        // Draw score
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Grid: ${this.gridWidth}x${this.gridHeight}`, 10, 60);
    }

    start() {
        const gameLoop = () => {
            this.update();
            this.draw();
            setTimeout(() => requestAnimationFrame(gameLoop), this.speed);
        };
        requestAnimationFrame(gameLoop);
    }
}

// Initialize Snake game when Programs tab is shown
document.addEventListener('DOMContentLoaded', () => {
    let snakeGame = null;
    const programsTab = document.querySelector('.nav-tab[data-tab="programs"]');
    
    programsTab.addEventListener('click', () => {
        if (!snakeGame) {
            snakeGame = new SnakeGame('snake-game');
        }
    });
});

// Card Physarum Simulation
class CardPhysarum {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Параметры симуляции
        this.particleCount = 50000;
        this.sensorAngle = Math.PI / 4;
        this.sensorDist = 12;
        this.rotationAngle = Math.PI / 8;
        this.stepSize = 2;
        this.depositAmount = 1.0;
        this.decayFactor = 0.95;
        this.diffusionFactor = 0.5;

        // Параметры безумия
        this.madnessThreshold = 5.0; // Порог феромона для безумия
        this.madnessDuration = 100;  // Длительность безумия в кадрах
        this.madnessChance = 0.1;    // Вероятность войти в безумие при превышении порога
        
        this.initSimulation();
        this.start();
    }

    initSimulation() {
        // Создаем частицы в форме круга
        this.particles = new Array(this.particleCount);
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) / 4;

        for (let i = 0; i < this.particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * radius;
            this.particles[i] = {
                x: centerX + Math.cos(angle) * r,
                y: centerY + Math.sin(angle) * r,
                angle: angle,
                isMad: false,
                madnessTimer: 0
            };
        }

        // Создаем поле феромонов
        this.trailMap = new Float32Array(this.width * this.height);
        this.nextTrailMap = new Float32Array(this.width * this.height);
    }

    sense(x, y, angle) {
        const sensorX = x + Math.cos(angle) * this.sensorDist;
        const sensorY = y + Math.sin(angle) * this.sensorDist;
        
        // Применяем цикличность к координатам сенсора
        let ix = Math.floor(sensorX);
        let iy = Math.floor(sensorY);
        
        // Обработка цикличности
        ix = ((ix % this.width) + this.width) % this.width;
        iy = ((iy % this.height) + this.height) % this.height;
        
        return this.trailMap[iy * this.width + ix];
    }

    update() {
        // Обновляем частицы
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // Сенсоры
            const center = this.sense(p.x, p.y, p.angle);
            const left = this.sense(p.x, p.y, p.angle - this.sensorAngle);
            const right = this.sense(p.x, p.y, p.angle + this.sensorAngle);
            
            // Проверка на безумие
            if (!p.isMad && center > this.madnessThreshold && Math.random() < this.madnessChance) {
                p.isMad = true;
                p.madnessTimer = this.madnessDuration;
                // Разворачиваем агента на 180 градусов при входе в безумие
                p.angle += Math.PI;
            }

            // Обновление таймера безумия
            if (p.isMad) {
                p.madnessTimer--;
                if (p.madnessTimer <= 0) {
                    p.isMad = false;
                }
            }
            
            // Поворот на основе сенсоров (с учетом безумия)
            if (!p.isMad) {
                if (center > left && center > right) {
                    // продолжаем движение
                } else if (left > right) {
                    p.angle -= this.rotationAngle;
                } else if (right > left) {
                    p.angle += this.rotationAngle;
                }
            } else {
                // В состоянии безумия делаем противоположные решения
                if (center > left && center > right) {
                    p.angle += Math.PI; // Разворачиваемся от сильного следа
                } else if (left > right) {
                    p.angle += this.rotationAngle; // Поворачиваем в противоположную сторону
                } else if (right > left) {
                    p.angle -= this.rotationAngle; // Поворачиваем в противоположную сторону
                }
            }
            
            // Движение
            p.x += Math.cos(p.angle) * this.stepSize;
            p.y += Math.sin(p.angle) * this.stepSize;
            
            // Цикличность мира
            if (p.x < 0) p.x += this.width;
            if (p.x >= this.width) p.x -= this.width;
            if (p.y < 0) p.y += this.height;
            if (p.y >= this.height) p.y -= this.height;
            
            // Оставляем след
            const ix = Math.floor(p.x);
            const iy = Math.floor(p.y);
            this.trailMap[iy * this.width + ix] += p.isMad ? this.depositAmount * 2 : this.depositAmount;
        }
        
        // Диффузия и затухание
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                const idx = y * this.width + x;
                let sum = 0;
                sum += this.trailMap[idx - 1];
                sum += this.trailMap[idx + 1];
                sum += this.trailMap[idx - this.width];
                sum += this.trailMap[idx + this.width];
                
                this.nextTrailMap[idx] = (
                    this.trailMap[idx] * (1 - this.diffusionFactor) +
                    (sum / 4) * this.diffusionFactor
                ) * this.decayFactor;
            }
        }
        
        // Обмен буферов
        [this.trailMap, this.nextTrailMap] = [this.nextTrailMap, this.trailMap];
    }

    draw() {
        const imageData = this.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        
        for (let i = 0; i < this.trailMap.length; i++) {
            const value = Math.min(255, this.trailMap[i] * 80);
            const i4 = i * 4;
            // Желто-оранжевый цвет для обычных следов
            data[i4] = value;
            data[i4 + 1] = value * 0.6;
            data[i4 + 2] = value * 0.2; // Добавляем немного синего для безумных следов
            data[i4 + 3] = 255;
        }

        // Отрисовка агентов в состоянии безумия
        for (const p of this.particles) {
            if (p.isMad) {
                const idx = (Math.floor(p.y) * this.width + Math.floor(p.x)) * 4;
                data[idx] = 255;     // Красный
                data[idx + 1] = 0;   // Зеленый
                data[idx + 2] = 255; // Синий
                data[idx + 3] = 255;
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    start() {
        const animate = () => {
            this.update();
            this.draw();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }
}

// Initialize Card Physarum when Programs tab is shown
document.addEventListener('DOMContentLoaded', () => {
    let cardPhysarum = null;
    const programsTab = document.querySelector('.nav-tab[data-tab="programs"]');
    
    programsTab.addEventListener('click', () => {
        if (!cardPhysarum) {
            cardPhysarum = new CardPhysarum('card-physarum');
        }
    });
}); 