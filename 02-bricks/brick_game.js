'use strict';

const board = document.querySelector('#board');
const pen = board.getContext('2d');
const remaining = document.querySelector('#remaining');
const chances = document.querySelector('#chances');
const message = document.querySelector('#message');
const stateTitle = document.querySelector('#state-title');
const stateHint = document.querySelector('#state-hint');

const brickWidth = 100;
const brickHeight = 24;
const gap = 8;
const columns = 8;
const rows = 7;
const brickLeft = (board.width - (columns * brickWidth + (columns - 1) * gap)) / 2;
const miku = { x: 480, y: 468, width: 126, height: 112, hitWidth: 112 };
const hitDuration = 0.26;
const sprite = new Image();
sprite.src = 'assets/miku-pixel.png';
const hitSprite = new Image();
hitSprite.src = 'assets/miku-hit.png';

const ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 6 };
const keys = new Set();
let bricks;
let left;
let lives;
let phase;
let lastFrame;
let hitTime = 0;

function showState(next, title = '', hint = '') {
  phase = next;
  stateTitle.textContent = title;
  stateHint.textContent = hint;
  message.hidden = next === 'playing';
}

function updateCounters() {
  remaining.textContent = left;
  chances.textContent = lives;
}

function reset() {
  bricks = Array.from({ length: rows * columns }, (_, index) => ({
    x: brickLeft + (index % columns) * (brickWidth + gap),
    y: 24 + Math.floor(index / columns) * (brickHeight + gap),
    active: true
  }));
  left = bricks.length;
  lives = 3;
  hitTime = 0;
  miku.x = board.width / 2;
  parkBall();
  updateCounters();
  showState('ready', '준비 완료', '스페이스바로 시작');
}

function parkBall() {
  ball.x = miku.x;
  ball.y = miku.y - ball.radius - 12;
}

function launch() {
  if (phase === 'playing') return;
  if (phase === 'won' || phase === 'lost') reset();
  ball.vx = 220;
  ball.vy = -380;
  showState('playing');
}

window.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) return;
  event.preventDefault();
  if (event.code === 'Space') {
    if (!event.repeat) launch();
    return;
  }
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function strikeBrick() {
  const radius = ball.radius;
  // 축을 한 번에 하나씩 이동하여 부딪힌 면에서 공을 되돌린다.
  for (const brick of bricks) {
    if (!brick.active ||
        ball.x + radius <= brick.x || ball.x - radius >= brick.x + brickWidth ||
        ball.y + radius <= brick.y || ball.y - radius >= brick.y + brickHeight) continue;
    brick.active = false;
    left -= 1;
    updateCounters();
    if (left === 0) showState('won', '성공!', '스페이스바로 다시 시작');
    return brick;
  }
  return null;
}

function step(seconds) {
  hitTime = Math.max(0, hitTime - seconds);
  const half = miku.width / 2;
  const direction = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
  miku.x = Math.max(half, Math.min(board.width - half, miku.x + direction * 530 * seconds));

  if (phase === 'ready') parkBall();
  if (phase !== 'playing') return;

  const radius = ball.radius;
  const oldY = ball.y;
  ball.x += ball.vx * seconds;
  if (ball.x < radius || ball.x > board.width - radius) {
    ball.x = Math.max(radius, Math.min(board.width - radius, ball.x));
    ball.vx *= -1;
  }
  const side = strikeBrick();
  if (side) {
    ball.x = ball.vx > 0 ? side.x - radius : side.x + brickWidth + radius;
    ball.vx *= -1;
  }
  if (phase !== 'playing') return;

  ball.y += ball.vy * seconds;
  if (ball.y < radius) {
    ball.y = radius;
    ball.vy = Math.abs(ball.vy);
  }
  const face = strikeBrick();
  if (face) {
    ball.y = ball.vy > 0 ? face.y - radius : face.y + brickHeight + radius;
    ball.vy *= -1;
  }
  if (phase !== 'playing') return;

  const offset = (ball.x - miku.x) / (miku.hitWidth / 2);
  if (ball.vy > 0 && oldY + radius <= miku.y && ball.y + radius >= miku.y &&
      Math.abs(ball.x - miku.x) <= miku.hitWidth / 2 + radius) {
    const angle = Math.max(-1, Math.min(1, offset)) * 1.0;
    ball.y = miku.y - radius;
    ball.vx = 460 * Math.sin(angle);
    ball.vy = -460 * Math.cos(angle);
    hitTime = hitDuration;
  }

  if (ball.y - radius > board.height) {
    lives -= 1;
    updateCounters();
    if (lives === 0) {
      showState('lost', '게임 종료', '스페이스바로 다시 시작');
    } else {
      parkBall();
      showState('ready', '다시 도전', '스페이스바로 공 출발');
    }
  }
}

function block(color, x, y, width, height) {
  pen.fillStyle = color;
  pen.fillRect(x, y, width, height);
}

function draw() {
  block('#000', 0, 0, board.width, board.height);
  block('#153636', 0, 0, board.width, 4);
  block('#153636', 0, 0, 3, board.height);
  block('#153636', board.width - 3, 0, 3, board.height);
  for (const brick of bricks) {
    if (!brick.active) continue;
    const { x, y } = brick;
    block('#103330', x + 3, y + 3, brickWidth, brickHeight);
    block('#39c5bb', x, y, brickWidth, brickHeight);
    block('#8af8e8', x + 4, y + 2, brickWidth - 8, 3);
    block('#268e89', x + 4, y + 19, brickWidth - 8, 3);
    block('#bcfff2', x + 5, y + 7, 5, 3);
  }

  const x = Math.round(miku.x);
  const pose = hitTime > 0 && hitSprite.naturalWidth > 0 ? hitSprite : sprite;
  if (pose.complete && pose.naturalWidth > 0) {
    pen.imageSmoothingEnabled = false;
    const scale = Math.min(miku.width / pose.naturalWidth, miku.height / pose.naturalHeight);
    const width = Math.round(pose.naturalWidth * scale);
    const height = Math.round(pose.naturalHeight * scale);
    // 점프는 그림에만 적용해 공이 튕기는 높이는 일정하게 둔다.
    const hop = Math.round(8 * Math.sin(Math.PI * hitTime / hitDuration));
    block('#163a39', x - 22, miku.y + height + 2, 44, 3);
    pen.drawImage(pose, x - Math.floor(width / 2), miku.y - hop, width, height);
  }
  if (phase !== 'lost') {
    const px = Math.round(ball.x);
    const py = Math.round(ball.y);
    block('#b2f6eb', px - 6, py - 4, 12, 8);
    block('#fff', px - 4, py - 6, 8, 12);
    block('#fff', px - 6, py - 3, 9, 6);
  }
}

function frame(time) {
  const elapsed = Math.min((time - (lastFrame ?? time)) / 1000, 0.04);
  lastFrame = time;
  // 프레임 사이 이동을 나누어 빠른 공도 충돌 지점을 건너뛰지 않게 한다.
  const substeps = Math.max(1, Math.ceil(elapsed * 240));
  for (let index = 0; index < substeps; index += 1) step(elapsed / substeps);
  draw();
  requestAnimationFrame(frame);
}

reset();
requestAnimationFrame(frame);
