/* global window */
// Mock data for the Arcade Quest prototype.
// Mirrors the real content shape: a "quiz" = one passage + its items.
// Fox = Grade 4 (orange), Olive = Grade 6 (purple).

// XP economy (tuned to the real content):
//  - Each quiz is worth up to 100 XP, scaled by your % correct on its auto-scored items.
//    (A writing-only quiz awards its 100 on completion, since those aren't auto-scored.)
//  - 12 quizzes => 1200 XP ceiling for BOTH kids, no matter how many questions each
//    quiz holds (Fox has 49 auto points, Olive 53 — normalizing per-quiz keeps it fair).
//  - Top rank "Reading Legend" = 1080 XP = 90% correct across all 12 quizzes.
const MODEL = {
  xpPerQuiz: 100,
  quizzes: 12,
  maxXp: 1200,        // 12 * 100, a perfect run
  legendXp: 1080,     // 90% across the board
  autoPoints: { fox: 49, olive: 53 },
};
// XP awarded for one quiz given fraction correct (0..1).
function quizXp(fractionCorrect) {
  return Math.round(Math.max(0, Math.min(1, fractionCorrect)) * MODEL.xpPerQuiz);
}

const RANKS = [
  { name: "Word Pup", min: 0 },
  { name: "Page Tracker", min: 250 },
  { name: "Story Scout", min: 500 },
  { name: "Chapter Champ", min: 800 },
  { name: "Reading Legend", min: 1080 },
];

function rankFor(xp) {
  let r = RANKS[0], next = RANKS[1] || null, idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].min) { r = RANKS[i]; idx = i; next = RANKS[i + 1] || null; }
  }
  return { rank: r, next, idx, level: idx + 1 };
}

const PLAYERS = {
  fox: {
    id: "fox", name: "Fox", grade: 4, klass: "player-fox",
    xp: 180, streak: 4,
    missions: [
      { n: 1,  title: "Why Do Leaves Change Color", genre: "Science", glyph: "🍂", status: "done", stars: 3 },
      { n: 2,  title: "The Mixed-Up Lunchbox",       genre: "Story",   glyph: "🥪", status: "done", stars: 2 },
      { n: 3,  title: "The Tryout",                  genre: "Story",   glyph: "⚽", status: "current", stars: 0 },
      { n: 4,  title: "The Bird That Never Stops",   genre: "Science", glyph: "🐦", status: "new", stars: 0 },
      { n: 5,  title: "How Bridges Stay Up",         genre: "Science", glyph: "🌉", status: "new", stars: 0 },
      { n: 6,  title: "The Lighthouse Keeper",       genre: "Story",   glyph: "🗼", status: "new", stars: 0 },
      { n: 7,  title: "Honeybees at Work",           genre: "Science", glyph: "🐝", status: "new", stars: 0 },
      { n: 8,  title: "The Snow Day Plan",           genre: "Story",   glyph: "❄️", status: "new", stars: 0 },
      { n: 9,  title: "Volcanoes Wake Up",           genre: "Science", glyph: "🌋", status: "new", stars: 0 },
      { n: 10, title: "The Lost Kite",               genre: "Story",   glyph: "🪁", status: "new", stars: 0 },
      { n: 11, title: "Sharks of the Deep",          genre: "Science", glyph: "🦈", status: "new", stars: 0 },
      { n: 12, title: "Grandpa's Garden",            genre: "Story",   glyph: "🌻", status: "new", stars: 0 },
    ],
  },
  olive: {
    id: "olive", name: "Olive", grade: 6, klass: "player-olive",
    xp: 560, streak: 9,
    missions: [
      { n: 1,  title: "The Inventor of the Web",     genre: "Science", glyph: "🕸️", status: "done", stars: 3 },
      { n: 2,  title: "A Letter from the Trail",     genre: "Story",   glyph: "✉️", status: "done", stars: 3 },
      { n: 3,  title: "Why the Ocean Glows",         genre: "Science", glyph: "🌊", status: "done", stars: 2 },
      { n: 4,  title: "The Last Day of Summer",      genre: "Story",   glyph: "🌅", status: "done", stars: 3 },
      { n: 5,  title: "Robots That Help Farmers",    genre: "Science", glyph: "🤖", status: "done", stars: 3 },
      { n: 6,  title: "The Clockmaker's Secret",     genre: "Story",   glyph: "⏰", status: "done", stars: 2 },
      { n: 7,  title: "Mars on a Budget",            genre: "Science", glyph: "🚀", status: "current", stars: 0 },
      { n: 8,  title: "The Debate Club",             genre: "Story",   glyph: "🎤", status: "new", stars: 0 },
      { n: 9,  title: "Glaciers on the Move",        genre: "Science", glyph: "🏔️", status: "new", stars: 0 },
      { n: 10, title: "The Mural Project",           genre: "Story",   glyph: "🎨", status: "new", stars: 0 },
      { n: 11, title: "Code in the Wild",            genre: "Science", glyph: "💻", status: "new", stars: 0 },
      { n: 12, title: "The Relay Race",              genre: "Story",   glyph: "🏃", status: "new", stars: 0 },
    ],
  },
};

const BADGES = [
  // reading / quest achievements
  { id: "first",   name: "First Paw",      icon: "🐾", desc: "Finish your first quiz",          tier: "bronze" },
  { id: "perfect", name: "Bullseye",       icon: "🎯", desc: "Get a perfect score",             tier: "gold" },
  { id: "streak3", name: "On a Roll",      icon: "🔥", desc: "Practice 3 days in a row",        tier: "silver" },
  { id: "streak7", name: "Week Streak",    icon: "📅", desc: "Practice 7 days in a row",        tier: "gold" },
  { id: "evidence",name: "Detective",      icon: "🔍", desc: "Ace an evidence question",        tier: "silver" },
  { id: "nomiss",  name: "Sharp Reader",   icon: "⚡", desc: "Finish with no skipped items",     tier: "silver" },
  { id: "ten",     name: "Ten Quests",     icon: "🏕️", desc: "Complete 10 quizzes",             tier: "gold" },
  { id: "legend",  name: "Reading Legend", icon: "👑", desc: "Reach the top rank",              tier: "gold" },
  // writing — word-count tiers (treat-themed)
  { id: "w50",     name: "Cookie Writer",  icon: "🍪", desc: "Write 50+ words in a response",   tier: "bronze" },
  { id: "w100",    name: "Big Bone",       icon: "🦴", desc: "Write 100+ words in a response",  tier: "silver" },
  { id: "w200",    name: "Steak Master",   icon: "🥩", desc: "Write 200+ words in a response",  tier: "gold" },
  // pet-themed fun (toys & treats)
  { id: "fetch",   name: "Fetch Champ",    icon: "🎾", desc: "Clear 5 science quizzes",         tier: "silver" },
  { id: "yarn",    name: "Yarn Master",    icon: "🧶", desc: "Clear 5 story quizzes",           tier: "silver" },
  { id: "fish",    name: "Big Catch",      icon: "🐟", desc: "Ace a multi-select question",     tier: "bronze" },
  { id: "mouse",   name: "Mouse Hunter",   icon: "🐭", desc: "Beat a timed quiz",               tier: "bronze" },
];

// Which badges each kid has earned (for the prototype).
const EARNED = {
  fox:   ["first", "streak3", "streak7", "evidence", "w50", "w100", "fish", "mouse"],
  olive: ["first", "perfect", "streak3", "streak7", "evidence", "nomiss", "w50", "w100", "w200", "fetch", "fish"],
};

// A tiny sober-runner sample (kept intentionally plain).
const SAMPLE_ITEM = {
  passageTitle: "The Tryout",
  paragraphs: [
    "Maya had practiced every evening for two weeks. When the day of the soccer tryout finally came, her stomach felt like it was full of butterflies.",
    "The coach blew the whistle. \"Show me what you've got,\" she said. Maya took a deep breath, remembered her practice, and ran onto the field.",
  ],
  stem: "What does the phrase \"full of butterflies\" most likely mean in paragraph 1?",
  options: [
    { id: "a", text: "Maya was hungry before the tryout." },
    { id: "b", text: "Maya felt nervous and excited." },
    { id: "c", text: "Maya saw butterflies on the field." },
    { id: "d", text: "Maya was too tired to play." },
  ],
};

window.QUEST = { RANKS, rankFor, MODEL, quizXp, PLAYERS, BADGES, EARNED, SAMPLE_ITEM };
