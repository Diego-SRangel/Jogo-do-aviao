const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startButton = document.getElementById("start-button");
const scoreLabel = document.getElementById("score");
const bestScoreLabel = document.getElementById("best-score");

const storageKey = "aviao-entre-predios-best";

const game = {
  width: canvas.width,
  height: canvas.height,
  state: "idle",
  score: 0,
  best: Number(localStorage.getItem(storageKey) || 0),
  gravity: 0.34,
  flapStrength: -6.6,
  speed: 2.65,
  spawnTimer: 0,
  spawnEvery: 112,
  buildingGap: 188,
  frame: 0,
  plane: {
    x: 110,
    y: canvas.height / 2,
    width: 54,
    height: 28,
    velocity: 0,
    rotation: 0,
  },
  obstacles: [],
  clouds: createClouds(),
  explosion: null,
};

bestScoreLabel.textContent = String(game.best);

function createClouds() {
  return Array.from({ length: 5 }, (_, index) => ({
    x: index * 120,
    y: 70 + Math.random() * 180,
    width: 56 + Math.random() * 46,
    height: 20 + Math.random() * 12,
    speed: 0.3 + Math.random() * 0.32,
  }));
}

function resetGame() {
  game.state = "idle";
  game.score = 0;
  game.spawnTimer = 0;
  game.frame = 0;
  game.obstacles = [];
  game.clouds = createClouds();
  game.explosion = null;
  game.plane.y = game.height / 2;
  game.plane.velocity = 0;
  game.plane.rotation = 0;
  updateScore();
  showOverlay(
    "Decole e atravesse a cidade",
    "Passe pelos vaos entre os predios e mantenha o aviao no ar.",
    "Começar voo"
  );
}

function startGame() {
  if (game.state === "running") {
    flap();
    return;
  }

  game.state = "running";
  if (overlay) {
    overlay.classList.add("hidden");
  }
  flap();
}

function endGame() {
  game.state = "gameover";
  if (game.score > game.best) {
    game.best = game.score;
    localStorage.setItem(storageKey, String(game.best));
    bestScoreLabel.textContent = String(game.best);
  }

  showOverlay(
    game.score > 0 ? "Fim de voo" : "Colisao imediata",
    `Voce fez ${game.score} ponto${game.score === 1 ? "" : "s"}. Pressione R ou toque no botao para tentar de novo.`,
    "Reiniciar"
  );
}

function crashIntoBuilding() {
  if (game.state !== "running") {
    return;
  }

  game.explosion = createExplosion(game.plane.x + 8, game.plane.y);
  endGame();
}

function createExplosion(x, y) {
  return {
    x,
    y,
    life: 34,
    particles: Array.from({ length: 18 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 18 + Math.random() * 0.35;
      const speed = 1.6 + Math.random() * 2.6;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        size: 6 + Math.random() * 10,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
        life: 22 + Math.random() * 10,
        color: index % 3 === 0 ? "#b64926" : index % 2 === 0 ? "#efc46a" : "#2b2520",
      };
    }),
  };
}

function showOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function updateScore() {
  scoreLabel.textContent = String(game.score);
}

function flap() {
  game.plane.velocity = game.flapStrength;
}

function createObstacle() {
  const gapCenter = 170 + Math.random() * (game.height - 340);
  const topHeight = gapCenter - game.buildingGap / 2;
  const bottomY = gapCenter + game.buildingGap / 2;
  const width = 82 + Math.random() * 26;

  game.obstacles.push({
    x: game.width + 30,
    width,
    topHeight,
    bottomY,
    passed: false,
    windowsOffset: Math.random() * 20,
    colorHue: Math.random() > 0.5 ? 205 : 215,
  });
}

function update() {
  game.frame += 1;
  updateClouds();
  updateExplosion();

  if (game.state !== "running") {
    return;
  }

  game.spawnTimer += 1;
  if (game.spawnTimer >= game.spawnEvery) {
    game.spawnTimer = 0;
    createObstacle();
  }

  game.plane.velocity += game.gravity;
  game.plane.y += game.plane.velocity;
  game.plane.rotation = Math.max(-0.48, Math.min(1.2, game.plane.velocity * 0.08));

  for (const obstacle of game.obstacles) {
    obstacle.x -= game.speed;

    if (!obstacle.passed && obstacle.x + obstacle.width < game.plane.x) {
      obstacle.passed = true;
      game.score += 1;
      updateScore();
    }
  }

  game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

  if (isColliding()) {
    crashIntoBuilding();
    return;
  }

  if (game.plane.y + game.plane.height / 2 >= game.height - 64 || game.plane.y <= 0) {
    endGame();
  }
}

function updateExplosion() {
  if (!game.explosion) {
    return;
  }

  game.explosion.life -= 1;
  for (const particle of game.explosion.particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.04;
    particle.rotation += particle.spin;
    particle.life -= 1;
  }

  game.explosion.particles = game.explosion.particles.filter((particle) => particle.life > 0);
  if (game.explosion.life <= 0 || game.explosion.particles.length === 0) {
    game.explosion = null;
  }
}

function updateClouds() {
  for (const cloud of game.clouds) {
    cloud.x -= cloud.speed;
    if (cloud.x + cloud.width < 0) {
      cloud.x = game.width + 40;
      cloud.y = 70 + Math.random() * 180;
    }
  }
}

function isColliding() {
  const planeBox = {
    x: game.plane.x - game.plane.width / 2 + 10,
    y: game.plane.y - game.plane.height / 2 + 4,
    width: game.plane.width - 18,
    height: game.plane.height - 8,
  };

  return game.obstacles.some((obstacle) => {
    const hitsTop =
      planeBox.x < obstacle.x + obstacle.width &&
      planeBox.x + planeBox.width > obstacle.x &&
      planeBox.y < obstacle.topHeight;

    const hitsBottom =
      planeBox.x < obstacle.x + obstacle.width &&
      planeBox.x + planeBox.width > obstacle.x &&
      planeBox.y + planeBox.height > obstacle.bottomY;

    return hitsTop || hitsBottom;
  });
}

function draw() {
  drawSky();
  drawClouds();
  drawBackgroundCity();
  drawObstacles();
  drawGround();
  drawPlane();
  drawExplosion();
  drawFlightGuide();
  drawPaperGrain();
}

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, game.height);
  sky.addColorStop(0, "#efe6d0");
  sky.addColorStop(0.46, "#e7d9b6");
  sky.addColorStop(1, "#d8c194");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.fillStyle = "rgba(32, 23, 15, 0.08)";
  for (let y = 0; y < game.height; y += 14) {
    ctx.fillRect(0, y, game.width, 1);
  }
}

function drawClouds() {
  ctx.fillStyle = "#fbf6eb";
  ctx.strokeStyle = "rgba(32, 23, 15, 0.18)";
  ctx.lineWidth = 1.2;
  for (const cloud of game.clouds) {
    roundedRect(cloud.x, cloud.y, cloud.width, cloud.height, 4);
    ctx.fill();
    ctx.stroke();
    roundedRect(cloud.x + 16, cloud.y - 10, cloud.width * 0.58, cloud.height, 4);
    ctx.fill();
    ctx.stroke();
  }
}

function drawBackgroundCity() {
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 8; i += 1) {
    const width = 54 + (i % 3) * 18;
    const height = 120 + ((i * 37) % 160);
    const offset = (i * 90 - (game.frame * 0.4) % 90) - 30;
    ctx.fillStyle = i % 2 === 0 ? "#6c5d48" : "#8b7a60";
    ctx.fillRect(offset, game.height - 64 - height, width, height);
    ctx.strokeStyle = "rgba(32, 23, 15, 0.18)";
    ctx.strokeRect(offset, game.height - 64 - height, width, height);
  }
  ctx.restore();
}

function drawObstacles() {
  for (const obstacle of game.obstacles) {
    drawBuilding(obstacle.x, 0, obstacle.width, obstacle.topHeight, obstacle.colorHue, true, obstacle.windowsOffset);
    drawBuilding(
      obstacle.x,
      obstacle.bottomY,
      obstacle.width,
      game.height - obstacle.bottomY - 64,
      obstacle.colorHue,
      false,
      obstacle.windowsOffset
    );
  }
}

function drawBuilding(x, y, width, height, hue, upsideDown, windowsOffset) {
  const palette = hue === 205
    ? { body: "#5c5349", shade: "#403931", windows: "#efe3b0" }
    : { body: "#766452", shade: "#54483d", windows: "#f3d991" };

  ctx.fillStyle = palette.body;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#1f1812";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = palette.shade;
  const roofHeight = 16;
  if (upsideDown) {
    ctx.fillRect(x - 4, height - roofHeight, width + 8, roofHeight);
  } else {
    ctx.fillRect(x - 4, y, width + 8, roofHeight);
  }

  const startY = upsideDown ? y + 20 : y + 24;
  ctx.fillStyle = palette.windows;
  for (let row = startY; row < y + height - 18; row += 28) {
    for (let col = x + 10 + (windowsOffset % 6); col < x + width - 10; col += 18) {
      ctx.fillRect(col, row, 8, 12);
    }
  }
}

function drawGround() {
  const groundY = game.height - 64;
  ctx.fillStyle = "#7c674f";
  ctx.fillRect(0, groundY, game.width, 64);
  ctx.strokeStyle = "#241b13";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 2);
  ctx.lineTo(game.width, groundY + 2);
  ctx.stroke();

  ctx.fillStyle = "#4d3f2f";
  for (let i = 0; i < game.width; i += 24) {
    ctx.fillRect(i - (game.frame * game.speed) % 24, groundY + 12, 14, 8);
  }
}

function drawPlane() {
  if (game.explosion && game.state === "gameover") {
    return;
  }

  const { x, y, rotation } = game.plane;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.strokeStyle = "#1f1812";
  ctx.lineWidth = 1.8;

  ctx.fillStyle = "#dfe5ea";
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(-28, -21);
  ctx.lineTo(-2, -18);
  ctx.lineTo(17, -9);
  ctx.lineTo(9, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.lineTo(-32, 20);
  ctx.lineTo(-6, 18);
  ctx.lineTo(15, 8);
  ctx.lineTo(7, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f7f3ea";
  ctx.beginPath();
  ctx.moveTo(-32, -5);
  ctx.quadraticCurveTo(-19, -13, 8, -12);
  ctx.quadraticCurveTo(25, -12, 35, -7);
  ctx.quadraticCurveTo(40, -3, 40, 0);
  ctx.quadraticCurveTo(40, 4, 35, 8);
  ctx.quadraticCurveTo(25, 12, 7, 12);
  ctx.quadraticCurveTo(-18, 12, -31, 6);
  ctx.quadraticCurveTo(-36, 2, -32, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#295a8e";
  ctx.beginPath();
  ctx.moveTo(-31, -2);
  ctx.lineTo(-43, -18);
  ctx.lineTo(-35, -19);
  ctx.lineTo(-19, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-30, 3);
  ctx.lineTo(-42, 17);
  ctx.lineTo(-33, 18);
  ctx.lineTo(-17, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#295a8e";
  ctx.beginPath();
  ctx.moveTo(19, -8);
  ctx.lineTo(33, -11);
  ctx.lineTo(27, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(20, 8);
  ctx.lineTo(32, 11);
  ctx.lineTo(26, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2520";
  for (let i = 0; i < 8; i += 1) {
    ctx.fillRect(0 + i * 3.3, -4.4, 1.5, 1.5);
  }

  ctx.fillStyle = "#295a8e";
  ctx.beginPath();
  ctx.moveTo(8, -1.4);
  ctx.lineTo(24, -0.8);
  ctx.lineTo(24, 1.6);
  ctx.lineTo(8, 1.1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#d7d0bf";
  ctx.beginPath();
  ctx.ellipse(-9, -17, 4, 6.5, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-11, 15, 4, 6.5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-18, -11, 3.6, 5.6, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-20, 10, 3.6, 5.6, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(31, 24, 18, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-26, -1);
  ctx.quadraticCurveTo(2, -3, 31, -2);
  ctx.stroke();

  ctx.restore();
}

function drawFlightGuide() {
  if (game.state !== "idle") {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(32, 23, 15, 0.22)";
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(24, game.height / 2);
  ctx.lineTo(game.width - 24, game.height / 2);
  ctx.stroke();
  ctx.restore();
}

function drawExplosion() {
  if (!game.explosion) {
    return;
  }

  ctx.save();
  for (const particle of game.explosion.particles) {
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.72);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  ctx.fillStyle = "rgba(182, 73, 38, 0.18)";
  ctx.beginPath();
  ctx.arc(game.explosion.x, game.explosion.y, 26 + (34 - game.explosion.life) * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPaperGrain() {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#2a2119";
  for (let i = 0; i < 90; i += 1) {
    const x = (i * 47 + game.frame * 0.7) % game.width;
    const y = (i * 83 + game.frame * 0.5) % game.height;
    ctx.fillRect(x, y, 1.3, 1.3);
  }
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function handleAction() {
  if (game.state === "gameover") {
    resetGame();
    return;
  }
  startGame();
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    handleAction();
  }

  if (event.key.toLowerCase() === "r") {
    resetGame();
  }
});

canvas.addEventListener("pointerdown", handleAction);
startButton.addEventListener("click", () => {
  if (game.state === "gameover") {
    resetGame();
    return;
  }
  startGame();
});

resetGame();
loop();
