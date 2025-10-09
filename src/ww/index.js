const PARTICIPANTS = [
  { username: "ben_woolston", name: "Ben Woolston", icon: "🧠" },
  { username: "andre", name: "Andre", icon: "⚡" },
  { username: "anna_woolston", name: "Anna Woolston", icon: "🌸" },
  { username: "annette_mcgrath", name: "Annette McGrath", icon: "🎯" },
  { username: "con_woolston", name: "Con Woolston", icon: "🦭" },
  { username: "james_senanayake", name: "James Senanayake", icon: "🛰️" },
  { username: "jo_woolston", name: "Jo Woolston", icon: "🐔" },
  { username: "krista_woolston", name: "Krista Woolston", icon: "🌴" }
];

const DEFAULT_PASSWORD = "Password1";
const STORAGE_KEY = "wooly-walking-2025";
const CHALLENGE = {
  start: new Date("2025-10-06T00:00:00"),
  end: new Date("2025-12-21T23:59:59"),
  stealthStart: new Date("2025-12-07T00:00:00")
};

const loginForm = document.querySelector("#login-form");
const usernameField = document.querySelector("#username");
const passwordField = document.querySelector("#password");
const authError = document.querySelector("#auth-error");
const authPanel = document.querySelector("#auth-panel");
const dashboard = document.querySelector("#dashboard");
const dashboardTitle = document.querySelector("#dashboard-title");
const phaseIndicator = document.querySelector("#phase-indicator");
const daysLeft = document.querySelector("#days-left");
const personalTotal = document.querySelector("#personal-total");
const personalRank = document.querySelector("#personal-rank");
const personalBest = document.querySelector("#personal-best");
const personalBestDate = document.querySelector("#personal-best-date");
const personalStreak = document.querySelector("#personal-streak");
const personalBadge = document.querySelector("#personal-badge");
const personalBadgeNote = document.querySelector("#personal-badge-note");
const leaderboardBody = document.querySelector("#leaderboard-body");
const leaderboardCaption = document.querySelector("#leaderboard-caption");
const motivationCopy = document.querySelector("#motivation-copy");
const weeksContainer = document.querySelector("#weeks-container");
const collapseWeeksBtn = document.querySelector("#collapse-weeks");
const expandWeeksBtn = document.querySelector("#expand-weeks");
const stealthPill = document.querySelector("#stealth-pill");
const downloadBackupBtn = document.querySelector("#download-backup");
const importBackupInput = document.querySelector("#import-backup");
const passwordToggle = document.querySelector(".auth-form__toggle");

let appState = {
  activeUser: null,
  data: ensureInitialData()
};

const challengeDates = buildChallengeDates(CHALLENGE.start, CHALLENGE.end);
const weeks = chunkDatesByWeek(challengeDates);

// Prefill username if remembered
const lastUser = appState.data.meta.lastUser;
if (lastUser) {
  usernameField.value = lastUser;
}

usernameField.focus();

passwordToggle.addEventListener("click", () => {
  const current = passwordField.getAttribute("type");
  passwordField.setAttribute("type", current === "password" ? "text" : "password");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = usernameField.value.trim().toLowerCase();
  const password = passwordField.value;

  const participant = PARTICIPANTS.find((person) => person.username === username);
  if (!participant) {
    return showAuthError("Unknown username. Try again.");
  }

  if (password !== DEFAULT_PASSWORD) {
    return showAuthError("Incorrect password. Give it another go.");
  }

  clearAuthError();
  setActiveUser(username);
  appState.data.meta.lastUser = username;
  saveData(appState.data);
  renderDashboard();
});

collapseWeeksBtn.addEventListener("click", () => {
  document.querySelectorAll(".week-card").forEach((card) => {
    card.classList.remove("is-open");
  });
});

expandWeeksBtn.addEventListener("click", () => {
  document.querySelectorAll(".week-card").forEach((card) => {
    card.classList.add("is-open");
  });
});

downloadBackupBtn.addEventListener("click", () => {
  const payload = JSON.stringify(appState.data, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "wooly-walking-progress.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

importBackupInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !parsed.participants) {
      throw new Error("Invalid file");
    }
    syncImportedData(parsed);
    saveData(appState.data);
    renderDashboard();
    importBackupInput.value = "";
  } catch (error) {
    alert("Import failed. Please make sure you selected a valid backup file.");
  }
});

function ensureInitialData() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return normaliseData(parsed);
    } catch (error) {
      console.warn("Failed to parse stored data, resetting.");
    }
  }
  const empty = createEmptyDataShape();
  saveData(empty);
  return empty;
}

function normaliseData(raw) {
  const template = createEmptyDataShape();
  const output = {
    participants: {},
    meta: { lastUser: raw.meta?.lastUser ?? template.meta.lastUser }
  };

  PARTICIPANTS.forEach((person) => {
    const incoming = raw.participants?.[person.username];
    const base = template.participants[person.username];
    output.participants[person.username] = {
      dailySteps: { ...base.dailySteps, ...(incoming?.dailySteps || {}) },
      notes: incoming?.notes || base.notes
    };
  });

  return output;
}

function createEmptyDataShape() {
  const participants = {};
  PARTICIPANTS.forEach((person) => {
    const dailySteps = {};
    challengeDates.forEach((date) => {
      dailySteps[date.iso] = 0;
    });
    participants[person.username] = { dailySteps, notes: "" };
  });
  return { participants, meta: { lastUser: "" } };
}

function saveData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function setActiveUser(username) {
  appState.activeUser = username;
  authPanel.hidden = true;
  dashboard.hidden = false;
  dashboard.scrollIntoView({ behavior: "smooth" });
}

function renderDashboard() {
  if (!appState.activeUser) return;

  const participant = PARTICIPANTS.find((person) => person.username === appState.activeUser);
  dashboardTitle.textContent = `${participant.icon} ${participant.name}`;

  const now = new Date();
  const phase = resolvePhase(now);
  phaseIndicator.textContent = phase.label;
  daysLeft.textContent = String(Math.max(0, phase.daysRemaining));
  motivationCopy.textContent = phase.message;
  leaderboardCaption.textContent = phase.leaderboardCopy;
  stealthPill.hidden = !phase.stealth;

  renderMomentumCards();
  renderLeaderboard(phase);
  renderWeeks();
}

function renderMomentumCards() {
  const userData = appState.data.participants[appState.activeUser];
  const totals = computeTotals(userData.dailySteps);
  personalTotal.textContent = formatNumber(totals.totalSteps);
  personalBest.textContent = formatNumber(totals.bestDaySteps);
  personalBestDate.textContent = totals.bestDayLabel || "—";
  personalStreak.textContent = String(totals.currentStreak);

  const rank = computeRank(appState.activeUser);
  personalRank.textContent = `Ranked ${rank.position} of ${rank.total}`;

  const badge = resolveBadge(totals);
  personalBadge.textContent = badge.title;
  personalBadgeNote.textContent = badge.caption;
}

function renderLeaderboard(phase) {
  const everyone = PARTICIPANTS.map((person) => {
    const dailySteps = appState.data.participants[person.username].dailySteps;
    const totals = computeTotals(dailySteps);
    return {
      username: person.username,
      name: person.name,
      icon: person.icon,
      totalSteps: totals.totalSteps,
      weeklyAvg: totals.weeklyAverage,
      bestDay: totals.bestDaySteps
    };
  }).sort((a, b) => b.totalSteps - a.totalSteps);

  const maxSteps = everyone[0]?.totalSteps || 1;
  leaderboardBody.innerHTML = "";

  everyone.forEach((record, index) => {
    const row = document.createElement("tr");
    if (record.username === appState.activeUser) {
      row.classList.add("is-self");
    }

    const showTotals = !phase.stealth || record.username === appState.activeUser || phase.revealed;
    const totalCellContent = showTotals ? formatNumber(record.totalSteps) : "— hidden —";

    const paceValue = showTotals ? `${formatNumber(Math.round(record.weeklyAvg))} / wk` : "In stealth";
    const barPercent = Math.max(4, Math.round((record.totalSteps / maxSteps) * 100));

    row.innerHTML = `
      <td>#${index + 1}</td>
      <td>${record.icon} ${record.name}</td>
      <td>${totalCellContent}</td>
      <td><span class="leaderboard__pace"><span class="leaderboard__pace-bar"><span style="width:${barPercent}%"></span></span>${paceValue}</span></td>
    `;

    leaderboardBody.appendChild(row);
  });
}

function renderWeeks() {
  weeksContainer.innerHTML = "";
  const userData = appState.data.participants[appState.activeUser];
  const todayIso = dateToIso(new Date());

  weeks.forEach((week, index) => {
    const card = document.createElement("article");
    card.className = "week-card";
    if (index === 0) {
      card.classList.add("is-open");
    }

    const weekTotal = week.dates.reduce((sum, day) => sum + (userData.dailySteps[day.iso] || 0), 0);

    const header = document.createElement("div");
    header.className = "week-card__header";
    header.innerHTML = `
      <div>
        <h4>Week ${index + 1}</h4>
        <span>${week.label}</span>
      </div>
      <span class="week-card__total" data-week-total="${index}">${formatNumber(weekTotal)} steps</span>
    `;

    header.addEventListener("click", () => {
      card.classList.toggle("is-open");
    });

    const body = document.createElement("div");
    body.className = "week-card__body";

    const table = document.createElement("table");
    table.className = "week-card__days";
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Steps</th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr>
          <td>Week total</td>
          <td class="week-card__total" data-week-total-footer="${index}">${formatNumber(weekTotal)} steps</td>
        </tr>
      </tfoot>
    `;

    const tbody = table.querySelector("tbody");

    week.dates.forEach((day) => {
      const tr = document.createElement("tr");

      const label = document.createElement("td");
      label.className = "week-card__day-label";
      const isToday = day.iso === todayIso;
      if (isToday) {
        label.classList.add("is-today");
      }
      label.innerHTML = `<span>${day.short}</span>${day.long}`;

      const inputCell = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.inputMode = "numeric";
      input.value = userData.dailySteps[day.iso] || "";
      input.dataset.date = day.iso;
      input.dataset.weekIndex = String(index);

      input.addEventListener("change", (event) => {
        const raw = event.target.value;
        const parsed = Math.max(0, parseInt(raw, 10) || 0);
        event.target.value = parsed ? String(parsed) : "";
        userData.dailySteps[day.iso] = parsed;
        saveData(appState.data);
        updateWeekTotals(index);
        renderMomentumCards();
        renderLeaderboard(resolvePhase(new Date()));
      });

      inputCell.appendChild(input);
      tr.appendChild(label);
      tr.appendChild(inputCell);
      tbody.appendChild(tr);
    });

    body.appendChild(table);
    card.appendChild(header);
    card.appendChild(body);
    weeksContainer.appendChild(card);
  });
}

function updateWeekTotals(weekIndex) {
  const userData = appState.data.participants[appState.activeUser];
  const week = weeks[weekIndex];
  const total = week.dates.reduce((sum, day) => sum + (userData.dailySteps[day.iso] || 0), 0);
  const badge = document.querySelector(`[data-week-total="${weekIndex}"]`);
  const footer = document.querySelector(`[data-week-total-footer="${weekIndex}"]`);
  const label = `${formatNumber(total)} steps`;
  if (badge) badge.textContent = label;
  if (footer) footer.textContent = label;
}

function computeTotals(dailySteps) {
  let totalSteps = 0;
  let bestDaySteps = 0;
  let bestDayIso = "";
  let currentStreak = 0;
  let streak = 0;

  const today = new Date();
  const todayIso = dateToIso(today);

  const days = challengeDates.map((day) => ({ ...day, steps: dailySteps[day.iso] || 0 }));

  days.forEach((day) => {
    totalSteps += day.steps;
    if (day.steps > bestDaySteps) {
      bestDaySteps = day.steps;
      bestDayIso = day.iso;
    }
  });

  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i];
    if (day.steps > 0) {
      streak += 1;
      currentStreak = streak;
    } else {
      if (dateIsAfterIso(todayIso, day.iso)) {
        break;
      }
      streak = 0;
    }
  }

  const completedDays = days.filter((day) => dateIsAfterIso(todayIso, day.iso) || day.iso === todayIso).length;
  const weeksElapsed = Math.max(1, completedDays / 7);

  return {
    totalSteps,
    bestDaySteps,
    bestDayLabel: bestDayIso ? readableDate(bestDayIso) : "",
    currentStreak,
    weeklyAverage: totalSteps / weeksElapsed
  };
}

function computeRank(username) {
  const everyone = PARTICIPANTS.map((person) => {
    const totals = computeTotals(appState.data.participants[person.username].dailySteps);
    return { username: person.username, total: totals.totalSteps };
  }).sort((a, b) => b.total - a.total);

  const position = Math.max(1, everyone.findIndex((entry) => entry.username === username) + 1);
  return { position, total: everyone.length };
}

function resolveBadge(totals) {
  if (totals.totalSteps >= 420000) {
    return { title: "Crown Chaser", caption: "Walking royalty in the making." };
  }
  if (totals.currentStreak >= 14) {
    return { title: "Consistency Beast", caption: "14+ day streak — unstoppable." };
  }
  if (totals.bestDaySteps >= 25000) {
    return { title: "Power Surge", caption: "One monster day above 25k." };
  }
  if (totals.totalSteps >= 210000) {
    return { title: "Halfway Hero", caption: "You passed the halfway mark." };
  }
  if (totals.bestDaySteps >= 15000) {
    return { title: "Sprinter", caption: "Huge daily burst logged." };
  }
  if (totals.totalSteps >= 70000) {
    return { title: "On the Board", caption: "Seven days of 10k pace." };
  }
  return { title: "Keep marching", caption: "Log steps to unlock your first badge." };
}

function resolvePhase(now) {
  const beforeStart = now < CHALLENGE.start;
  const afterEnd = now > CHALLENGE.end;
  const inStealth = now >= CHALLENGE.stealthStart && now <= CHALLENGE.end;

  if (beforeStart) {
    const days = Math.ceil((CHALLENGE.start - now) / (1000 * 60 * 60 * 24));
    return {
      label: "Warm-up",
      message: "Prep those calves. Countdown to the starting gun.",
      leaderboardCopy: "Warm-up period. Totals will appear once the challenge kicks off.",
      daysRemaining: Math.max(days, 0),
      stealth: false,
      revealed: false
    };
  }

  if (afterEnd) {
    return {
      label: "Grand reveal",
      message: "Time to crown the champion and grill the bottom two chefs.",
      leaderboardCopy: "Final results unlocked. Congratulate (or heckle) accordingly.",
      daysRemaining: 0,
      stealth: false,
      revealed: true
    };
  }

  if (inStealth) {
    const days = Math.ceil((CHALLENGE.end - now) / (1000 * 60 * 60 * 24));
    return {
      label: "Stealth mode",
      message: "Totals are hidden. Keep logging and keep them guessing.",
      leaderboardCopy: "Stealth mode active — only your own totals are visible.",
      daysRemaining: Math.max(days, 0),
      stealth: true,
      revealed: false
    };
  }

  const days = Math.ceil((CHALLENGE.end - now) / (1000 * 60 * 60 * 24));
  return {
    label: "Active battle",
    message: "Clock those steps weekly. Top spot is there for the taking.",
    leaderboardCopy: "Live totals update whenever someone logs their steps.",
    daysRemaining: Math.max(days, 0),
    stealth: false,
    revealed: false
  };
}

function buildChallengeDates(start, end) {
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = dateToIso(cursor);
    dates.push({
      iso,
      label: readableDate(iso),
      short: cursor.toLocaleDateString(undefined, { weekday: "short" }),
      long: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function chunkDatesByWeek(dates) {
  const chunks = [];
  for (let i = 0; i < dates.length; i += 7) {
    const slice = dates.slice(i, i + 7);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const label = `${first.long} – ${last.long}`;
    chunks.push({ dates: slice, label });
  }
  return chunks;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function dateToIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readableDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function dateIsAfterIso(referenceIso, targetIso) {
  return referenceIso > targetIso;
}

function showAuthError(message) {
  authError.textContent = message;
}

function clearAuthError() {
  authError.textContent = "";
}

function syncImportedData(parsed) {
  const normalised = normaliseData(parsed);
  appState.data = normalised;
  if (appState.activeUser && !appState.data.participants[appState.activeUser]) {
    appState.activeUser = null;
    dashboard.hidden = true;
    authPanel.hidden = false;
  }
}

// Auto-render if a remembered user exists and the password form was bypassed earlier.
if (lastUser && PARTICIPANTS.some((person) => person.username === lastUser)) {
  setActiveUser(lastUser);
  renderDashboard();
}
