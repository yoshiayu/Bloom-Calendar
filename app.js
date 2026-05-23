const STORAGE_KEY = "bloom-calendar-state-v1";

const DEFAULT_CATEGORIES = [
  ["仕事", "#7cc6fe", "briefcase", "業務全般", 1],
  ["授業", "#91d7a8", "book", "授業・講義", 2],
  ["ミーティング", "#ffbc7d", "users", "打ち合わせ", 3],
  ["個人予定", "#f6a6c1", "heart", "プライベート", 4],
  ["移動", "#c9b6ff", "car", "移動時間", 5],
  ["締切", "#ff8d8d", "flag", "締切・納期", 6],
  ["学習", "#9ddf92", "graduation-cap", "勉強", 7],
  ["休憩", "#8edfd9", "coffee", "休憩", 8],
  ["重要", "#ffd66b", "star", "重要予定", 9],
  ["その他", "#c8d3df", "circle", "その他", 10],
];

const state = {
  view: "month",
  currentDate: startOfDay(new Date()),
  searchText: "",
  importantOnly: false,
  selectedCategoryIds: [],
  rewardMode: "hourly",
  rewardRate: 4500,
  categories: [],
  events: [],
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  loadState();
  applyViewQueryOverride();
  document.body.classList.toggle("desktop-app", Boolean(window.desktopBridge));
  bindEvents();
  seedDemoEvents();
  renderAll();
  updateClock();
  setInterval(updateClock, 1000);
});

function cacheElements() {
  [
    "currentDateLabel",
    "currentTimeLabel",
    "currentStatusLabel",
    "rewardModeSelect",
    "rewardRateInput",
    "rewardRateLabel",
    "rewardAmountLabel",
    "rewardFormulaLabel",
    "todayEventsList",
    "nextEventCard",
    "categoryFilterList",
    "searchInput",
    "importantOnlyToggle",
    "currentRangeLabel",
    "monthView",
    "weekView",
    "dayView",
    "yearView",
    "eventModal",
    "eventForm",
    "eventId",
    "eventTemplateSelect",
    "eventTitle",
    "eventStart",
    "eventEnd",
    "eventTimeTemplateSelect",
    "eventAllDay",
    "eventCategory",
    "eventPriority",
    "eventLocation",
    "eventReminder",
    "eventRepeat",
    "eventCompleted",
    "eventMeetingUrl",
    "eventDescription",
    "deleteEventButton",
    "eventModalTitle",
    "detailsModal",
    "eventDetailsContent",
    "categoryModal",
    "categoryList",
    "categoryForm",
    "categoryId",
    "categoryName",
    "categoryColor",
    "categoryIcon",
    "categorySortOrder",
    "categoryDescription",
    "deleteCategoryButton",
    "eventTitleSuggestions",
    "eventLocationSuggestions",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.getElementById("prevButton").addEventListener("click", () => shiftRange(-1));
  document.getElementById("nextButton").addEventListener("click", () => shiftRange(1));
  document.getElementById("todayButton").addEventListener("click", () => {
    state.currentDate = startOfDay(new Date());
    renderAll();
  });
  document.getElementById("newEventButton").addEventListener("click", () => openEventModal());
  document.getElementById("addTodayEventButton").addEventListener("click", () =>
    openEventModal({ date: new Date() })
  );
  document.getElementById("openCategoryManagerButton").addEventListener("click", () => {
    renderCategoryManager();
    openModal("categoryModal");
  });
  document.getElementById("newCategoryButton").addEventListener("click", resetCategoryForm);
  document.getElementById("exportButton").addEventListener("click", exportBackup);

  document.querySelectorAll(".view-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      renderAll();
    });
  });

  els.searchInput.addEventListener("input", (event) => {
    state.searchText = event.target.value.trim().toLowerCase();
    renderAll();
  });

  els.rewardModeSelect.addEventListener("change", (event) => {
    state.rewardMode = event.target.value;
    if (state.rewardMode === "hourly" && !state.rewardRate) state.rewardRate = 4500;
    if (state.rewardMode === "daily" && !state.rewardRate) state.rewardRate = 30000;
    if (state.rewardMode === "project" && !state.rewardRate) state.rewardRate = 100000;
    renderAll();
  });

  els.rewardRateInput.addEventListener("input", (event) => {
    state.rewardRate = Number(event.target.value || 0);
    renderRewardPanel();
    persistState();
  });

  els.importantOnlyToggle.addEventListener("change", (event) => {
    state.importantOnly = event.target.checked;
    renderAll();
  });

  els.eventForm.addEventListener("submit", handleEventSubmit);
  els.eventTemplateSelect.addEventListener("change", handleEventTemplateSelect);
  els.eventTimeTemplateSelect.addEventListener("change", handleEventTimeTemplateSelect);
  els.deleteEventButton.addEventListener("click", handleEventDelete);
  els.categoryForm.addEventListener("submit", handleCategorySubmit);
  els.deleteCategoryButton.addEventListener("click", handleCategoryDelete);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });

  document.addEventListener("click", (event) => {
    const modal = event.target.closest(".modal");
    if (modal && event.target === modal) {
      closeModal(modal.id);
    }
  });
}

function seedDemoEvents() {
  if (state.events.length > 0) return;
  const today = startOfDay(new Date());
  const categories = indexCategories();
  const demo = [
    {
      title: "朝会",
      startAt: setTime(today, 9, 0),
      endAt: setTime(today, 9, 30),
      categoryId: findCategoryIdByName("ミーティング", categories),
      location: "オンライン",
      meetingUrl: "https://meet.google.com/demo-demo-demo",
      description: "チームの進捗確認",
      priority: 4,
    },
    {
      title: "企画資料作成",
      startAt: setTime(today, 10, 0),
      endAt: setTime(today, 12, 0),
      categoryId: findCategoryIdByName("仕事", categories),
      location: "オフィス",
      description: "来週分の提案資料をまとめる",
      priority: 3,
    },
    {
      title: "締切チェック",
      startAt: setTime(addDays(today, 2), 16, 0),
      endAt: setTime(addDays(today, 2), 17, 0),
      categoryId: findCategoryIdByName("締切", categories),
      location: "",
      description: "提出前の確認",
      priority: 5,
    },
  ];
  demo.forEach((item) =>
    state.events.push(createEventRecord({ ...item, isAllDay: false, reminderMinutes: 10, repeat: "none" }))
  );
  persistState();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.categories = DEFAULT_CATEGORIES.map((item) => createCategoryRecord(...item));
      persistState();
      return;
    }
    const saved = JSON.parse(raw);
    state.categories = saved.categories || DEFAULT_CATEGORIES.map((item) => createCategoryRecord(...item));
    state.events = saved.events || [];
    state.view = saved.view || "month";
    state.currentDate = saved.currentDate ? new Date(saved.currentDate) : startOfDay(new Date());
    state.rewardMode = saved.rewardMode || "hourly";
    state.rewardRate = Number(saved.rewardRate ?? 4500);
  } catch (_error) {
    state.categories = DEFAULT_CATEGORIES.map((item) => createCategoryRecord(...item));
    state.events = [];
  }
}

function applyViewQueryOverride() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (["day", "week", "month", "year"].includes(view)) {
    state.view = view;
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      categories: state.categories,
      events: state.events,
      view: state.view,
      currentDate: state.currentDate.toISOString(),
      rewardMode: state.rewardMode,
      rewardRate: state.rewardRate,
    })
  );
}

function renderAll() {
  document.querySelectorAll(".view-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  renderFilters();
  renderTitleSuggestions();
  renderLocationSuggestions();
  renderEventTemplates();
  renderTimeTemplates();
  renderRangeLabel();
  renderMonthView();
  renderWeekView();
  renderDayView();
  renderYearView();
  renderTodayPanel();
  renderRewardPanel();
  persistState();
}

function renderTitleSuggestions() {
  const titles = [...new Set(state.events.map((event) => event.title.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  els.eventTitleSuggestions.innerHTML = titles
    .map((title) => `<option value="${escapeHtml(title)}"></option>`)
    .join("");
}

function renderLocationSuggestions() {
  const locations = [...new Set(state.events.map((event) => (event.location || "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "ja")
  );
  els.eventLocationSuggestions.innerHTML = locations
    .map((location) => `<option value="${escapeHtml(location)}"></option>`)
    .join("");
}

function renderEventTemplates() {
  const options = sortedEvents(state.events)
    .slice()
    .reverse()
    .map((event) => {
      const category = getCategory(event.categoryId);
      const label = `${event.title} | ${formatShortDate(new Date(event.startAt))} ${formatEventTime(event)} | ${category.name}`;
      return `<option value="${event.id}">${escapeHtml(label)}</option>`;
    })
    .join("");
  els.eventTemplateSelect.innerHTML = `<option value="">選択してください</option>${options}`;
}

function renderTimeTemplates() {
  const seen = new Set();
  const options = sortedEvents(state.events)
    .filter((event) => !event.isAllDay)
    .map((event) => {
      const start = new Date(event.startAt);
      const end = new Date(event.endAt);
      const key = `${start.getHours()}:${start.getMinutes()}-${end.getHours()}:${end.getMinutes()}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const label = `${formatTime(start)} - ${formatTime(end)}`;
      return `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`;
    })
    .filter(Boolean)
    .join("");
  els.eventTimeTemplateSelect.innerHTML = `<option value="">選択してください</option>${options}`;
}

function renderFilters() {
  els.searchInput.value = state.searchText;
  els.importantOnlyToggle.checked = state.importantOnly;
  els.categoryFilterList.innerHTML = "";
  sortedCategories().forEach((category) => {
    const button = document.createElement("button");
    button.className = `chip ${state.selectedCategoryIds.includes(category.id) ? "active" : ""}`;
    button.textContent = category.name;
    button.addEventListener("click", () => {
      if (state.selectedCategoryIds.includes(category.id)) {
        state.selectedCategoryIds = state.selectedCategoryIds.filter((id) => id !== category.id);
      } else {
        state.selectedCategoryIds.push(category.id);
      }
      renderAll();
    });
    els.categoryFilterList.appendChild(button);
  });
}

function renderRangeLabel() {
  const date = state.currentDate;
  let label = "";
  if (state.view === "month") {
    label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
  } else if (state.view === "week") {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    label = `${formatShortDate(start)} - ${formatShortDate(end)}`;
  } else if (state.view === "day") {
    label = formatLongDate(date);
  } else {
    label = `${date.getFullYear()}年`;
  }
  els.currentRangeLabel.textContent = label;

  ["monthView", "weekView", "dayView", "yearView"].forEach((id) => {
    els[id].classList.toggle("hidden", id !== `${state.view}View`);
  });
}

function renderMonthView() {
  const start = startOfCalendarMonth(state.currentDate);
  const days = [...Array(42)].map((_, index) => addDays(start, index));
  const wrapper = document.createElement("div");
  wrapper.className = "calendar-grid";

  ["日", "月", "火", "水", "木", "金", "土"].forEach((weekday) => {
    const header = document.createElement("div");
    header.className = "weekday-header";
    header.textContent = weekday;
    if (weekday === "日") header.classList.add("is-sunday");
    if (weekday === "土") header.classList.add("is-saturday");
    wrapper.appendChild(header);
  });

  days.forEach((date) => {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    applyCalendarTone(cell, date);
    if (date.getMonth() !== state.currentDate.getMonth()) cell.classList.add("other-month");
    if (isSameDay(date, new Date())) cell.classList.add("today");
    cell.addEventListener("click", () => openEventModal({ date }));

    const head = document.createElement("div");
    head.className = "day-cell-head";
    head.innerHTML = `<span class="day-number">${date.getDate()}</span>`;
    const quickAdd = document.createElement("button");
    quickAdd.className = "ghost-button day-add-button";
    quickAdd.textContent = formatWorkloadLabel(getDailyMinutes(date));
    quickAdd.addEventListener("click", () => openEventModal({ date }));
    head.appendChild(quickAdd);
    cell.appendChild(head);

    const events = filteredEvents().filter((event) => occursOnDate(event, date)).slice(0, 3);
    events.forEach((event) => cell.appendChild(createEventPill(event)));

    const total = filteredEvents().filter((event) => occursOnDate(event, date)).length;
    if (total > 3) {
      const more = document.createElement("div");
      more.className = "more-link";
      more.textContent = `+${total - 3}件`;
      cell.appendChild(more);
    }
    wrapper.appendChild(cell);
  });

  els.monthView.innerHTML = "";
  const metrics = document.createElement("div");
  metrics.className = "metric-grid";
  metrics.innerHTML = `
    <div class="metric-card"><p>月の予定数</p><strong>${filteredEventsForMonth().length}</strong></div>
    <div class="metric-card"><p>重要予定</p><strong>${filteredEventsForMonth().filter((event) => event.priority >= 4).length}</strong></div>
    <div class="metric-card"><p>作業時間</p><strong>${Math.round(totalMonthMinutes() / 60)}h</strong></div>
  `;
  els.monthView.append(metrics, wrapper);
}

function renderWeekView() {
  const weekStart = startOfWeek(state.currentDate);
  els.weekView.innerHTML = "";

  const shell = document.createElement("div");
  shell.className = "timeline-shell";

  const header = document.createElement("div");
  header.className = "timeline-header";
  const spacer = document.createElement("div");
  spacer.className = "timeline-spacer";
  header.appendChild(spacer);

  const head = document.createElement("div");
  head.className = "timeline-days";
  ["日", "月", "火", "水", "木", "金", "土"].forEach((weekday, index) => {
    const day = addDays(weekStart, index);
    const item = document.createElement("div");
    item.className = "timeline-day-head";
    item.textContent = `${weekday} ${day.getDate()}`;
    applyCalendarTone(item, day);
    head.appendChild(item);
  });
  header.appendChild(head);
  shell.appendChild(header);

  const body = document.createElement("div");
  body.className = "timeline-body";
  const axis = document.createElement("div");
  axis.className = "time-axis";
  for (let hour = 0; hour < 24; hour += 1) {
    const label = document.createElement("div");
    label.className = "hour-label";
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    axis.appendChild(label);
  }

  const stage = document.createElement("div");
  stage.className = "timeline-stage";
  const columns = document.createElement("div");
  columns.className = "timeline-columns";
  for (let i = 0; i < 7; i += 1) {
    const column = document.createElement("div");
    column.className = "timeline-column";
    applyCalendarTone(column, addDays(weekStart, i));
    column.addEventListener("click", (event) => {
      if (event.target !== column) return;
      const rect = column.getBoundingClientRect();
      const minutes = Math.floor(((event.clientY - rect.top) / rect.height) * 24 * 60 / 30) * 30;
      const date = addDays(weekStart, i);
      openEventModal({ date, minutes });
    });
    columns.appendChild(column);
  }
  stage.appendChild(columns);
  body.append(axis, stage);
  shell.appendChild(body);
  els.weekView.appendChild(shell);

  filteredEvents().forEach((event) => {
    for (let i = 0; i < 7; i += 1) {
      const date = addDays(weekStart, i);
      if (!occursOnDate(event, date)) continue;
      columns.children[i].appendChild(createTimeEvent(event));
    }
  });
  drawCurrentTimeLine(columns, weekStart, "week");
}

function renderDayView() {
  els.dayView.innerHTML = "";
  const metrics = document.createElement("div");
  const events = filteredEvents().filter((event) => occursOnDate(event, state.currentDate));
  const free = calculateFreeSlots(state.currentDate, events);
  metrics.className = "metric-grid";
  metrics.innerHTML = `
    <div class="metric-card"><p>今日の予定</p><strong>${events.length}</strong></div>
    <div class="metric-card"><p>空き時間</p><strong>${Math.round(totalFreeMinutes(free) / 60)}h</strong></div>
    <div class="metric-card"><p>完了率</p><strong>${events.length ? Math.round((events.filter((item) => item.isCompleted).length / events.length) * 100) : 0}%</strong></div>
  `;

  const shell = document.createElement("div");
  shell.className = "timeline-shell";
  const header = document.createElement("div");
  header.className = "timeline-header";
  header.innerHTML = `<div class="timeline-spacer"></div><div class="timeline-days"><div class="timeline-day-head">${formatLongDate(
    state.currentDate
  )}</div></div>`;
  applyCalendarTone(header.querySelector(".timeline-day-head"), state.currentDate);
  const body = document.createElement("div");
  body.className = "timeline-body";
  const axis = document.createElement("div");
  axis.className = "time-axis";
  for (let hour = 0; hour < 24; hour += 1) {
    const label = document.createElement("div");
    label.className = "hour-label";
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    axis.appendChild(label);
  }

  const stage = document.createElement("div");
  stage.className = "timeline-stage";
  const column = document.createElement("div");
  column.className = "timeline-column";
  column.style.minHeight = "1344px";
  column.addEventListener("click", (event) => {
    if (event.target !== column) return;
    const rect = column.getBoundingClientRect();
    const minutes = Math.floor(((event.clientY - rect.top) / rect.height) * 24 * 60 / 30) * 30;
    openEventModal({ date: state.currentDate, minutes });
  });
  stage.appendChild(column);
  body.append(axis, stage);
  shell.append(header, body);

  events.forEach((event) => column.appendChild(createTimeEvent(event)));
  drawCurrentTimeLine({ children: [column] }, state.currentDate, "day");

  const freeList = document.createElement("div");
  freeList.className = "stack-list";
  freeList.innerHTML = free.length
    ? free
        .map(
          (slot) =>
            `<div class="today-item"><strong>空き時間</strong><div>${slot.start} - ${slot.end}</div></div>`
        )
        .join("")
    : `<div class="today-item">空き時間はありません</div>`;

  els.dayView.append(metrics, shell, freeList);
}

function renderYearView() {
  els.yearView.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "year-grid";
  for (let month = 0; month < 12; month += 1) {
    const monthDate = new Date(state.currentDate.getFullYear(), month, 1);
    const box = document.createElement("button");
    box.className = "mini-month";
    box.addEventListener("click", () => {
      state.currentDate = monthDate;
      state.view = "month";
      renderAll();
    });
    const title = document.createElement("h3");
    title.textContent = `${month + 1}月`;
    title.className = "mini-month-title";
    box.appendChild(title);

    const mini = document.createElement("div");
    mini.className = "mini-month-grid";
    ["日", "月", "火", "水", "木", "金", "土"].forEach((item) => {
      const h = document.createElement("div");
      h.className = "muted";
      h.textContent = item;
      mini.appendChild(h);
    });
    const start = startOfCalendarMonth(monthDate);
    for (let i = 0; i < 42; i += 1) {
      const day = addDays(start, i);
      const cell = document.createElement("div");
      cell.className = "mini-cell";
      applyCalendarTone(cell, day);
      if (filteredEvents().some((event) => occursOnDate(event, day))) {
        cell.classList.add("has-events");
      }
      cell.textContent = day.getMonth() === month ? day.getDate() : "";
      mini.appendChild(cell);
    }
    box.appendChild(mini);
    grid.appendChild(box);
  }
  els.yearView.appendChild(grid);
}

function renderTodayPanel() {
  const today = startOfDay(new Date());
  const todaysEvents = sortedEvents(filteredEvents().filter((event) => occursOnDate(event, today)));
  els.todayEventsList.innerHTML = "";
  if (todaysEvents.length === 0) {
    els.todayEventsList.innerHTML = `<div class="today-item empty-state">今日の予定はありません</div>`;
  } else {
    todaysEvents.forEach((event) => {
      const category = getCategory(event.categoryId);
      const priorityTheme = getPriorityTheme(event.priority);
      const item = document.createElement("button");
      item.className = "today-item";
      item.style.borderLeft = `5px solid ${priorityTheme.solid}`;
      item.style.background = priorityTheme.soft;
      item.innerHTML = `
        <strong>${escapeHtml(event.title)}</strong>
        <div>${formatEventTime(event)}</div>
        <div class="muted">${escapeHtml(category.name)} ${event.location ? `・${escapeHtml(event.location)}` : ""}</div>
      `;
      item.addEventListener("click", () => openDetailsModal(event.id));
      els.todayEventsList.appendChild(item);
    });
  }

  const upcoming = sortedEvents(
    filteredEvents().filter((event) => new Date(event.endAt) >= new Date() && !event.isCompleted)
  )[0];
  if (!upcoming) {
    els.nextEventCard.textContent = "予定はありません";
    els.nextEventCard.classList.add("empty-state");
    return;
  }

  els.nextEventCard.classList.remove("empty-state");
  const diff = Math.max(0, Math.round((new Date(upcoming.startAt) - new Date()) / 60000));
  const category = getCategory(upcoming.categoryId);
  const priorityTheme = getPriorityTheme(upcoming.priority);
  els.nextEventCard.style.background = priorityTheme.soft;
  els.nextEventCard.style.borderColor = priorityTheme.solid;
  els.nextEventCard.innerHTML = `
    <strong>${escapeHtml(upcoming.title)}</strong>
    <div>${formatLongDate(new Date(upcoming.startAt))}</div>
    <div class="muted">${diff}分後 / ${escapeHtml(category.name)}</div>
  `;
}

function renderRewardPanel() {
  const monthMinutes = totalMonthMinutes();
  const monthDates = getDatesInCurrentMonth();
  const workedDays = monthDates.filter((date) => getDailyMinutes(date) > 0).length;
  const monthEvents = filteredEventsForMonth();

  els.rewardModeSelect.value = state.rewardMode;

  if (state.rewardMode === "hourly") {
    const hours = monthMinutes / 60;
    const reward = hours * state.rewardRate * 1.1;
    els.rewardRateLabel.textContent = "時給";
    els.rewardRateInput.step = "100";
    els.rewardRateInput.value = String(state.rewardRate || 0);
    els.rewardAmountLabel.textContent = formatCurrency(reward);
    els.rewardFormulaLabel.textContent = `${formatHours(hours)} × ${formatCurrency(state.rewardRate || 0)} × 1.1`;
    return;
  }

  if (state.rewardMode === "daily") {
    const reward = workedDays * state.rewardRate * 1.1;
    els.rewardRateLabel.textContent = "日給";
    els.rewardRateInput.step = "1000";
    els.rewardRateInput.value = String(state.rewardRate || 0);
    els.rewardAmountLabel.textContent = formatCurrency(reward);
    els.rewardFormulaLabel.textContent = `${workedDays}日 × ${formatCurrency(state.rewardRate || 0)} × 1.1`;
    return;
  }

  const projectCount = countProjectUnits(monthEvents);
  const reward = projectCount * state.rewardRate;
  els.rewardRateLabel.textContent = "一案件単価";
  els.rewardRateInput.step = "1000";
  els.rewardRateInput.value = String(state.rewardRate || 0);
  els.rewardAmountLabel.textContent = formatCurrency(reward);
  els.rewardFormulaLabel.textContent = `${projectCount}案件 × ${formatCurrency(state.rewardRate || 0)}`;
}

function renderCategoryManager() {
  els.categoryList.innerHTML = "";
  sortedCategories().forEach((category) => {
    const item = document.createElement("button");
    item.className = "category-item";
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="category-swatch" style="background:${category.color}"></span>
        <div>
          <strong>${escapeHtml(category.name)}</strong>
          <div class="muted">${escapeHtml(category.description || "説明なし")}</div>
        </div>
      </div>
      <span class="muted">${category.sortOrder}</span>
    `;
    item.addEventListener("click", () => fillCategoryForm(category));
    els.categoryList.appendChild(item);
  });
  populateCategorySelect();
}

function populateCategorySelect() {
  els.eventCategory.innerHTML = sortedCategories()
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");
}

function handleEventSubmit(event) {
  event.preventDefault();
  const payload = {
    id: els.eventId.value || crypto.randomUUID(),
    title: els.eventTitle.value.trim(),
    startAt: new Date(els.eventStart.value).toISOString(),
    endAt: new Date(els.eventEnd.value).toISOString(),
    isAllDay: els.eventAllDay.checked,
    categoryId: els.eventCategory.value,
    priority: Number(els.eventPriority.value),
    location: els.eventLocation.value.trim(),
    reminderMinutes: els.eventReminder.value ? Number(els.eventReminder.value) : null,
    repeat: els.eventRepeat.value,
    isCompleted: els.eventCompleted.value === "true",
    meetingUrl: els.eventMeetingUrl.value.trim(),
    description: els.eventDescription.value.trim(),
  };

  if (!payload.title) return;
  if (new Date(payload.endAt) <= new Date(payload.startAt)) {
    alert("終了日時は開始日時より後にしてください。");
    return;
  }

  const index = state.events.findIndex((item) => item.id === payload.id);
  if (index >= 0) state.events[index] = payload;
  else state.events.push(payload);

  closeModal("eventModal");
  renderAll();
}

function handleEventDelete() {
  const id = els.eventId.value;
  if (!id) return;
  state.events = state.events.filter((event) => event.id !== id);
  closeModal("eventModal");
  renderAll();
}

function handleEventTemplateSelect(event) {
  const templateId = event.target.value;
  if (!templateId) return;
  const template = state.events.find((item) => item.id === templateId);
  if (!template) return;
  applyEventTemplate(template);
}

function handleEventTimeTemplateSelect(event) {
  const value = event.target.value;
  if (!value) return;
  applyTimeTemplate(value);
}

function handleCategorySubmit(event) {
  event.preventDefault();
  const payload = {
    id: els.categoryId.value || crypto.randomUUID(),
    name: els.categoryName.value.trim(),
    color: els.categoryColor.value,
    icon: els.categoryIcon.value.trim(),
    description: els.categoryDescription.value.trim(),
    sortOrder: Number(els.categorySortOrder.value || 1),
  };

  if (!payload.name) return;
  const index = state.categories.findIndex((item) => item.id === payload.id);
  if (index >= 0) state.categories[index] = payload;
  else state.categories.push(payload);
  renderCategoryManager();
  resetCategoryForm();
  renderAll();
}

function handleCategoryDelete() {
  const id = els.categoryId.value;
  if (!id) return;
  state.categories = state.categories.filter((category) => category.id !== id);
  state.events = state.events.map((event) =>
    event.categoryId === id ? { ...event, categoryId: state.categories[0]?.id || "" } : event
  );
  renderCategoryManager();
  resetCategoryForm();
  renderAll();
}

function resetCategoryForm() {
  els.categoryForm.reset();
  els.categoryId.value = "";
  els.categoryColor.value = "#7cc6fe";
  els.categorySortOrder.value = String(state.categories.length + 1);
  els.deleteCategoryButton.classList.add("hidden");
}

function fillCategoryForm(category) {
  els.categoryId.value = category.id;
  els.categoryName.value = category.name;
  els.categoryColor.value = category.color;
  els.categoryIcon.value = category.icon || "";
  els.categorySortOrder.value = String(category.sortOrder || 1);
  els.categoryDescription.value = category.description || "";
  els.deleteCategoryButton.classList.remove("hidden");
}

function openEventModal(options = {}) {
  populateCategorySelect();
  renderEventTemplates();
  renderTimeTemplates();
  els.eventForm.reset();
  els.eventId.value = "";
  els.eventTemplateSelect.value = "";
  els.eventTimeTemplateSelect.value = "";
  els.deleteEventButton.classList.add("hidden");
  els.eventModalTitle.textContent = "予定を追加";

  const hasExplicitDate = Boolean(options.date);
  const baseDate = hasExplicitDate ? startOfDay(new Date(options.date)) : startOfDay(state.currentDate);
  const start = options.minutes != null
    ? addMinutes(baseDate, options.minutes)
    : getDefaultStartDate(baseDate, hasExplicitDate);
  const end = addMinutes(start, 60);
  els.eventStart.value = toDatetimeLocal(start);
  els.eventEnd.value = toDatetimeLocal(end);
  els.eventPriority.value = "3";
  els.eventCompleted.value = "false";
  els.eventRepeat.value = "none";
  els.eventCategory.value = state.categories[0]?.id || "";

  openModal("eventModal");
}

function getDefaultStartDate(baseDate, hasExplicitDate) {
  const now = new Date();
  if (hasExplicitDate) {
    if (isSameDay(baseDate, now)) {
      return roundUpToNextHalfHour(now);
    }
    return setTime(baseDate, 9, 0);
  }
  return roundUpToNextHalfHour(now);
}

function roundUpToNextHalfHour(date) {
  const start = new Date(date);
  start.setSeconds(0, 0);
  const roundedMinutes = Math.ceil(start.getMinutes() / 30) * 30;
  start.setMinutes(roundedMinutes);
  return start;
}

function openDetailsModal(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  const category = getCategory(event.categoryId);
  const provider = detectMeetingProvider(event.meetingUrl);
  const priorityTheme = getPriorityTheme(event.priority);
  els.eventDetailsContent.innerHTML = `
    <div class="detail-hero" style="background:linear-gradient(135deg, ${priorityTheme.solid}, ${category.color})">
      <p class="eyebrow" style="color:rgba(255,255,255,0.82)">予定詳細</p>
      <h3 style="margin:0 0 8px">${escapeHtml(event.title)}</h3>
      <div>${escapeHtml(category.name)} / 重要度 ${event.priority}</div>
    </div>
    <div class="detail-grid">
      <div class="detail-stat"><span>日時</span>${formatLongDate(new Date(event.startAt))}<br />${formatEventTime(event)}</div>
      <div class="detail-stat"><span>場所</span>${escapeHtml(event.location || "未設定")}</div>
      <div class="detail-stat"><span>URL</span>${event.meetingUrl ? escapeHtml(provider.label) : "URL未設定"}</div>
      <div class="detail-stat"><span>状態</span>${event.isCompleted ? "完了" : "未完了"}</div>
      <div class="detail-stat field-span-2"><span>備考</span>${escapeHtml(event.description || "なし")}</div>
    </div>
    <div class="detail-actions">
      <button class="secondary-button" id="detailsEditButton">編集</button>
      <button class="danger-button" id="detailsDeleteButton">削除</button>
      <button class="primary-button" id="joinMeetingButton" ${event.meetingUrl ? "" : "disabled"}>ミーティングに参加</button>
    </div>
  `;
  openModal("detailsModal");

  document.getElementById("detailsEditButton").addEventListener("click", () => {
    closeModal("detailsModal");
    editEvent(event);
  });
  document.getElementById("detailsDeleteButton").addEventListener("click", () => {
    state.events = state.events.filter((item) => item.id !== event.id);
    closeModal("detailsModal");
    renderAll();
  });
  document.getElementById("joinMeetingButton").addEventListener("click", () => {
    if (event.meetingUrl) openExternalUrl(event.meetingUrl);
  });
}

function editEvent(event) {
  populateCategorySelect();
  renderEventTemplates();
  renderTimeTemplates();
  els.eventModalTitle.textContent = "予定を編集";
  els.eventId.value = event.id;
  els.eventTemplateSelect.value = "";
  els.eventTimeTemplateSelect.value = "";
  els.eventTitle.value = event.title;
  els.eventStart.value = toDatetimeLocal(new Date(event.startAt));
  els.eventEnd.value = toDatetimeLocal(new Date(event.endAt));
  els.eventAllDay.checked = event.isAllDay;
  els.eventCategory.value = event.categoryId;
  els.eventPriority.value = String(event.priority);
  els.eventLocation.value = event.location || "";
  els.eventReminder.value = event.reminderMinutes != null ? String(event.reminderMinutes) : "";
  els.eventRepeat.value = event.repeat || "none";
  els.eventCompleted.value = String(Boolean(event.isCompleted));
  els.eventMeetingUrl.value = event.meetingUrl || "";
  els.eventDescription.value = event.description || "";
  els.deleteEventButton.classList.remove("hidden");
  openModal("eventModal");
}

function applyEventTemplate(template) {
  const currentStart = els.eventStart.value ? new Date(els.eventStart.value) : startOfDay(state.currentDate);
  const templateStart = new Date(template.startAt);
  const templateEnd = new Date(template.endAt);
  const duration = templateEnd - templateStart;

  const nextStart = new Date(currentStart);
  nextStart.setHours(templateStart.getHours(), templateStart.getMinutes(), 0, 0);
  const nextEnd = new Date(nextStart.getTime() + duration);

  els.eventTitle.value = template.title;
  els.eventStart.value = toDatetimeLocal(nextStart);
  els.eventEnd.value = toDatetimeLocal(nextEnd);
  els.eventAllDay.checked = Boolean(template.isAllDay);
  els.eventCategory.value = template.categoryId;
  els.eventPriority.value = String(template.priority ?? 3);
  els.eventLocation.value = template.location || "";
  els.eventReminder.value = template.reminderMinutes != null ? String(template.reminderMinutes) : "";
  els.eventRepeat.value = template.repeat || "none";
  els.eventCompleted.value = "false";
  els.eventMeetingUrl.value = template.meetingUrl || "";
  els.eventDescription.value = template.description || "";

  if (template.isAllDay) {
    const allDayStart = startOfDay(currentStart);
    const allDayEnd = addDays(allDayStart, Math.max(1, Math.round(duration / 86400000)));
    els.eventStart.value = toDatetimeLocal(allDayStart);
    els.eventEnd.value = toDatetimeLocal(allDayEnd);
  }
}

function applyTimeTemplate(value) {
  const match = value.match(/^(\d{1,2}):(\d{1,2})-(\d{1,2}):(\d{1,2})$/);
  if (!match) return;
  const [, sh, sm, eh, em] = match.map(Number);
  const startBase = els.eventStart.value ? new Date(els.eventStart.value) : startOfDay(state.currentDate);
  const endBase = els.eventEnd.value ? new Date(els.eventEnd.value) : new Date(startBase);
  const start = new Date(startBase);
  const end = new Date(endBase);
  start.setHours(sh, sm, 0, 0);
  end.setHours(eh, em, 0, 0);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  els.eventStart.value = toDatetimeLocal(start);
  els.eventEnd.value = toDatetimeLocal(end);
  els.eventAllDay.checked = false;
}

function createEventPill(event) {
  const category = getCategory(event.categoryId);
  const priorityTheme = getPriorityTheme(event.priority);
  const pill = document.createElement("button");
  pill.className = "event-pill";
  pill.style.background = priorityTheme.soft;
  pill.style.color = priorityTheme.text;
  pill.style.border = `1px solid ${priorityTheme.border}`;
  pill.innerHTML = `
    <span class="event-dot" style="background:${category.color}"></span>
    <span>${escapeHtml(event.title)}</span>
    <span class="event-time">${event.isAllDay ? "終日" : formatTime(new Date(event.startAt))}</span>
  `;
  pill.addEventListener("click", (clickEvent) => {
    clickEvent.stopPropagation();
    openDetailsModal(event.id);
  });
  return pill;
}

function createTimeEvent(event) {
  const category = getCategory(event.categoryId);
  const priorityTheme = getPriorityTheme(event.priority);
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const top = ((start.getHours() * 60 + start.getMinutes()) / (24 * 60)) * 1344;
  const height = Math.max(42, ((end - start) / 60000 / (24 * 60)) * 1344);
  const button = document.createElement("button");
  button.className = "time-event";
  button.style.top = `${top}px`;
  button.style.height = `${height}px`;
  button.style.background = priorityTheme.solid;
  button.style.color = priorityTheme.onSolid;
  button.style.borderLeft = `6px solid ${category.color}`;
  button.innerHTML = `
    <span class="time-event-title">${escapeHtml(event.title)}</span>
    <span class="time-event-meta">${formatEventTime(event)}</span>
  `;
  button.addEventListener("click", (clickEvent) => {
    clickEvent.stopPropagation();
    openDetailsModal(event.id);
  });
  return button;
}

function filteredEvents() {
  return sortedEvents(
    state.events.filter((event) => {
      if (state.importantOnly && event.priority < 4) return false;
      if (state.selectedCategoryIds.length > 0 && !state.selectedCategoryIds.includes(event.categoryId)) return false;
      if (!state.searchText) return true;
      const bag = `${event.title} ${event.location || ""} ${event.description || ""}`.toLowerCase();
      return bag.includes(state.searchText);
    })
  );
}

function filteredEventsForMonth() {
  const start = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  const end = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0, 23, 59, 59);
  return filteredEvents().filter((event) => new Date(event.startAt) <= end && new Date(event.endAt) >= start);
}

function totalMonthMinutes() {
  const monthStart = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  const monthEnd = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0);
  let total = 0;
  for (let cursor = new Date(monthStart); cursor <= monthEnd; cursor = addDays(cursor, 1)) {
    total += getDailyMinutes(cursor);
  }
  return total;
}

function getDatesInCurrentMonth() {
  const monthStart = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  const monthEnd = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0);
  const dates = [];
  for (let cursor = new Date(monthStart); cursor <= monthEnd; cursor = addDays(cursor, 1)) {
    dates.push(new Date(cursor));
  }
  return dates;
}

function shiftRange(step) {
  const date = new Date(state.currentDate);
  if (state.view === "month") date.setMonth(date.getMonth() + step);
  else if (state.view === "week") date.setDate(date.getDate() + step * 7);
  else if (state.view === "day") date.setDate(date.getDate() + step);
  else date.setFullYear(date.getFullYear() + step);
  state.currentDate = startOfDay(date);
  renderAll();
}

function updateClock() {
  const now = new Date();
  els.currentDateLabel.textContent = formatLongDate(now);
  els.currentTimeLabel.textContent = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const next = sortedEvents(state.events.filter((event) => new Date(event.endAt) >= now && !event.isCompleted))[0];
  els.currentStatusLabel.textContent = next
    ? `次の予定まで ${Math.max(0, Math.round((new Date(next.startAt) - now) / 60000))} 分`
    : "次の予定はありません";
  if (state.view === "week") renderWeekView();
  if (state.view === "day") renderDayView();
}

function drawCurrentTimeLine(columns, startDate, mode) {
  const now = new Date();
  if (mode === "week") {
    const diff = Math.floor((startOfDay(now) - startOfDay(startDate)) / 86400000);
    if (diff < 0 || diff > 6) return;
    const line = document.createElement("div");
    line.className = "current-time-line";
    line.style.top = `${((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 1344}px`;
    columns.children[diff].appendChild(line);
  } else {
    if (!isSameDay(now, startDate)) return;
    const line = document.createElement("div");
    line.className = "current-time-line";
    line.style.top = `${((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 1344}px`;
    columns.children[0].appendChild(line);
  }
}

function calculateFreeSlots(date, events) {
  const items = sortedEvents(events).map((event) => ({
    start: new Date(event.startAt),
    end: new Date(event.endAt),
  }));
  let cursor = setTime(date, 0, 0);
  const endOfDay = setTime(date, 24, 0);
  const free = [];
  items.forEach((item) => {
    if (item.start > cursor) {
      free.push({ start: formatTime(cursor), end: formatTime(item.start), minutes: (item.start - cursor) / 60000 });
    }
    if (item.end > cursor) cursor = item.end;
  });
  if (cursor < endOfDay) free.push({ start: formatTime(cursor), end: "24:00", minutes: (endOfDay - cursor) / 60000 });
  return free.filter((item) => item.minutes >= 30);
}

function totalFreeMinutes(freeSlots) {
  return freeSlots.reduce((sum, slot) => sum + slot.minutes, 0);
}

function getDailyMinutes(date) {
  const dayEvents = filteredEvents().filter((event) => occursOnDate(event, date));
  if (isWeekdayDayOff(date, dayEvents)) return 0;
  return dayEvents.reduce((sum, event) => sum + durationMinutes(event), 0);
}

function formatWorkloadLabel(minutes) {
  if (minutes <= 0) return "予定追加";
  const hours = minutes / 60;
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${rounded}時間稼働`;
}

function formatHours(hours) {
  return Number.isInteger(hours) ? `${hours}時間` : `${hours.toFixed(1)}時間`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function countProjectUnits(events) {
  const titles = new Set(
    events
      .map((event) => (event.title || "").trim())
      .filter(Boolean)
  );
  return titles.size;
}

function getPriorityTheme(priority) {
  const level = Number(priority) || 3;
  if (level >= 5) {
    return { solid: "#e35d6a", soft: "#fdecef", border: "#f4b8c0", text: "#8f2132", onSolid: "#ffffff" };
  }
  if (level === 4) {
    return { solid: "#f08c4a", soft: "#fff1e7", border: "#f6c4a1", text: "#9a4e1d", onSolid: "#ffffff" };
  }
  if (level === 3) {
    return { solid: "#5fa8f2", soft: "#ebf4ff", border: "#bfd9fa", text: "#214f82", onSolid: "#0f2f53" };
  }
  if (level === 2) {
    return { solid: "#6dc6b3", soft: "#ebfbf7", border: "#b6ebdd", text: "#1f685a", onSolid: "#12443b" };
  }
  return { solid: "#9ba9b8", soft: "#f2f5f8", border: "#d3dbe4", text: "#536170", onSolid: "#24313d" };
}

function isWeekdayDayOff(date, events) {
  const day = new Date(date).getDay();
  if (day === 0 || day === 6) return false;
  return events.some((event) => isDayOffEvent(event));
}

function isDayOffEvent(event) {
  const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
  const keywords = ["休み", "休暇", "有休", "代休", "休日", "off", "pto", "vacation"];
  if (!keywords.some((keyword) => text.includes(keyword))) return false;

  if (event.isAllDay) return true;
  return durationMinutes(event) >= 8 * 60;
}

function applyCalendarTone(element, date) {
  if (!element || !date) return;
  if (isJapaneseHoliday(date) || date.getDay() === 0) {
    element.classList.add(date.getDay() === 0 ? "is-sunday" : "is-holiday");
    return;
  }
  if (date.getDay() === 6) {
    element.classList.add("is-saturday");
  }
}

function isJapaneseHoliday(date) {
  const target = startOfDay(new Date(date));
  return getJapaneseHolidaySet(target.getFullYear()).has(toDateKey(target));
}

const japaneseHolidayCache = new Map();

function getJapaneseHolidaySet(year) {
  if (japaneseHolidayCache.has(year)) return japaneseHolidayCache.get(year);

  const holidays = new Set();
  const add = (month, day) => holidays.add(toDateKey(new Date(year, month - 1, day)));

  add(1, 1);
  add(2, 11);
  add(2, 23);
  add(4, 29);
  add(5, 3);
  add(5, 4);
  add(5, 5);
  if (year >= 2016) add(8, 11);
  add(11, 3);
  add(11, 23);

  add(1, nthWeekdayOfMonth(year, 0, 1, 2));
  add(7, nthWeekdayOfMonth(year, 6, 1, 3));
  add(9, nthWeekdayOfMonth(year, 8, 1, 3));
  add(10, nthWeekdayOfMonth(year, 9, 1, 2));
  add(3, vernalEquinoxDay(year));
  add(9, autumnalEquinoxDay(year));

  const baseDates = [...holidays].map(fromDateKey).sort((a, b) => a - b);

  baseDates.forEach((date) => {
    if (date.getDay() !== 0) return;
    let substitute = addDays(date, 1);
    while (holidays.has(toDateKey(substitute))) {
      substitute = addDays(substitute, 1);
    }
    holidays.add(toDateKey(substitute));
  });

  const start = new Date(year, 0, 2);
  const end = new Date(year, 11, 30);
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const prev = addDays(cursor, -1);
    const next = addDays(cursor, 1);
    const key = toDateKey(cursor);
    if (!holidays.has(key) && holidays.has(toDateKey(prev)) && holidays.has(toDateKey(next))) {
      holidays.add(key);
    }
  }

  japaneseHolidayCache.set(year, holidays);
  return holidays;
}

function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
  const first = new Date(year, monthIndex, 1);
  const offset = (7 + weekday - first.getDay()) % 7;
  return 1 + offset + (nth - 1) * 7;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isNthWeekdayOfMonth(date, nth, weekday) {
  const day = date.getDate();
  return date.getDay() === weekday && Math.ceil(day / 7) === nth;
}

function vernalEquinoxDay(year) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnalEquinoxDay(year) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function occursOnDate(event, date) {
  const start = startOfDay(new Date(event.startAt));
  const end = startOfDay(new Date(event.endAt));
  const target = startOfDay(date);
  return target >= start && target <= end;
}

function durationMinutes(event) {
  return Math.max(0, Math.round((new Date(event.endAt) - new Date(event.startAt)) / 60000));
}

function sortedEvents(events) {
  return [...events].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
}

function sortedCategories() {
  return [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ja"));
}

function getCategory(id) {
  return state.categories.find((category) => category.id === id) || state.categories[0];
}

function indexCategories() {
  return Object.fromEntries(state.categories.map((category) => [category.name, category.id]));
}

function findCategoryIdByName(name, categories) {
  return categories[name] || state.categories[0]?.id || "";
}

function createCategoryRecord(name, color, icon, description, sortOrder) {
  return {
    id: crypto.randomUUID(),
    name,
    color,
    icon,
    description,
    sortOrder,
  };
}

function createEventRecord(data) {
  return {
    id: crypto.randomUUID(),
    title: data.title,
    startAt: new Date(data.startAt).toISOString(),
    endAt: new Date(data.endAt).toISOString(),
    isAllDay: Boolean(data.isAllDay),
    categoryId: data.categoryId,
    priority: data.priority || 3,
    location: data.location || "",
    reminderMinutes: data.reminderMinutes ?? null,
    repeat: data.repeat || "none",
    isCompleted: Boolean(data.isCompleted),
    meetingUrl: data.meetingUrl || "",
    description: data.description || "",
  };
}

function detectMeetingProvider(url) {
  if (!url) return { type: "none", label: "URL未設定" };
  if (url.includes("meet.google.com")) return { type: "meet", label: "Google Meet" };
  if (url.includes("zoom.us")) return { type: "zoom", label: "Zoom" };
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) return { type: "teams", label: "Microsoft Teams" };
  return { type: "other", label: "外部URL" };
}

function exportBackup() {
  const blob = new Blob([JSON.stringify({ categories: state.categories, events: state.events }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bloom-calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openExternalUrl(url) {
  if (!url) return;
  if (window.desktopBridge?.openExternalUrl) {
    window.desktopBridge.openExternalUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener");
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function formatLongDate(date) {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function formatTime(date) {
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatEventTime(event) {
  if (event.isAllDay) return "終日";
  return `${formatTime(new Date(event.startAt))} - ${formatTime(new Date(event.endAt))}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function startOfCalendarMonth(date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + minutes * 60000);
}

function setTime(date, hours, minutes) {
  const copy = new Date(date);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

function isSameDay(a, b) {
  return startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime();
}

function toDatetimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shadeColor(color, amount) {
  const normalized = color.replace("#", "");
  const num = parseInt(normalized, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}
