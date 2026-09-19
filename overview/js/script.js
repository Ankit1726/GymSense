/* GymSense landing page
   1. Draws skeleton figures (gallery fallbacks + video fallback)
   2. Runs the live squat demo in the hero
   3. Handles missing images / video gracefully */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const make = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  };

  /* ---------- Skeleton renderer ---------- */

  const BONES = [
    ["head", "neck"],
    ["neck", "shoulder"],
    ["shoulder", "hip"],
    ["shoulder", "elbow"],
    ["elbow", "wrist"],
    ["hip", "knee"],
    ["knee", "ankle"],
    ["ankle", "toe"],
  ];

  function createSkeleton(svg, { bones = BONES, ground = 347, dy = 0 } = {}) {
    svg.setAttribute("viewBox", "0 0 300 360");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const g = make("g", dy ? { transform: `translate(0 ${dy})` } : {});
    g.appendChild(make("line", { class: "sk-ground", x1: 30, x2: 270, y1: ground, y2: ground }));

    const boneEls = bones.map(([a, b]) => {
      const line = make("line", { class: "sk-bone" });
      g.appendChild(line);
      return { a, b, line, key: `${a}-${b}` };
    });

    const jointNames = [...new Set(bones.flat())].filter((n) => n !== "head");
    const joints = {};
    jointNames.forEach((n) => {
      joints[n] = make("circle", { class: "sk-joint", r: 4.5 });
      g.appendChild(joints[n]);
    });

    const head = make("circle", { class: "sk-head", r: 13 });
    g.appendChild(head);
    svg.appendChild(g);

    return function update(pts, { base = "var(--text)", flag = [] } = {}) {
      const flagged = new Set();
      boneEls.forEach(({ a, b, line, key }) => {
        const p = pts[a];
        const q = pts[b];
        line.setAttribute("x1", p[0]);
        line.setAttribute("y1", p[1]);
        line.setAttribute("x2", q[0]);
        line.setAttribute("y2", q[1]);
        const isFlagged = flag.includes(key);
        line.style.stroke = isFlagged ? "var(--coral)" : base;
        if (isFlagged) {
          flagged.add(a);
          flagged.add(b);
        }
      });
      jointNames.forEach((n) => {
        joints[n].setAttribute("cx", pts[n][0]);
        joints[n].setAttribute("cy", pts[n][1]);
        joints[n].style.fill = flagged.has(n) ? "var(--coral)" : base;
      });
      head.setAttribute("cx", pts.head[0]);
      head.setAttribute("cy", pts.head[1]);
      head.style.stroke = base;
    };
  }

  /* ---------- Poses (viewBox 300 x 360) ---------- */

  const STAND = {
    head: [150, 58], neck: [150, 88], shoulder: [150, 96],
    elbow: [170, 132], wrist: [204, 126],
    hip: [150, 190], knee: [150, 270], ankle: [150, 340], toe: [178, 345],
  };
  const SQUAT = {
    head: [182, 166], neck: [174, 191], shoulder: [170, 203],
    elbow: [198, 222], wrist: [230, 212],
    hip: [108, 285], knee: [185, 279], ankle: [150, 340], toe: [178, 345],
  };

  const POSES = {
    squat: { points: SQUAT },
    deadlift: {
      points: {
        head: [219, 155], neck: [204, 167], shoulder: [195, 173],
        elbow: [198, 232], wrist: [196, 290],
        hip: [105, 215], knee: [152, 262], ankle: [140, 340], toe: [166, 345],
      },
    },
    press: {
      points: {
        head: [150, 72], neck: [150, 98], shoulder: [150, 106],
        elbow: [172, 62], wrist: [158, 20],
        hip: [150, 200], knee: [150, 272], ankle: [150, 340], toe: [172, 345],
      },
    },
    pushup: {
      ground: 292,
      dy: -40,
      points: {
        head: [58, 241], neck: [76, 238], shoulder: [86, 240],
        elbow: [86, 266], wrist: [86, 290],
        hip: [152, 252], knee: [202, 264], ankle: [250, 276], toe: [262, 288],
      },
    },
    lunge: {
      bones: [
        ...BONES,
        ["hip", "bknee"],
        ["bknee", "bankle"],
        ["bankle", "btoe"],
      ],
      points: {
        head: [150, 62], neck: [150, 90], shoulder: [150, 98],
        elbow: [172, 150], wrist: [154, 204],
        hip: [150, 215], knee: [208, 262], ankle: [206, 340], toe: [232, 345],
        bknee: [118, 290], bankle: [70, 330], btoe: [94, 345],
      },
    },
    curl: {
      points: {
        head: [150, 72], neck: [150, 98], shoulder: [150, 106],
        elbow: [152, 160], wrist: [194, 132],
        hip: [150, 200], knee: [150, 272], ankle: [150, 340], toe: [172, 345],
      },
    },
  };

  /* ---------- Gallery + video fallback art ---------- */

  document.querySelectorAll("svg.pose-art").forEach((svg) => {
    const pose = POSES[svg.dataset.pose];
    if (!pose) return;
    const flag = svg.dataset.flag ? svg.dataset.flag.split(",") : [];
    const draw = createSkeleton(svg, {
      bones: pose.bones,
      ground: pose.ground,
      dy: pose.dy,
    });
    draw(pose.points, { base: "var(--mint)", flag });
  });

  // Remove broken screenshots so the drawn skeleton shows through.
  document.querySelectorAll(".shot-media img").forEach((img) => {
    const drop = () => img.remove();
    img.addEventListener("error", drop);
    if (img.complete && img.naturalWidth === 0) drop();
  });

  /* ---------- Demo video fallback ---------- */

  const video = document.querySelector(".video-frame video");
  const fallback = document.querySelector(".video-fallback");
  if (video && fallback) {
    const showFallback = () => {
      video.hidden = true;
      fallback.hidden = false;
    };
    const source = video.querySelector("source");
    if (source) source.addEventListener("error", showFallback);
    video.addEventListener("error", showFallback);

    // The error can fire before this script runs, so also check the state.
    const check = () => {
      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        showFallback();
      }
    };
    check();
    window.addEventListener("load", check);
    setTimeout(check, 1500);
  }

  /* ---------- Hero: live squat analysis ---------- */

  const svg = document.getElementById("coach-svg");
  if (!svg) return;

  const repEl = document.getElementById("rep-count");
  const cueEl = document.getElementById("cue");
  const cueTitle = document.getElementById("cue-title");
  const cueText = document.getElementById("cue-text");

  const draw = createSkeleton(svg);
  const label = make("text", { class: "sk-label" });
  svg.appendChild(label);

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const angleAt = (a, b, c) => {
    const v1 = [a[0] - b[0], a[1] - b[1]];
    const v2 = [c[0] - b[0], c[1] - b[1]];
    const cos =
      (v1[0] * v2[0] + v1[1] * v2[1]) /
      (Math.hypot(...v1) * Math.hypot(...v2));
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  };

  const CYCLE = 4200; // one rep, in ms
  const REPS_PER_SET = 6;
  let last = { state: "", title: "", text: "", count: -1, angle: -1 };

  function render(elapsed) {
    const rep = Math.floor(elapsed / CYCLE);
    const p = (elapsed % CYCLE) / CYCLE;
    const deep = rep % 2 === 1; // rep 1 is shallow, rep 2 is good, and so on
    const maxDepth = deep ? 1 : 0.58;

    let d = 0;
    if (p < 0.1) d = 0;
    else if (p < 0.45) d = ease((p - 0.1) / 0.35) * maxDepth;
    else if (p < 0.55) d = maxDepth;
    else if (p < 0.9) d = (1 - ease((p - 0.55) / 0.35)) * maxDepth;

    const pts = {};
    for (const k in STAND) {
      pts[k] = [lerp(STAND[k][0], SQUAT[k][0], d), lerp(STAND[k][1], SQUAT[k][1], d)];
    }

    const n = (rep % REPS_PER_SET) + (p >= 0.9 ? 1 : 0);
    let state = "track";
    let title = "Ready";
    let text = "Stand tall to begin the next rep.";

    if (p >= 0.1 && p < 0.35) {
      title = "Tracking";
      text = "Lower with control.";
    } else if (p >= 0.35 && p < 0.9) {
      state = deep ? "ok" : "bad";
      title = deep ? "Good depth" : "Go lower";
      text = deep
        ? "Hips are below your knees. Drive up."
        : "Hips stayed above your knees. Aim for parallel.";
    } else if (p >= 0.9) {
      state = deep ? "ok" : "bad";
      title = deep ? `Rep ${n} looks good` : `Rep ${n} was shallow`;
      text = deep ? "Reset and go again." : "Next one, sit a little deeper.";
    }

    const base = state === "ok" ? "var(--mint)" : "var(--text)";
    draw(pts, { base, flag: state === "bad" ? ["hip-knee"] : [] });

    const angle = Math.round(angleAt(pts.hip, pts.knee, pts.ankle));
    if (angle !== last.angle) {
      label.textContent = `${angle}\u00B0`;
      label.setAttribute("x", pts.knee[0] + 12);
      label.setAttribute("y", pts.knee[1] - 10);
      last.angle = angle;
    } else {
      label.setAttribute("x", pts.knee[0] + 12);
      label.setAttribute("y", pts.knee[1] - 10);
    }
    label.style.fill =
      state === "bad" ? "var(--coral)" : state === "ok" ? "var(--mint)" : "var(--muted)";

    if (state !== last.state) {
      cueEl.dataset.state = state;
      last.state = state;
    }
    if (title !== last.title) {
      cueTitle.textContent = title;
      last.title = title;
    }
    if (text !== last.text) {
      cueText.textContent = text;
      last.text = text;
    }
    if (n !== last.count) {
      repEl.textContent = n;
      last.count = n;
    }
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    render(CYCLE * 1.95); // a single still frame: rep 2, good depth
    return;
  }

  let elapsed = 0;
  let lastTs = null;
  let raf = 0;

  function frame(ts) {
    if (lastTs !== null) elapsed += Math.min(ts - lastTs, 100);
    lastTs = ts;
    render(elapsed);
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (raf) return;
    lastTs = null;
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  render(0);

  // Only animate while the panel is on screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? play() : pause())),
      { threshold: 0.1 }
    ).observe(svg);
  } else {
    play();
  }
})();
