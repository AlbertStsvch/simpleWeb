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