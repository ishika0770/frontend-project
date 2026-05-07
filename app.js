if (typeof AUTH !== 'undefined' && !AUTH.isLoggedIn()) {
    window.location.href = 'login.html';
}

const currentUser = (typeof AUTH !== 'undefined') ? AUTH.getCurrentUser() : null;
const TASKS_KEY = currentUser ? `studyflow_tasks_${currentUser.roll}` : 'studyflow_tasks_guest';

// Display user info in header
const userNameEl = document.getElementById('user-display-name');
const userRollEl = document.getElementById('user-display-roll');
if (currentUser) {
    if (userNameEl) userNameEl.textContent = currentUser.name;
    if (userRollEl) userRollEl.textContent = currentUser.roll;
    const photoEl = document.getElementById('user-photo');
    if (photoEl && currentUser.photo) photoEl.src = currentUser.photo;
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (typeof AUTH !== 'undefined') AUTH.logout();
        window.location.href = 'login.html';
    });
}

// Task Data Layer (localStorage) 
function loadTasks() {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveTasks(tasks) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

/** Read task data from a DOM <li> element */
function readTaskFromDOM(li) {
    const titleEl = li.querySelector('.task-title');
    const metaEl = li.querySelector('.task-meta');
    const priorityEl = li.querySelector('.priority-tag');
    const checkbox = li.querySelector('[data-action="toggle-task"]');

    const title = titleEl ? titleEl.textContent : '';
    const meta = metaEl ? metaEl.textContent : '';
    const done = checkbox ? checkbox.checked : false;

    let subject = 'General';
    let duePretty = 'No date';
    if (meta.includes('·')) {
        const parts = meta.split('·').map(s => s.trim());
        subject = parts[0] || 'General';
        duePretty = parts[1] || 'No date';
    }

    // Parse priority
    let priority = 'medium';
    if (priorityEl) {
        const txt = priorityEl.textContent.trim().toLowerCase();
        if (['high', 'medium', 'low'].includes(txt)) priority = txt;
    }

    return { title, subject, priority, duePretty, done };
}

function persistAllTasks() {
    const items = taskList.querySelectorAll('.task-item');
    const tasks = [];
    items.forEach(li => tasks.push(readTaskFromDOM(li)));
    saveTasks(tasks);
}

// DOM References 
const taskList = document.getElementById('task-list');
const addTaskForm = document.getElementById('add-task-form');
const taskInput = document.getElementById('new-task-input');
const taskSubject = document.getElementById('new-task-subject');
const taskDate = document.getElementById('new-task-date');
const taskPriority = document.getElementById('new-task-priority');
const filterBtns = document.querySelectorAll('[data-filter]');

// Load saved tasks
const saved = loadTasks();
if (saved.length > 0) {
    taskList.innerHTML = '';
    saved.forEach(task => taskList.appendChild(createTaskElement(task)));
} else {
    persistAllTasks();
}

// Add Task 
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = taskInput.value.trim();
    if (!title) {
        taskInput.focus();
        return;
    }

    let subject = taskSubject.value.trim();
    if (!subject) subject = 'General';

    const priority = taskPriority.value;
    const dueRaw = taskDate.value;
    const duePretty = dueRaw
        ? 'Due ' + new Date(dueRaw).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'No date';

    const li = createTaskElement({ title, subject, priority, duePretty, done: false });

    const firstDone = taskList.querySelector('.task-item--done');
    if (firstDone) {
        taskList.insertBefore(li, firstDone);
    } else {
        taskList.appendChild(li);
    }

    // Reset form
    addTaskForm.reset();
    taskSubject.value = '';
    taskInput.focus();
    applyCurrentFilter();
    persistAllTasks();
});

// Toggle & Delete 
taskList.addEventListener('click', (e) => {
    const target = e.target;

    // Toggle completion
    if (target.matches('[data-action="toggle-task"]') || target.closest('.checkmark')) {
        const checkbox = target.matches('input') ? target : target.closest('.task-check').querySelector('input');
        const li = checkbox.closest('.task-item');

        if (checkbox.checked) {
            li.classList.add('task-item--done');
            li.dataset.status = 'completed';
        } else {
            li.classList.remove('task-item--done');
            li.dataset.status = 'pending';
        }
        applyCurrentFilter();
        persistAllTasks();
        return;
    }

    // Delete
    if (target.closest('.task-delete')) {
        const li = target.closest('.task-item');
        if (li.parentNode) {
            li.remove();
            persistAllTasks();
        }
    }
});

// Filter buttons 
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyCurrentFilter();
    });
});

function applyCurrentFilter() {
    const activeFilter = document.querySelector('[data-filter].active')?.dataset.filter || 'all';
    const items = taskList.querySelectorAll('.task-item');

    items.forEach(item => {
        const status = item.dataset.status;
        if (activeFilter === 'all') {
            item.style.setProperty('display', '', '');
        } else if (activeFilter === 'pending') {
            if (status === 'pending') item.style.setProperty('display', '', '');
            else item.style.setProperty('display', 'none', 'important');
        } else if (activeFilter === 'completed') {
            if (status === 'completed') item.style.setProperty('display', '', '');
            else item.style.setProperty('display', 'none', 'important');
        }
    });
}

// ─── Create task element ───
function createTaskElement({ title, subject, priority, duePretty, done }) {
    const li = document.createElement('li');
    li.className = `task-item d-flex align-items-center gap-3 p-3 rounded mb-2${done ? ' task-item--done' : ''}`;
    li.dataset.status = done ? 'completed' : 'pending';

    const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

    li.innerHTML = `
        <label class="task-check mb-0">
            <input type="checkbox" data-action="toggle-task" ${done ? 'checked' : ''}>
            <span class="checkmark"></span>
        </label>
        <div class="task-info flex-grow-1">
            <p class="task-title mb-1 fw-medium">${title}</p>
            <span class="task-meta small text-secondary">${subject} &middot; ${duePretty}</span>
        </div>
        <span class="priority-tag priority-tag--${priority}">${priorityLabel}</span>
        <button class="task-delete btn btn-sm btn-link text-secondary text-decoration-none p-0" title="Delete task">✕</button>
    `;

    return li;
}

if (taskDate) {
    const today = new Date().toISOString().slice(0, 10);
    taskDate.value = today;
}

const SUBJECT_COLORS = {
    '24cse': '#7c5cfc', '25cse': '#06b6d4', '25cai': '#f43f5e',
    '25aps': '#f59e0b', '24uni': '#10b981', '25uni': '#10b981',
    'curriculum': '#a78bfa',
    'default': '#7c5cfc'
};

function getSubjectColor(name) {
    const n = (name || '').toLowerCase();
    for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
        if (key !== 'default' && n.includes(key)) return color;
    }
    return SUBJECT_COLORS.default;
}

async function fetchAttendance() {
    if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) return;
    const container = document.getElementById('attendance-container');
    if (!container) return;

    try {
        const html = await AUTH.fetchPage(28);
        if (!html) {
            container.innerHTML = '<div class="col-12 text-center py-4"><p class="text-secondary mb-0">Could not load attendance. Please refresh.</p></div>';
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const subjects = [];

        doc.querySelectorAll('.tt-box-new').forEach(box => {
            const nameEl = box.querySelector('.tt-period-number span:first-child');
            const name = nameEl ? nameEl.textContent.trim() : '';
            if (!name) return;

            let delivered = 0, attended = 0, pct = 0;
            box.querySelectorAll('.tt-period-name').forEach(el => {
                const text = el.textContent.trim();
                const match = text.match(/:\s*([\d.]+)/);
                const val = match ? parseFloat(match[1]) : 0;
                if (text.toLowerCase().includes('deliver')) delivered = val;
                else if (text.toLowerCase().includes('attend')) attended = val;
                else if (text.toLowerCase().includes('percent')) pct = val;
            });
            subjects.push({ name, delivered, attended, pct });
        });

        const DOT_COLORS = ['#7c5cfc', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
        let cardsHTML = '';
        subjects.forEach((sub, idx) => {
            const color = DOT_COLORS[idx % DOT_COLORS.length];
            const pct = sub.pct || 0;
            const statusClass = pct >= 80 ? 'bg-success' : pct >= 75 ? 'bg-warning text-dark' : 'bg-danger';
            const statusText = pct >= 80 ? 'Safe' : pct >= 75 ? 'Warning' : 'Low';
            const barColor = pct >= 80 ? 'bg-success' : pct >= 75 ? 'bg-warning' : 'bg-danger';

            cardsHTML += `<div class="col-12 col-md-4">
                <div class="card h-100">
                    <div class="card-body p-4">
                        <h3 class="mb-3 d-flex align-items-center gap-2 text-white" style="font-size: 1rem;">
                            <span class="d-inline-block rounded-circle"
                                style="width: 10px; height: 10px; flex-shrink: 0; background: ${color}"></span>
                            ${sub.name}
                        </h3>
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="mb-0 fs-2 fw-bold text-white">${pct}%</span>
                            <span class="badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="progress rounded-pill" style="height: 8px; background: rgba(255,255,255,0.1);">
                            <div class="progress-bar ${barColor}" style="width: ${Math.round(pct)}%;"></div>
                        </div>
                        <p class="text-secondary small mt-3 mb-0">Total: ${sub.delivered} &middot; Attended: ${sub.attended}</p>
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = cardsHTML;

    } catch (err) {
        container.innerHTML = '<div class="col-12 text-center py-4"><p class="text-secondary mb-0">Failed to load attendance.</p></div>';
    }
}

async function fetchScorecard() {
    if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) return;
    const container = document.getElementById('grades-container');
    if (!container) return;

    try {
        const html = await AUTH.fetchPage(31);
        if (!html) {
            container.innerHTML = '<div class="col-12 text-center py-4"><p class="text-secondary mb-0">Could not load scorecard.</p></div>';
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pageText = doc.body.textContent;

        const studentName = pageText.match(/Name\s*[:.-]?\s*(.+?)\s*Roll/i)?.[1]?.trim();
        const rollNo = pageText.match(/Roll\s*No\.?\s*[:.-]?\s*(\d+)/i)?.[1];
        const fatherName = pageText.match(/Father's Name\s*[:.-]?\s*(.+?)\s*Mother/i)?.[1]?.trim();
        const motherName = pageText.match(/Mother's Name\s*[:.-]?\s*(.+?)\s*(?:Class|$)/i)?.[1]?.trim();

        // Get Mobile and DOB from Profile Page (5)
        const pDoc = new DOMParser().parseFromString(await AUTH.fetchPage(5), 'text/html');
        const getVal = (txt) => [...pDoc.querySelectorAll('.ui-student-title')].find(el => el.textContent.includes(txt))?.nextElementSibling.textContent.replace(':', '').trim();
        const mobile = getVal('Mobile');
        const dob = getVal('D.O.B');

        const subjects = [];
        let sgpa = '', cgpa = '';
        doc.querySelectorAll('table tr').forEach(row => {
            const c = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
            if (row.textContent.includes('SGPA')) {
                const nums = row.textContent.match(/[\d]+\.[\d]+/g);
                if (nums) { sgpa = nums[0]; cgpa = nums[1] || nums[0]; }
            } else if (c.length >= 5 && !isNaN(c[0]) && c[0] !== '') {
                subjects.push({ code: c[1], name: c[2], credits: c[3], grade: c[4] });
            }
        });

        const gradeColor = g => {
            if (g === 'O') return 'var(--cyan)';
            if (g === 'A+') return 'var(--emerald)';
            if (g === 'A') return 'var(--amber)';
            return 'var(--text-secondary)';
        };

        let subjectRows = subjects.map((s, i) => `
            <tr>
                <td class="gc-num">${i + 1}</td>
                <td class="gc-code">${s.code}</td>
                <td class="gc-name">${s.name}</td>
                <td class="gc-credits">${s.credits}</td>
                <td class="gc-grade" style="color: ${gradeColor(s.grade)}">${s.grade}</td>
            </tr>`).join('');

        container.innerHTML = `<div class="col-12">
            <div class="grade-card">
                <!-- Student Info Bar -->
                <div class="gc-info-bar">
                    <div class="gc-info-item">
                        <span class="gc-info-label">Student</span>
                        <span class="gc-info-value">${studentName}</span>
                    </div>
                    <div class="gc-info-item">
                        <span class="gc-info-label">Roll No.</span>
                        <span class="gc-info-value">${rollNo}</span>
                    </div>

                    ${fatherName ? `<div class="gc-info-item">
                        <span class="gc-info-label">Father's Name</span>
                        <span class="gc-info-value">${fatherName}</span>
                    </div>` : ''}
                    ${motherName ? `<div class="gc-info-item">
                        <span class="gc-info-label">Mother's Name</span>
                        <span class="gc-info-value">${motherName}</span>
                    </div>` : ''}
                    ${mobile ? `<div class="gc-info-item">
                        <span class="gc-info-label">Mobile</span>
                        <span class="gc-info-value">${mobile}</span>
                    </div>` : ''}
                    ${dob ? `<div class="gc-info-item">
                        <span class="gc-info-label">DOB</span>
                        <span class="gc-info-value">${dob}</span>
                    </div>` : ''}
                </div>

                <!-- Grade Table -->
                <div class="table-wrap" style="overflow-x:auto;">
                    <table class="grade-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Subject Code</th>
                                <th>Subject Name</th>
                                <th>Credits</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>${subjectRows}</tbody>
                    </table>
                </div>

                <!-- SGPA / CGPA Footer -->
                ${sgpa ? `<div class="gc-footer">
                    <div class="gc-gpa-item">
                        <span class="gc-gpa-label">SGPA</span>
                        <span class="gc-gpa-value">${sgpa}</span>
                    </div>
                    <div class="gc-gpa-item">
                        <span class="gc-gpa-label">CGPA</span>
                        <span class="gc-gpa-value">${cgpa}</span>
                    </div>
                </div>` : ''}
            </div>
        </div>`;

    } catch (err) {
        container.innerHTML = '<div class="col-12 text-center py-4"><p class="text-secondary mb-0">Failed to load scorecard.</p></div>';
    }
}

// ─── TIMETABLE (commonPageId = 85) ───
async function fetchTimetable() {
    if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) return;
    const container = document.getElementById('timetable-container');
    if (!container) return;

    try {
        const html = await AUTH.fetchPage(85);
        if (!html) {
            container.innerHTML = '<div class="text-center py-4"><p class="text-secondary mb-0">Could not load timetable.</p></div>';
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Collect rows from all API tables
        const allTables = doc.querySelectorAll('table');
        if (!allTables.length) { container.innerHTML = html; return; }

        const allRows = [];
        allTables.forEach(t => t.querySelectorAll('tr').forEach(r => allRows.push(r)));
        const dayAbbr = { monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th', friday: 'Fr', saturday: 'Sa' };
        const isCourseCode = t => /\d{2}[A-Z]{2,4}\d{3,4}/i.test(t);

        let headerRow = null;
        const dayRows = [];

        for (const row of allRows) {
            const cells = row.querySelectorAll('td, th');
            if (cells.length > 20 || cells.length < 3) continue;

            if (row.classList.contains('rowheading') || (cells[0]?.querySelector('b') && !headerRow)) {
                headerRow = row;
            } else {
                const firstText = (cells[0]?.textContent?.trim() || '').toLowerCase();
                const matched = Object.keys(dayAbbr).find(d => firstText.startsWith(d.slice(0, 3)));
                if (matched) {
                    const dayKey = dayAbbr[matched];
                    const existing = dayRows.find(d => d.day === dayKey);
                    if (existing) {
                        const existCells = existing.row.querySelectorAll('td, th');
                        cells.forEach((cell, ci) => {
                            if (ci === 0 || ci >= existCells.length) return;
                            const text = cell.textContent.trim();
                            const existText = existCells[ci]?.textContent?.trim() || '';
                            if (text.length >= 2 && (existText.length < 2 || (isCourseCode(text) && !isCourseCode(existText)))) {
                                existCells[ci].innerHTML = cell.innerHTML;
                                Array.from(cell.attributes).forEach(a => existCells[ci].setAttribute(a.name, a.value));
                            }
                        });
                    } else {
                        dayRows.push({ row, day: dayKey });
                    }
                }
            }
        }
        if (!headerRow || !dayRows.length) { container.innerHTML = html; return; }

        // Count used columns
        let maxDataCols = 0;
        dayRows.forEach(({ row }) => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach((cell, i) => {
                if (i > 0 && cell.textContent.trim().length >= 2) maxDataCols = Math.max(maxDataCols, i);
            });
        });

        let tableHTML = '<table class="timetable"><thead><tr><th class="tt-day-header"></th>';
        const headerCells = headerRow.querySelectorAll('td, th');
        const headerLimit = Math.min(headerCells.length, maxDataCols + 1);
        for (let i = 1; i < headerLimit; i++) {
            const cell = headerCells[i];
            if (!cell) continue;
            const rawHTML = cell.innerHTML.replace(/<br\s*\/?>/gi, '\n');
            const tmp = document.createElement('div');
            tmp.innerHTML = rawHTML;
            const lines = tmp.textContent.split('\n').map(l => l.trim()).filter(Boolean);

            const text = cell.textContent.trim().toLowerCase();
            if (text.includes('break')) {
                tableHTML += '<th class="tt-period-header tt-break-header"><span class="tt-period-num">Break</span></th>';
            } else {
                const num = lines[0] || (i);
                const startTime = lines[1] || '';
                const endTime = lines[2] || '';
                const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : startTime;
                tableHTML += `<th class="tt-period-header">
                    <span class="tt-period-num">${num}</span>
                    ${timeStr ? `<span class="tt-period-time">${timeStr}</span>` : ''}
                </th>`;
            }
        }
        tableHTML += '</tr></thead><tbody>';

        // Build day rows
        dayRows.forEach(({ row, day }) => {
            tableHTML += `<tr><td class="tt-day-cell">${day}</td>`;
            const cells = row.querySelectorAll('td, th');

            cells.forEach((cell, i) => {
                if (i === 0) return; // skip day name
                if (i >= headerLimit) return; // skip trailing empty columns
                const colspan = parseInt(cell.getAttribute('colspan')) || 1;
                const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
                const text = cell.textContent.trim();

                let attrs = '';
                if (colspan > 1) attrs += ` colspan="${colspan}"`;
                if (rowspan > 1) attrs += ` rowspan="${rowspan}"`;

                if (!text || text.length < 2) {
                    tableHTML += `<td${attrs} class="tt-empty-cell"></td>`;
                } else if (text.toLowerCase().includes('break')) {
                    tableHTML += `<td${attrs} class="tt-break-cell"><span class="tt-break-text">B<br>R<br>E<br>A<br>K</span></td>`;
                } else {
                    const color = getSubjectColor(text);

                    const spanEl = cell.querySelector('span[title]');
                    const subject = spanEl ? spanEl.textContent.trim() : '';

                    const rawHTML = cell.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                    const tmp = document.createElement('div');
                    tmp.innerHTML = rawHTML;
                    const lines = tmp.textContent.split('\n').map(l => l.trim()).filter(Boolean);

                    const subjectName = subject || lines[0] || text;
                    const details = lines.filter(l => l !== subjectName).join(' · ').replace(/[()]/g, '').trim();

                    tableHTML += `<td${attrs} class="tt-class-cell" style="--subj-color: ${color}">
                        <span class="tt-subject">${subjectName}</span>
                        ${details ? `<span class="tt-details">${details}</span>` : ''}
                    </td>`;
                }
            });

            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    } catch (err) {
        container.innerHTML = '<div class="text-center py-4"><p class="text-secondary mb-0">Failed to load timetable.</p></div>';
    }
}

// Load all data on page load
if (typeof AUTH !== 'undefined' && AUTH.isLoggedIn()) {
    fetchAttendance();
    fetchScorecard();
    fetchTimetable();
}
