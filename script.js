const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.6;
const JUMP_POWER = -12;
const GROUND_Y = 320;
const GAME_SPEED = 5;

// Game State
let isPlaying = false;
let score = 0;
let frameCount = 0;
let bgX = 0;

// Entities
let rabbit = {
    x: 50,
    y: GROUND_Y,
    width: 80,
    height: 80,
    velocityY: 0,
    isJumping: false
};

let obstacles = [];

// Images
const rabbitImg = new Image();
rabbitImg.src = 'assets/rabbit_run.png';

const bgImg = new Image();
bgImg.src = 'assets/macabre_forest.png';

const cactusImg = new Image();
cactusImg.src = 'assets/vintage_cactus.png';

// Wait for all images to load
let imagesLoaded = 0;
const totalImages = 3;
function checkImages() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        initGame();
    }
}
rabbitImg.onload = checkImages;
bgImg.onload = checkImages;
cactusImg.onload = checkImages;

// Utility to chroma-key (remove green background) from an image
function getChromaKeyedImage(img) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.width;
    offCanvas.height = img.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);
    
    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;
    
    // Remove bright green pixels (r < 100, g > 150, b < 100)
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        if (g > 150 && r < 100 && b < 100) {
            data[i+3] = 0; // Make transparent
        }
    }
    offCtx.putImageData(imgData, 0, 0);
    return offCanvas;
}

let keyedRabbit, keyedCactus;

function initGame() {
    // Process images
    keyedRabbit = getChromaKeyedImage(rabbitImg);
    keyedCactus = getChromaKeyedImage(cactusImg);

    // Listeners
    document.addEventListener('keydown', handleInput);
    document.addEventListener('mousedown', handleInput);
    document.getElementById('restartButton').addEventListener('click', resetGame);
    
    resetGame();
}

function handleInput(e) {
    if ((e.code === 'Space' || e.code === 'ArrowUp' || e.type === 'mousedown')) {
        if (!isPlaying) {
            resetGame();
        } else if (!rabbit.isJumping) {
            rabbit.velocityY = JUMP_POWER;
            rabbit.isJumping = true;
        }
    }
}

function resetGame() {
    rabbit.y = GROUND_Y;
    rabbit.velocityY = 0;
    rabbit.isJumping = false;
    obstacles = [];
    score = 0;
    frameCount = 0;
    bgX = 0;
    isPlaying = true;
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('score').innerText = score;
    gameLoop();
}

function spawnObstacle() {
    // Spawn every 90 to 150 frames randomly
    if (frameCount % (Math.floor(Math.random() * 60) + 90) === 0) {
        obstacles.push({
            x: canvas.width,
            y: GROUND_Y + 10, // slightly lower
            width: 50,
            height: 70
        });
    }
}

function update() {
    // Physics
    rabbit.velocityY += GRAVITY;
    rabbit.y += rabbit.velocityY;

    if (rabbit.y >= GROUND_Y) {
        rabbit.y = GROUND_Y;
        rabbit.isJumping = false;
        rabbit.velocityY = 0;
    }

    // Move background
    bgX -= (GAME_SPEED / 2);
    if (bgX <= -canvas.width) {
        bgX = 0;
    }

    // Move obstacles
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].x -= GAME_SPEED;
        
        // Collision Detection (Hitbox slightly smaller than image for fairness)
        const marginX = 15;
        const marginY = 15;
        
        if (
            rabbit.x + marginX < obstacles[i].x + obstacles[i].width - marginX &&
            rabbit.x + rabbit.width - marginX > obstacles[i].x + marginX &&
            rabbit.y + marginY < obstacles[i].y + obstacles[i].height - marginY &&
            rabbit.y + rabbit.height - marginY > obstacles[i].y + marginY
        ) {
            gameOver();
        }
    }

    // Remove off-screen obstacles and increase score
    if (obstacles.length > 0 && obstacles[0].x < -obstacles[0].width) {
        obstacles.shift();
        score++;
        document.getElementById('score').innerText = score;
    }

    spawnObstacle();
    frameCount++;
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background twice for seamless scrolling
    ctx.globalAlpha = 0.4; // Fade the background so characters pop!
    ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    // Draw ground line
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + rabbit.height - 5);
    ctx.lineTo(canvas.width, GROUND_Y + rabbit.height - 5);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw obstacles with a sharp drop shadow (sticker effect)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    for (let obs of obstacles) {
        ctx.drawImage(keyedCactus, obs.x, obs.y, obs.width, obs.height);
    }
    ctx.restore();

    // Draw shadow on the ground to give the rabbit "weight"
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    // The higher the rabbit jumps, the smaller and lighter the shadow
    let shadowWidth = Math.max(10, (rabbit.width / 2) - ((GROUND_Y - rabbit.y) / 5));
    let shadowAlpha = Math.max(0.1, 0.4 - ((GROUND_Y - rabbit.y) / 400));
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.ellipse(rabbit.x + rabbit.width/2, GROUND_Y + rabbit.height - 5, shadowWidth, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw rabbit with a sharp drop shadow (sticker effect)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(keyedRabbit, rabbit.x, rabbit.y, rabbit.width, rabbit.height);
    ctx.restore();
}

function gameLoop() {
    if (!isPlaying) return;
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    isPlaying = false;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}
