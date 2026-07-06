// --- KHỞI TẠO DOM ---
const gw = document.getElementById('gw'), bgC = document.getElementById('bg-c'), gmC = document.getElementById('game-c'), fxC = document.getElementById('fx-c');
const hud = document.getElementById('hud'), ss = document.getElementById('ss'), ws = document.getElementById('ws');
const svEl = document.getElementById('sv'), lvEl = document.getElementById('lv'), tvEl = document.getElementById('tv'), tgEl = document.getElementById('tg');


// --- BIẾN TRẠNG THÁI GAME ---
let W, H, bgx, gx, fx;
let stars = [], shooters = [], particles = [], bgStars = [], fireflies = [];
let lanterns = [], birds = [], bgDecor = { trees: [], decorations: [] };
let megaStar = { x: 0, y: 0, vx: 0, vy: 0, alpha: 0, active: false };
let constellationStars = [];
let clockStars = [], heartCenter = { x: 0, y: 0 };

let score = 0, lives = 6;
const MAX_SCORE = 24; // Thêm biến cấu hình điểm tối đa
let timeLeft = 30, exactTimeLeft = 30;
let currentMilestone = 1; // Chương truyện sẽ phát

let running = false, over = false, isWinAnimation = false, winTime = 0;
let mx = 200, my = 400;
let chibiX = 200, chibiFace = 1, chibiEmotion = 'normal', emotionTimer = 0;
let catcherTrail = [];
let winStep = 1;
let lastT = 0, spawnT = 0, gameT = 0, raf;
let treeParticles = [];
let isTreeGenerated = false;

// --- BIẾN CHO TRỨNG MÀU (EASTER EGGS) ---
let isHeartMode = false, secretCode = "", infiniteLives = false, infiniteTime = false, floatingTexts = [];

// --- CẤU HÌNH ÂM THANH ---
const bgmSfx = new Audio('bgm.mp3'); bgmSfx.loop = true; bgmSfx.volume = 0.4;
const scoredSfx = new Audio('scored.mp3'); scoredSfx.volume = 0.5;
const missedSfx = new Audio('missed.mp3'); missedSfx.volume = 0.5;
const windSfx = new Audio('wind_shimmer.mp3'); windSfx.volume = 0.5;
const wooshSfx = new Audio('star_woosh.mp3'); wooshSfx.volume = 0.6;
const clickSfx = new Audio('click.mp3'); clickSfx.volume = 0.5;
let windPlay = false, wooshPlay = false;

// --- HÀM TIỆN ÍCH ---
function playClickSound() { clickSfx.currentTime = 0; clickSfx.play().catch(e => console.log(e)); }
function getGroundY(x) { return H - 40 + Math.sin(x * 0.008) * 12 + Math.cos(x * 0.003) * 8; }

const startBGM = () => { bgmSfx.play().catch(e => console.log(e)); document.removeEventListener('click', startBGM); document.removeEventListener('touchstart', startBGM); };
document.addEventListener('click', startBGM); document.addEventListener('touchstart', startBGM);