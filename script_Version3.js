// Jeu de foot simple en HTML/CSS/JS
// - Terrain vert, 2 buts
// - Ballon avec rebond et friction
// - 2 pions contrôlables (WASD et flèches)
// - Score et bouton Recommencer

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// Buts
const goalHeight = 160;
const goalTop = (H - goalHeight) / 2;
const goalDepth = 20;

// Score
let scoreLeft = 0, scoreRight = 0;
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart');
restartBtn.addEventListener('click', resetGame);

// Ballon
const ball = { x: W/2, y: H/2, r: 12, vx: 0, vy: 0, color: '#ffffff' };

// Joueurs (pions)
function createPlayer(x,y,color,keys){ return {x,y,r:16,color,keys,speed:3}; }
const playerLeft  = createPlayer(120, H/2, '#ff5252', {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'});
const playerRight = createPlayer(W-120, H/2, '#2196f3', {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'});

// Input
const keysDown = {};
window.addEventListener('keydown', e => { keysDown[e.code] = true; });
window.addEventListener('keyup',   e => { keysDown[e.code] = false; });

// Utilitaires
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// Reset
function resetPositions(){
  ball.x = W/2; ball.y = H/2; ball.vx = 0; ball.vy = 0;
  playerLeft.x = 120; playerLeft.y = H/2;
  playerRight.x = W-120; playerRight.y = H/2;
}
function resetGame(){
  scoreLeft = 0; scoreRight = 0;
  updateScoreUI();
  resetPositions();
}
function updateScoreUI(){ scoreEl.textContent = scoreLeft + " - " + scoreRight; }

// Dessin du terrain
function drawField(){
  // herbe (bandes)
  ctx.fillStyle = '#2b8a2b';
  ctx.fillRect(0,0,W,H);
  for(let i=0;i<12;i++){
    const h = H / 12;
    ctx.fillStyle = i%2===0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0)';
    ctx.fillRect(0,i*h,W,h);
  }
  // ligne médiane et cercle central
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2,H/2,60,0,Math.PI*2); ctx.stroke();

  // zones de mur et ouverture des buts
  ctx.fillStyle = '#ffffff22';
  ctx.fillRect(0,0,goalDepth,H);
  ctx.fillRect(W-goalDepth,0,goalDepth,H);
  ctx.clearRect(0, goalTop, goalDepth, goalHeight);
  ctx.clearRect(W-goalDepth, goalTop, goalDepth, goalHeight);

  // encadrement des buts
  ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 3;
  ctx.strokeRect(0, goalTop, goalDepth, goalHeight);
  ctx.strokeRect(W-goalDepth, goalTop, goalDepth, goalHeight);
}

// Dessin
function drawBall(){
  ctx.fillStyle = ball.color;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(ball.x+4, ball.y+7, ball.r*0.9, ball.r*0.45, 0, 0, Math.PI*2); ctx.fill();
}
function drawPlayer(p){
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('P', p.x, p.y-1);
}

// Physique
const restitution = 0.75;
const friction = 0.995;
const kickStrength = 2.4;

function updatePlayers(){
  [playerLeft, playerRight].forEach(p=>{
    let vx=0, vy=0;
    if(keysDown[p.keys.up]) vy -= 1;
    if(keysDown[p.keys.down]) vy += 1;
    if(keysDown[p.keys.left]) vx -= 1;
    if(keysDown[p.keys.right]) vx += 1;
    if(vx!==0 || vy!==0){
      const len = Math.hypot(vx,vy);
      vx = (vx/len) * p.speed;
      vy = (vy/len) * p.speed;
      p.x += vx; p.y += vy;
    }
    const margin = p.r + 2;
    p.x = clamp(p.x, margin, W - margin);
    p.y = clamp(p.y, margin, H - margin);
    // empêcher d'entrer dans l'ouverture des buts
    if(p.x - p.r < goalDepth && (p.y > goalTop && p.y < goalTop + goalHeight)) {
      p.x = goalDepth + p.r;
    }
    if(p.x + p.r > W - goalDepth && (p.y > goalTop && p.y < goalTop + goalHeight)) {
      p.x = W - goalDepth - p.r;
    }
  });
}

// Collision player <-> ball
function handlePlayerBallCollisions(){
  [playerLeft, playerRight].forEach(p=>{
    const dx = ball.x - p.x, dy = ball.y - p.y;
    const d = Math.hypot(dx,dy);
    const minD = ball.r + p.r;
    if(d < minD + 0.1){
      const nx = dx / (d || 1), ny = dy / (d || 1);
      const overlap = minD - d;
      ball.x += nx * overlap * 0.6;
      ball.y += ny * overlap * 0.6;
      // appliquer un coup
      ball.vx = nx * kickStrength + ball.vx * 0.2;
      ball.vy = ny * kickStrength + ball.vy * 0.2;
      // limiter vitesse
      const maxSpeed = 12;
      const s = Math.hypot(ball.vx, ball.vy);
      if(s > maxSpeed){ ball.vx = (ball.vx / s) * maxSpeed; ball.vy = (ball.vy / s) * maxSpeed; }
    }
  });
}

// Rebond sur les bords et détection but
function handleBallWallCollisions(){
  if(ball.y - ball.r < 0){ ball.y = ball.r; ball.vy = -ball.vy * restitution; }
  if(ball.y + ball.r > H){ ball.y = H - ball.r; ball.vy = -ball.vy * restitution; }

  if(ball.x - ball.r < 0){
    if(ball.y > goalTop && ball.y < goalTop + goalHeight){
      // but pour droite
      scoreRight += 1;
      updateScoreUI();
      resetPositions();
      return;
    } else {
      ball.x = ball.r; ball.vx = -ball.vx * restitution;
    }
  }
  if(ball.x + ball.r > W){
    if(ball.y > goalTop && ball.y < goalTop + goalHeight){
      // but pour gauche
      scoreLeft += 1;
      updateScoreUI();
      resetPositions();
      return;
    } else {
      ball.x = W - ball.r; ball.vx = -ball.vx * restitution;
    }
  }
}

function updateBall(){
  ball.vx *= friction; ball.vy *= friction;
  if(Math.abs(ball.vx) < 0.005) ball.vx = 0;
  if(Math.abs(ball.vy) < 0.005) ball.vy = 0;
  ball.x += ball.vx; ball.y += ball.vy;
  handleBallWallCollisions();
  handlePlayerBallCollisions();
}

// Boucle
function loop(){
  updatePlayers();
  updateBall();
  ctx.clearRect(0,0,W,H);
  drawField();
  drawBall();
  drawPlayer(playerLeft);
  drawPlayer(playerRight);
  requestAnimationFrame(loop);
}

resetGame(); updateScoreUI(); loop();