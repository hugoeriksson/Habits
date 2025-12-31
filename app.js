// --- CONFIGURATION ---
const SUPABASE_URL = 'https://rizzzisqxifemunpffsq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpenp6aXNxeGlmZW11bnBmZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4NzMsImV4cCI6MjA4MjY4Njg3M30.5HaAOLhIoF9qT-bgwushnGt4ymGDE6atYVorsbgFNQw';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- STATE ---
let user = null;
let habits = [];
let isSignUp = false;
let activeDayIndex = (new Date().getDay() + 6) % 7;

// Local Storage Wrappers
const getLocal = (k) => JSON.parse(localStorage.getItem(k)) || {};
const setLocal = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let localSchedule = getLocal('focus_schedule_days');
let localLogs = getLocal('focus_logs'); // Notes & Images
let localHistory = getLocal('focus_history'); // Completion History { "YYYY-MM-DD_habitId": true }

// --- STREAK CALCULATION ---
function calculateStreak(habitId) {
    let streak = 0;
    const today = new Date();

    // Check backwards from today
    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const key = `${dateStr}_${habitId}`;

        if (localHistory[key]) {
            streak++;
        } else if (i > 0) {
            // Allow today to be incomplete but break on any other missed day
            break;
        }
    }
    return streak;
}

// --- PROGRESS BAR ---
function updateProgressBar() {
    const today = new Date();
    const todayDayIndex = (today.getDay() + 6) % 7;

    // Get habits scheduled for today
    const todaysHabits = habits.filter(h => {
        const schedule = localSchedule[h.id];
        return !schedule || schedule.includes(todayDayIndex);
    });

    const total = todaysHabits.length;
    const completed = todaysHabits.filter(h => h.is_completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('progress-percent').textContent = `${percent}%`;
    document.getElementById('progress-fill').style.width = `${percent}%`;

    // Hide progress container if no habits
    document.getElementById('progress-container').style.display = total > 0 ? 'block' : 'none';
}

// --- DOM ---
const ui = {
    authScreen: document.getElementById('auth-screen'),
    appScreen: document.getElementById('app-screen'),
    email: document.getElementById('email'), pass: document.getElementById('password'),
    authError: document.getElementById('auth-error'), authBtn: document.querySelector('#auth-screen button.primary'),
    authToggle: document.getElementById('auth-toggle-text'), dateDisplay: document.getElementById('current-date-display'),
    daySelect: document.getElementById('day-override'), list: document.getElementById('habit-list'),
    newInput: document.getElementById('new-habit-text'), dayToggles: document.getElementById('day-toggles'),
    statsModal: document.getElementById('stats-modal'), statsContent: document.getElementById('stats-content')
};

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    setupDate();
    setupAddButtons();
    checkSession();
});

function setupDate() {
    const today = new Date();
    ui.dateDisplay.textContent = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    activeDayIndex = (today.getDay() + 6) % 7;
    ui.daySelect.value = activeDayIndex;
}

function changeDayMode() {
    activeDayIndex = parseInt(ui.daySelect.value);
    renderList();
}

function setupAddButtons() {
    ui.dayToggles.querySelectorAll('.day-btn').forEach(btn => btn.onclick = () => btn.classList.toggle('selected'));
}

// --- AUTH ---
async function checkSession() {
    const { data } = await sb.auth.getSession();
    if (data.session) { user = data.session.user; showApp(); }
}

async function handleAuth() {
    const email = ui.email.value, password = ui.pass.value;
    ui.authError.style.display = 'none'; ui.authBtn.textContent = 'Processing...';

    let error;
    if (isSignUp) {
        const res = await sb.auth.signUp({ email, password });
        error = res.error;
        if (!error && res.data.user && !res.data.session) alert('Check email for confirmation link!');
    } else {
        const res = await sb.auth.signInWithPassword({ email, password });
        error = res.error;
    }

    if (error) {
        ui.authError.textContent = error.message; ui.authError.style.display = 'block';
        ui.authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
}

sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') { user = session.user; showApp(); }
    else if (event === 'SIGNED_OUT') { user = null; showAuth(); }
});

function toggleAuthMode() {
    isSignUp = !isSignUp; ui.authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    ui.authToggle.textContent = isSignUp ? 'Have an account? Sign In' : 'Need an account? Sign Up';
}

async function signOut() { await sb.auth.signOut(); }
function showApp() { ui.authScreen.classList.remove('visible'); ui.appScreen.classList.add('visible'); loadHabits(); }
function showAuth() { ui.appScreen.classList.remove('visible'); ui.authScreen.classList.add('visible'); }

// --- HABITS ---
async function loadHabits() {
    ui.list.innerHTML = '<div style="text-align:center; opacity:0.7">Loading...</div>';
    const { data } = await sb.from('habits').select('*').eq('user_id', user.id).order('id', { ascending: true });
    if (data) { habits = data; renderList(); }
}

async function addHabit() {
    const title = ui.newInput.value.trim();
    const selectedDays = [];
    ui.dayToggles.querySelectorAll('.day-btn.selected').forEach(btn => selectedDays.push(parseInt(btn.dataset.day)));

    if (!title || selectedDays.length === 0) return alert("Enter name and select days.");

    const { data } = await sb.from('habits').insert([{ title, user_id: user.id }]).select().single();
    if (data) {
        localSchedule[data.id] = selectedDays;
        setLocal('focus_schedule_days', localSchedule);
        habits.push(data);
        ui.newInput.value = '';
        ui.dayToggles.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
        renderList();
    }
}

async function toggleCheck(id, currentStatus) {
    const newStatus = !currentStatus;
    const idx = habits.findIndex(h => h.id === id);
    if (idx > -1) habits[idx].is_completed = newStatus;

    // 1. Render UI immediately
    renderList();

    // 2. Save Historical Data locally (So we can see it in stats)
    // We construct a key based on TODAY's date, not the override date, 
    // to ensure history is accurate to when you actually clicked it.
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `${todayStr}_${id}`;

    if (newStatus) {
        localHistory[key] = true;
    } else {
        delete localHistory[key];
    }
    setLocal('focus_history', localHistory);

    // 3. Sync Current Status to DB
    await sb.from('habits').update({ is_completed: newStatus }).eq('id', id);
}

// --- RENDER LIST ---
function renderList() {
    ui.list.innerHTML = '';
    const visibleHabits = habits.filter(h => {
        const schedule = localSchedule[h.id];
        return !schedule || schedule.includes(activeDayIndex);
    });

    if (visibleHabits.length === 0) {
        ui.list.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-secondary)">No routines for this day.</div>`;
        updateProgressBar();
        return;
    }

    visibleHabits.forEach(h => ui.list.appendChild(createHabitElement(h)));
    updateProgressBar();
}

function createHabitElement(habit) {
    const todayStr = new Date().toISOString().split('T')[0];
    const key = `${todayStr}_${habit.id}`;

    const logData = localLogs[key] || { note: '', image: null };
    const hasNote = logData.note && logData.note.trim().length > 0;
    const hasPhoto = logData.image;
    const hasEvidence = hasNote || hasPhoto;

    // Calculate streak
    const streak = calculateStreak(habit.id);
    const streakHTML = streak >= 2 ? `
        <span class="streak-badge">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.03 0-6-1.68-6-6 0-2.12 1.2-4.17 2.4-5.83l1.2-1.47c0-.36.1-.91.1-1.4 0-1-.3-2.4-.3-3.6 0-1.1.4-2.2 1.1-3.1.3-.4.9-.5 1.3-.2.3.3.5.8.3 1.2-.5 1.5-.1 3.1 1 4.2.9.9 2.3 1.5 3.7 1.5 1.4.1 2.3.5 3.2 1.3.8.8 1.1 1.7 1.1 2.7 0 .8-.2 1.5-.5 2.2C19.5 18.1 16.84 23 12 23z"/></svg>
            ${streak} day streak
        </span>
    ` : '';

    const div = document.createElement('div');
    div.className = `habit-card ${habit.is_completed ? 'done' : ''}`;

    div.innerHTML = `
        <div class="habit-header">
            <div class="habit-main" onclick="toggleCheck(${habit.id}, ${habit.is_completed})">
                <div class="checkbox">
                    ${habit.is_completed ? '<svg width="16" height="16" stroke="white" stroke-width="3" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>' : ''}
                </div>
                <span class="habit-title">${habit.title}</span>
                ${streakHTML}
            </div>
            <div class="log-indicator" title="Note: ${hasNote ? 'Yes' : 'No'} | Photo: ${hasPhoto ? 'Yes' : 'No'}">
                <span class="log-dot note ${hasNote ? 'active' : ''}" title="Note"></span>
                <span class="log-dot photo ${hasPhoto ? 'active' : ''}" title="Photo"></span>
            </div>
            <button class="action-btn ${hasEvidence ? 'active' : ''}" onclick="toggleDetails(this)">
                <span>${hasEvidence ? 'View' : 'Log'}</span>
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
            </button>
        </div>
        <div class="habit-details ${hasEvidence ? 'open' : ''}">
            <label class="detail-label">Note / Alternative Activity:</label>
            <textarea class="detail-textarea" rows="2" placeholder="Did you do something else?" onchange="saveLog('${key}', 'note', this.value)">${logData.note}</textarea>
            
            <label class="detail-label">Evidence (Photo):</label>
            <div class="upload-box" onclick="document.getElementById('file-${key}').click()">
                <span style="font-size:0.8rem; color:var(--text-secondary)">Click to Upload Image</span>
                <input type="file" id="file-${key}" hidden accept="image/*" onchange="handleImage('${key}', this)">
                <img src="${logData.image || ''}" class="preview-img ${logData.image ? 'visible' : ''}" id="img-${key}">
            </div>

            <button class="delete-btn" onclick="deleteHabit(${habit.id})">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Delete Routine Permanently
            </button>
        </div>
    `;
    return div;
}

async function deleteHabit(id) {
    // 1. Double Confirmation
    const confirmed = confirm("⚠️ Are you sure you want to delete this routine?\n\nThis will remove it from your schedule and delete it from your history permanently.");
    if (!confirmed) return;

    // 2. Optimistic UI Removal
    habits = habits.filter(h => h.id !== id);
    renderList();

    // 3. Remove from Local Storage (Cleanup)
    if (localSchedule[id]) {
        delete localSchedule[id];
        setLocal('focus_schedule_days', localSchedule);
    }

    // 4. Remove from Supabase
    const { error } = await sb.from('habits').delete().eq('id', id);

    if (error) {
        alert("Error deleting from database. Please refresh.");
        loadHabits(); // Revert UI if failed
    }
}

// --- LOGGING ---
function toggleDetails(btn) {
    const details = btn.parentElement.nextElementSibling;
    details.classList.toggle('open');
}

function handleImage(key, input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById(`img-${key}`).src = e.target.result;
            document.getElementById(`img-${key}`).classList.add('visible');
            saveLog(key, 'image', e.target.result);
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function saveLog(key, field, value) {
    if (!localLogs[key]) localLogs[key] = { note: '', image: null };
    localLogs[key][field] = value;
    try { setLocal('focus_logs', localLogs); } catch (e) { alert("Storage full"); }
}

// --- STATS & EXPORT ---
function openStats() {
    ui.statsModal.classList.add('active');
    switchTab('week'); // Default view
}

function closeStats() {
    ui.statsModal.classList.remove('active');
}

function switchTab(view) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${view}`).classList.add('active');
    renderCalendar(view);
}

function renderCalendar(view) {
    ui.statsContent.innerHTML = '';
    const today = new Date();

    // Calculate summary stats
    const totalCompletions = Object.keys(localHistory).length;
    const bestStreak = habits.reduce((max, h) => Math.max(max, calculateStreak(h.id)), 0);
    const activeDays = new Set(Object.keys(localHistory).map(k => k.split('_')[0])).size;

    // Summary boxes at top
    let summaryHTML = `
        <div class="stat-summary">
            <div class="stat-box">
                <div class="stat-value">${totalCompletions}</div>
                <div class="stat-label">Total Done</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${bestStreak}</div>
                <div class="stat-label">Best Streak</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${activeDays}</div>
                <div class="stat-label">Active Days</div>
            </div>
        </div>
    `;

    // WEEK VIEW
    if (view === 'week') {
        let html = summaryHTML + '<div class="calendar-grid">';
        // Headers
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => html += `<div class="cal-day header">${d}</div>`);

        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayCount = countActivity(dateStr);
            const hasActivity = dayCount > 0;

            html += `<div class="cal-day ${hasActivity ? 'active' : ''}" title="${dayCount} completed">
                ${d.getDate()}
                ${dayCount > 0 ? `<span style="font-size:0.6rem; display:block;">${dayCount}✓</span>` : ''}
            </div>`;
        }
        html += '</div><p style="text-align:center; font-size:0.8rem; color:var(--text-secondary)">Past 7 Days Activity</p>';
        ui.statsContent.innerHTML = html;
    }

    // MONTH VIEW
    if (view === 'month') {
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let html = summaryHTML + `<h4 style="text-align:center; margin-bottom:10px;">${today.toLocaleString('default', { month: 'long' })}</h4>`;
        html += '<div class="calendar-grid">';

        // Empty slots for start of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            html += '<div class="cal-day"></div>';
        }

        // Days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayCount = countActivity(dateStr);
            const hasActivity = dayCount > 0;
            html += `<div class="cal-day ${hasActivity ? 'active' : ''}" title="${dayCount} completed">${i}</div>`;
        }
        html += '</div>';
        ui.statsContent.innerHTML = html;
    }

    // YEAR VIEW (Heatmap style)
    if (view === 'year') {
        let html = summaryHTML + '<div class="heatmap-grid">';
        // Visualize 12 months as simple colored blocks for density
        // For a simple implementation, we just show total completion count per month
        for (let m = 0; m < 12; m++) {
            const monthName = new Date(2024, m).toLocaleString('default', { month: 'short' });
            // Count completions in this month
            let count = 0;
            Object.keys(localHistory).forEach(k => {
                if (k.startsWith(`${today.getFullYear()}-${String(m + 1).padStart(2, '0')}`)) count++;
            });

            // Calculate opacity based on activity (max 30 for visualization cap)
            const opacity = Math.min(count / 10, 1);
            const color = count > 0 ? `rgba(16, 185, 129, ${opacity || 0.1})` : 'rgba(255,255,255,0.05)';

            html += `<div style="text-align:center; font-size:0.7rem;">
                <div style="aspect-ratio:1; background:${color}; border-radius:4px; margin-bottom:4px; display:flex; align-items:center; justify-content:center; font-weight:600;">${count > 0 ? count : ''}</div>
                ${monthName}
            </div>`;
        }
        html += '</div><p style="text-align:center; margin-top:10px; font-size:0.8rem; color:var(--text-secondary)">Monthly Activity Density</p>';
        ui.statsContent.innerHTML = html;
    }
}

function countActivity(dateStr) {
    // Count how many habits were done on this date
    return Object.keys(localHistory).filter(key => key.startsWith(dateStr)).length;
}

function checkActivity(dateStr) {
    // Check if ANY habit was done on this date
    // localHistory keys are "YYYY-MM-DD_habitId"
    return Object.keys(localHistory).some(key => key.startsWith(dateStr));
}

function exportData() {
    const data = {
        exportedAt: new Date(),
        habits: habits,
        schedules: localSchedule,
        history: localHistory,
        logs: localLogs
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "focus_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}