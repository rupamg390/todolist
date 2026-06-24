/**
 * TaskFlow — script.js
 * Task manager with LocalStorage persistence, filtering, search,
 * inline editing, and animated progress arc.
 *
 * Architecture:
 *  - state        : single source of truth (tasks array + UI state)
 *  - render()     : re-renders task list from state
 *  - updateStats() : syncs sidebar counters and progress arc
 *  - persist()    : saves state.tasks to LocalStorage
 *  - Event wiring : bottom of file
 */

'use strict';

/* ================================================================
   STATE
   ================================================================ */
const state = {
  tasks: [],          // [{id, title, notes, priority, completed, createdAt}]
  filter: 'all',      // 'all' | 'pending' | 'completed'
  search: '',         // search keyword (lower-case)
  editId: null,       // id of task being edited (null = new task)
  deleteId: null,     // id of task awaiting delete confirmation
};

/* ================================================================
   LOCAL STORAGE
   ================================================================ */
const STORAGE_KEY = 'taskflow_tasks';

/** Load tasks from LocalStorage into state. */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.tasks = raw ? JSON.parse(raw) : [];
  } catch {
    state.tasks = [];
  }
}

/** Persist current tasks array to LocalStorage. */
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

/* ================================================================
   TASK CRUD
   ================================================================ */

/** Generate a simple unique ID. */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Add a new task to state and re-render.
 * @param {string} title
 * @param {string} notes
 * @param {string} priority  'low' | 'medium' | 'high'
 */
function addTask(title, notes, priority) {
  const task = {
    id: uid(),
    title: title.trim(),
    notes: notes.trim(),
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  state.tasks.unshift(task); // newest first
  persist();
  render();
  updateStats();
}

/**
 * Update an existing task's fields.
 * @param {string} id
 * @param {string} title
 * @param {string} notes
 * @param {string} priority
 */
function updateTask(id, title, notes, priority) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.title    = title.trim();
  task.notes    = notes.trim();
  task.priority = priority;
  persist();
  render();
  updateStats();
}

/**
 * Toggle a task's completed status.
 * @param {string} id
 */
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  persist();
  render();
  updateStats();
}

/**
 * Permanently delete a task by id.
 * @param {string} id
 */
function deleteTask(id) {
  // Animate card out first, then remove from state
  const card = document.querySelector(`.task-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    card.addEventListener('animationend', () => {
      state.tasks = state.tasks.filter(t => t.id !== id);
      persist();
      render();
      updateStats();
    }, { once: true });
  } else {
    state.tasks = state.tasks.filter(t => t.id !== id);
    persist();
    render();
    updateStats();
  }
}

/* ================================================================
   FILTERING & SEARCH
   ================================================================ */

/**
 * Return tasks filtered by current state.filter and state.search.
 * @returns {Array}
 */
function getVisibleTasks() {
  return state.tasks.filter(task => {
    // Filter by status
    if (state.filter === 'completed' && !task.completed) return false;
    if (state.filter === 'pending'   &&  task.completed) return false;

    // Search by keyword in title or notes
    if (state.search) {
      const haystack = (task.title + ' ' + task.notes).toLowerCase();
      if (!haystack.includes(state.search)) return false;
    }

    return true;
  });
}

/* ================================================================
   RENDER
   ================================================================ */

/** Main render — builds task cards from visible tasks. */
function render() {
  const list     = document.getElementById('taskList');
  const empty    = document.getElementById('emptyState');
  const emTitle  = document.getElementById('emptyTitle');
  const emHint   = document.getElementById('emptyHint');

  const visible  = getVisibleTasks();
  list.innerHTML = '';

  if (visible.length === 0) {
    empty.hidden = false;
    // Contextual empty state messaging
    if (state.tasks.length === 0) {
      emTitle.textContent = 'No tasks yet';
      emHint.innerHTML    = 'Click <strong>Add Task</strong> to get started.';
    } else if (state.search) {
      emTitle.textContent = 'No results found';
      emHint.innerHTML    = `Nothing matches "<strong>${escapeHtml(state.search)}</strong>".`;
    } else {
      emTitle.textContent = state.filter === 'completed'
        ? 'No completed tasks'
        : 'No pending tasks';
      emHint.innerHTML = 'Switch the filter to see all tasks.';
    }
    return;
  }

  empty.hidden = true;

  visible.forEach(task => {
    const card = buildTaskCard(task);
    list.appendChild(card);
  });
}

/**
 * Build a single task card DOM element.
 * @param {Object} task
 * @returns {HTMLElement}
 */
function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className  = 'task-card' + (task.completed ? ' completed' : '');
  card.dataset.id = task.id;
  card.dataset.priority = task.priority;
  card.setAttribute('role', 'listitem');

  // Format date
  const date = new Date(task.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  card.innerHTML = `
    <button class="task-check"
            aria-label="${task.completed ? 'Mark as pending' : 'Mark as completed'}"
            title="${task.completed ? 'Mark as pending' : 'Mark as completed'}">
      <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M1.5 6.5L4.5 9.5L10.5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div class="task-body">
      <p class="task-title">${escapeHtml(task.title)}</p>
      ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ''}
      <div class="task-meta">
        <span class="task-date">${dateStr}</span>
        <span class="priority-badge ${task.priority}">${capitalize(task.priority)}</span>
      </div>
    </div>

    <div class="task-actions">
      <button class="action-btn edit" aria-label="Edit task" title="Edit">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="action-btn del" aria-label="Delete task" title="Delete">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;

  // Wire up internal button events
  card.querySelector('.task-check').addEventListener('click', () => toggleTask(task.id));
  card.querySelector('.action-btn.edit').addEventListener('click', () => openEditModal(task.id));
  card.querySelector('.action-btn.del').addEventListener('click', () => openDeleteConfirm(task.id));

  return card;
}

/* ================================================================
   STATS & PROGRESS ARC
   ================================================================ */

/** Update all stat counters and the SVG progress arc. */
function updateStats() {
  const total     = state.tasks.length;
  const done      = state.tasks.filter(t => t.completed).length;
  const pending   = total - done;
  const pct       = total === 0 ? 0 : Math.round((done / total) * 100);

  // Counter elements
  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('arcPct').textContent      = pct + '%';

  // SVG arc: circumference = 2π×50 ≈ 314.16
  const circumference = 314.16;
  const offset = circumference - (pct / 100) * circumference;
  document.getElementById('arcFill').style.strokeDashoffset = offset;
}

/* ================================================================
   MODAL — ADD / EDIT
   ================================================================ */

let currentPriority = 'low'; // tracks selected priority in modal

/** Open the Add Task modal (cleared fields). */
function openAddModal() {
  state.editId = null;
  currentPriority = 'low';

  document.getElementById('modalHeading').textContent = 'New Task';
  document.getElementById('taskTitle').value  = '';
  document.getElementById('taskNotes').value  = '';
  document.getElementById('charCount').textContent = '0 / 120';
  resetPriorityBtns('low');
  clearFieldError(document.getElementById('taskTitle'));

  showModal('modalBackdrop');
  setTimeout(() => document.getElementById('taskTitle').focus(), 50);
}

/**
 * Open the Edit Task modal pre-filled with existing data.
 * @param {string} id
 */
function openEditModal(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  state.editId    = id;
  currentPriority = task.priority;

  document.getElementById('modalHeading').textContent = 'Edit Task';
  document.getElementById('taskTitle').value  = task.title;
  document.getElementById('taskNotes').value  = task.notes;
  document.getElementById('charCount').textContent = `${task.title.length} / 120`;
  resetPriorityBtns(task.priority);
  clearFieldError(document.getElementById('taskTitle'));

  showModal('modalBackdrop');
  setTimeout(() => document.getElementById('taskTitle').focus(), 50);
}

/** Close the Add/Edit modal. */
function closeModal() {
  hideModal('modalBackdrop');
  state.editId = null;
}

/** Handle Save button in modal — validates then adds or updates. */
function saveTask() {
  const titleEl = document.getElementById('taskTitle');
  const title   = titleEl.value.trim();
  const notes   = document.getElementById('taskNotes').value;

  // Basic validation
  if (!title) {
    setFieldError(titleEl, 'Please enter a task title.');
    titleEl.focus();
    return;
  }

  if (state.editId) {
    updateTask(state.editId, title, notes, currentPriority);
  } else {
    addTask(title, notes, currentPriority);
  }

  closeModal();
}

/** Set priority buttons active state. */
function resetPriorityBtns(priority) {
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.priority === priority);
  });
}

/** Show a field error state + message (appended as sibling). */
function setFieldError(el, msg) {
  el.classList.add('error');
  let errEl = el.parentElement.querySelector('.field-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'field-error';
    errEl.style.cssText = 'font-size:12px;color:#FF5C7A;margin-top:-8px;';
    el.after(errEl);
  }
  errEl.textContent = msg;
}

/** Clear field error state. */
function clearFieldError(el) {
  el.classList.remove('error');
  const errEl = el.parentElement.querySelector('.field-error');
  if (errEl) errEl.remove();
}

/* ================================================================
   MODAL — DELETE CONFIRM
   ================================================================ */

/**
 * Show delete confirmation dialog.
 * @param {string} id
 */
function openDeleteConfirm(id) {
  state.deleteId = id;
  showModal('deleteBackdrop');
}

/** User confirmed delete. */
function confirmDelete() {
  if (state.deleteId) {
    deleteTask(state.deleteId);
    state.deleteId = null;
  }
  hideModal('deleteBackdrop');
}

/** User cancelled delete. */
function cancelDelete() {
  state.deleteId = null;
  hideModal('deleteBackdrop');
}

/* ================================================================
   MODAL HELPERS
   ================================================================ */

function showModal(id) {
  const el = document.getElementById(id);
  el.hidden = false;
  document.body.style.overflow = 'hidden';
}

function hideModal(id) {
  const el = document.getElementById(id);
  el.hidden = true;
  document.body.style.overflow = '';
}

/* ================================================================
   SIDEBAR (MOBILE)
   ================================================================ */

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').hidden = false;
  document.getElementById('menuToggle').classList.add('open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').hidden = true;
  document.getElementById('menuToggle').classList.remove('open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
}

/* ================================================================
   DATE DISPLAY
   ================================================================ */

/** Write today's date into the page header. */
function renderDate() {
  const el = document.getElementById('pageDate');
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

/* ================================================================
   UTILITY
   ================================================================ */

/** Escape HTML special chars to prevent XSS. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Capitalise first letter. */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ================================================================
   EVENT WIRING
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Init ─────────────────────────────────────────────────────
  loadFromStorage();
  renderDate();
  render();
  updateStats();

  // ── Add Task button ───────────────────────────────────────────
  document.getElementById('btnOpenModal').addEventListener('click', openAddModal);

  // ── Modal save / cancel ───────────────────────────────────────
  document.getElementById('btnSaveTask').addEventListener('click', saveTask);
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);

  // Close modal on backdrop click
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Save on Enter key in title field
  document.getElementById('taskTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTask();
  });

  // ── Char counter ──────────────────────────────────────────────
  document.getElementById('taskTitle').addEventListener('input', e => {
    const len = e.target.value.length;
    document.getElementById('charCount').textContent = `${len} / 120`;
    if (e.target.value.trim()) clearFieldError(e.target);
  });

  // ── Priority buttons ──────────────────────────────────────────
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPriority = btn.dataset.priority;
      resetPriorityBtns(currentPriority);
    });
  });

  // ── Delete confirm ────────────────────────────────────────────
  document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
  document.getElementById('btnCancelDelete').addEventListener('click', cancelDelete);

  document.getElementById('deleteBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) cancelDelete();
  });

  // ── Filter buttons ────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
      // Close sidebar on mobile after filter selection
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  // ── Search ────────────────────────────────────────────────────
  const searchInput = document.getElementById('searchInput');
  let searchDebounce;
  searchInput.addEventListener('input', e => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.search = e.target.value.trim().toLowerCase();
      render();
    }, 200);
  });

  // ── Mobile sidebar toggle ─────────────────────────────────────
  document.getElementById('menuToggle').addEventListener('click', () => {
    const isOpen = document.getElementById('sidebar').classList.contains('open');
    isOpen ? closeSidebar() : openSidebar();
  });

  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // ── Keyboard: Escape closes any open modal ────────────────────
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('modalBackdrop').hidden) closeModal();
    if (!document.getElementById('deleteBackdrop').hidden) cancelDelete();
    if (window.innerWidth <= 768) closeSidebar();
  });

});
