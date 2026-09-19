// ── Placeholder "screenshot" generator: used until ./IMGs/i1..i6.png exist ──
const POSES = {
  squat: { head: [50, 18], pts: [[50, 26], [38, 34], [62, 34], [32, 50], [68, 50], [30, 64], [70, 64], [42, 58], [58, 58], [38, 76], [62, 76], [36, 92], [64, 92]] },
  deadlift: { head: [44, 20], pts: [[46, 28], [34, 34], [58, 34], [28, 48], [64, 48], [26, 62], [66, 62], [42, 56], [56, 56], [40, 74], [58, 74], [40, 92], [58, 92]] },
  press: { head: [50, 24], pts: [[50, 32], [38, 38], [62, 38], [32, 26], [68, 26], [30, 14], [70, 14], [42, 60], [58, 60], [42, 76], [58, 76], [42, 92], [58, 92]] },
  curl: { head: [50, 18], pts: [[50, 26], [38, 33], [62, 33], [32, 48], [68, 48], [40, 38], [60, 38], [42, 58], [58, 58], [42, 76], [58, 76], [42, 92], [58, 92]] },
  plank: { head: [20, 46], pts: [[28, 50], [34, 46], [34, 54], [30, 62], [36, 62], [28, 70], [38, 70], [56, 54], [56, 58], [74, 58], [74, 62], [86, 66], [86, 70]] },
  lunge: { head: [48, 18], pts: [[48, 26], [36, 34], [60, 34], [30, 50], [66, 50], [28, 64], [68, 64], [42, 58], [56, 58], [34, 78], [64, 74], [32, 94], [70, 92]] }
};
const EDGES = [[0, 1], [0, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 8], [7, 8], [7, 9], [8, 10], [9, 11], [10, 12]];

const CARDS = [
  { key: 'squat', tag: 'SQUAT', cap: 'Knee & hip angle tracked through the full descent.', ok: true, metric: '92°', tilt: 'card-tilt-left' },
  { key: 'deadlift', tag: 'DEADLIFT', cap: 'Spine alignment flagged the moment the back rounds.', ok: false, metric: 'BACK', tilt: 'card-center' },
  { key: 'press', tag: 'OVERHEAD PRESS', cap: 'Wrist-over-elbow stacking checked at lockout.', ok: true, metric: '174°', tilt: 'card-tilt-right' },
  { key: 'curl', tag: 'BICEP CURL', cap: 'Elbow drift detection stops momentum cheating.', ok: true, metric: '48°', tilt: 'card-tilt-right' },
  { key: 'plank', tag: 'PLANK', cap: 'Hip sag measured against the shoulder–ankle line.', ok: false, metric: 'HIPS', tilt: 'card-center' },
  { key: 'lunge', tag: 'LUNGE', cap: 'Front-knee travel checked against toe position.', ok: true, metric: '89°', tilt: 'card-tilt-left' }
];

let svgUid = 0; // keeps SVG gradient/pattern ids unique on the page

function poseSVG(cfg) {
  const p = POSES[cfg.key];
  const id = `${cfg.key}-${svgUid++}`;
  const col = cfg.ok ? '#00d4ff' : '#f5a623';
  const lines = EDGES.map(([a, b]) => {
    const A = p.pts[a], B = p.pts[b];
    return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${col}" stroke-width="1.1" stroke-linecap="round" opacity="0.9"/>`;
  }).join('');
  const dots = p.pts.map(pt => `<circle cx="${pt[0]}" cy="${pt[1]}" r="1.5" fill="#fff" opacity="0.95"/>`).join('');
  const badge = cfg.ok
    ? `<rect x="4" y="4" width="30" height="8" fill="rgba(0,212,255,0.12)" stroke="rgba(0,212,255,0.5)" stroke-width="0.4"/>
       <text x="19" y="9.8" font-size="4.2" fill="#00d4ff" text-anchor="middle" font-family="Ubuntu,sans-serif" letter-spacing="0.5">GOOD FORM</text>`
    : `<rect x="4" y="4" width="34" height="8" fill="rgba(245,166,35,0.14)" stroke="rgba(245,166,35,0.6)" stroke-width="0.4"/>
       <text x="21" y="9.8" font-size="4.2" fill="#f5a623" text-anchor="middle" font-family="Ubuntu,sans-serif" letter-spacing="0.5">FIX POSTURE</text>`;

  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#151515"/><stop offset="100%" stop-color="#0b0b0b"/>
      </linearGradient>
      <pattern id="g-${id}" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M10 0 L0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.3"/>
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#bg-${id})"/>
    <rect width="100" height="100" fill="url(#g-${id})"/>
    <ellipse cx="50" cy="58" rx="34" ry="40" fill="${cfg.ok ? 'rgba(0,212,255,0.06)' : 'rgba(245,166,35,0.06)'}"/>
    ${lines}
    <circle cx="${p.head[0]}" cy="${p.head[1]}" r="6" fill="none" stroke="${col}" stroke-width="1.1"/>
    ${dots}
    ${badge}
    <text x="96" y="10" font-size="6" fill="#e8e8e8" text-anchor="end" font-family="Ubuntu,sans-serif">${cfg.metric}</text>
    <text x="4" y="96" font-size="3.6" fill="#555" font-family="Ubuntu,sans-serif" letter-spacing="0.6">33 LANDMARKS · 30 FPS</text>
  </svg>`;
}

document.getElementById('cardGrid').innerHTML = CARDS.map((c, i) => `
  <div class="img-card ${c.tilt} card-float-${i + 1}">
    <div class="card-inner">
      <div class="card-img-wrap">
        ${poseSVG(c)}
        <img src="./IMGs/i${i + 1}.png" alt="${c.tag.toLowerCase()} form analysis" loading="lazy" decoding="async">
        <div class="card-scan-line" style="animation-delay:${-i * 0.5}s"></div>
      </div>
      <div class="card-caption">
        <span>// ${c.tag}</span>
        <p>${c.cap}</p>
      </div>
    </div>
    <div class="card-corner tl"></div>
    <div class="card-corner tr"></div>
    <div class="card-corner bl"></div>
    <div class="card-corner br"></div>
  </div>`).join('');

// If a real screenshot is missing, drop it so the drawn placeholder shows through.
document.querySelectorAll('.card-img-wrap img').forEach(img => {
  const drop = () => img.remove();
  img.addEventListener('error', drop);
  if (img.complete && img.naturalWidth === 0) drop();
});

// Big placeholder feed in the demo panel
document.getElementById('mockFeed').innerHTML =
  poseSVG({ key: 'squat', ok: true, metric: '92°' }) +
  '<div class="card-scan-line"></div>';

// Animate the HUD so the demo panel feels live
let reps = 12, t = 0;
const cues = [
  'Depth reached — good rep',
  'Chest up, slight forward lean',
  'Knees tracking over toes',
  'Drive through the heels'
];
const hudTimer = setInterval(() => {
  t++;
  const angle = 92 + Math.round(Math.sin(t / 2) * 38);
  document.getElementById('angleVal').textContent = angle;
  if (t % 4 === 0) {
    reps++;
    document.getElementById('repCount').textContent = reps;
    document.getElementById('cueText').textContent = cues[reps % cues.length];
  }
}, 900);

// Swap in the real demo video as soon as videos/video.mp4 loads.
const demoVideo = document.getElementById('demoVideo');
const mockDemo = document.getElementById('mockDemo');
const useVideo = () => {
  demoVideo.hidden = false;
  mockDemo.hidden = true;
  clearInterval(hudTimer);
};
if (demoVideo.readyState >= 1) useVideo();
demoVideo.addEventListener('loadedmetadata', useVideo);
