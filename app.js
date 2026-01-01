// --- CONFIGURATION ---
const SUPABASE_URL = 'https://rizzzisqxifemunpffsq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpenp6aXNxeGlmZW11bnBmZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4NzMsImV4cCI6MjA4MjY4Njg3M30.5HaAOLhIoF9qT-bgwushnGt4ymGDE6atYVorsbgFNQw';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- STATE ---
let user = null;
let isSignUp = false;
let activeDayIndex = (new Date().getDay() + 6) % 7;
let currentView = 'checkin';

// Today's data
let todayStr = new Date().toISOString().split('T')[0];
let waterCount = 0;
let pomodoros = [];
let meals = [];
let checkinData = null;

// Helper to get Monday of current week
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// Weekly planning state
let weeklyTasks = [];
let planDayIndex = (new Date().getDay() + 6) % 7; // Default to today
let currentWeekStart = getWeekStart(new Date());

// Meal planning state
let mealPlans = [];
let mealPlanDayIndex = (new Date().getDay() + 6) % 7;

// Local Storage Wrappers
const getLocal = (k) => JSON.parse(localStorage.getItem(k)) || {};
const setLocal = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// Load local history
let localHistory = getLocal('focus_history');

// Winddown routine items (configurable)
const winddownItems = [
    '20:00 no screens, dim lights',
    'Light reading',
    'Brush teeth + Wash face',
    'Meditation',
    'Stretching'
];

// Task details for info modals
const taskDetails = {
    'interval_training': {
        title: 'Interval Training',
        content: `
            <h4>Warm-up (5 min)</h4>
            <p>Light jog, dynamic stretches, arm circles</p>
            <h4>Main Set (20 min)</h4>
            <ul>
                <li>30s sprint / 30s rest × 10</li>
                <li>1 min recovery walk</li>
                <li>30s sprint / 30s rest × 10</li>
            </ul>
            <h4>Cool-down (5 min)</h4>
            <p>Walking, static stretches, deep breathing</p>
        `
    },
    'cold_shower': {
        title: 'Cold Shower Protocol',
        content: `
            <p>Start with warm water, gradually decrease temperature.</p>
            <ul>
                <li>Final 2-3 minutes: cold water</li>
                <li>Focus on controlled breathing</li>
                <li>Target: full body exposure</li>
            </ul>
        `
    },
    'breakfast': {
        title: 'Breakfast Guidelines',
        content: `
            <p><strong>Macro targets:</strong></p>
            <ul>
                <li>Protein: 30g</li>
                <li>Carbs: 50g</li>
                <li>Fats: 15g</li>
            </ul>
            <p><strong>Options:</strong></p>
            <ul>
                <li>Oatmeal + eggs + fruit</li>
                <li>Greek yogurt parfait with nuts</li>
                <li>Protein smoothie with banana</li>
            </ul>
        `
    }
};

// --- DOM ---
const ui = {
    authScreen: document.getElementById('auth-screen'),
    appScreen: document.getElementById('app-screen'),
    email: document.getElementById('email'),
    pass: document.getElementById('password'),
    authError: document.getElementById('auth-error'),
    authBtn: document.querySelector('#auth-screen button.primary'),
    authToggle: document.getElementById('auth-toggle-text'),
    dateDisplay: document.getElementById('current-date-display'),
    daySelect: document.getElementById('day-override'),
    morningList: document.getElementById('morning-list'),
    pomoList: document.getElementById('pomodoro-list'),
    mealsList: document.getElementById('meals-list'),
    statsModal: document.getElementById('stats-modal'),
    statsContent: document.getElementById('stats-content'),
    infoModal: document.getElementById('task-info-modal'),
    winddownList: document.getElementById('winddown-list')
};

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    todayStr = new Date().toISOString().split('T')[0];
    setupDate();
    setupMoodSlider();
    setupMealUpload();
    checkSession();
});

function setupDate() {
    const today = new Date();
    if (ui.dateDisplay) {
        ui.dateDisplay.textContent = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    activeDayIndex = (today.getDay() + 6) % 7;
    if (ui.daySelect) {
        ui.daySelect.value = activeDayIndex;
    }
}

function setupMoodSlider() {
    const moodSlider = document.getElementById('mood-input');
    const moodValue = document.getElementById('mood-value');
    if (moodSlider && moodValue) {
        moodSlider.oninput = () => {
            moodValue.textContent = moodSlider.value;
        };
    }
}

function setupMealUpload() {
    const uploadBox = document.getElementById('meal-upload-box');
    const fileInput = document.getElementById('meal-photo');
    const preview = document.getElementById('meal-preview');

    if (uploadBox && fileInput) {
        uploadBox.onclick = () => fileInput.click();
        fileInput.onchange = function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    preview.classList.add('visible');
                };
                reader.readAsDataURL(this.files[0]);
            }
        };
    }
}

function changeDayMode() {
    activeDayIndex = parseInt(ui.daySelect.value);
    renderMorningList();
}

// --- VIEW SWITCHING ---
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`view-${view}`)?.classList.add('active');
    document.querySelector(`.nav-btn[data-view="${view}"]`)?.classList.add('active');

    // Load data for each view
    if (view === 'checkin') loadCheckinView();
    if (view === 'morning') renderMorningList();
    if (view === 'work') renderPomodoros();
    if (view === 'meals') renderMealsView();
    if (view === 'plan') renderPlanView();
    if (view === 'recipes') renderMealPlanView();
}

// --- AUTH ---
async function checkSession() {
    const { data } = await sb.auth.getSession();
    if (data.session) {
        user = data.session.user;
        showApp();
    }
}

async function handleAuth() {
    const email = ui.email.value, password = ui.pass.value;
    ui.authError.style.display = 'none';
    ui.authBtn.textContent = 'Processing...';

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
        ui.authError.textContent = error.message;
        ui.authError.style.display = 'block';
        ui.authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
}

sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') { user = session.user; showApp(); }
    else if (event === 'SIGNED_OUT') { user = null; showAuth(); }
});

function toggleAuthMode() {
    isSignUp = !isSignUp;
    ui.authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    ui.authToggle.textContent = isSignUp ? 'Have an account? Sign In' : 'Need an account? Sign Up';
}

async function signOut() { await sb.auth.signOut(); }
function showApp() {
    ui.authScreen.classList.remove('visible');
    ui.appScreen.classList.add('visible');
    loadAllData();
}
function showAuth() {
    ui.appScreen.classList.remove('visible');
    ui.authScreen.classList.add('visible');
}

// --- DATA LOADING ---
async function loadAllData() {
    await Promise.all([
        loadTodayCheckin(),
        loadTodayPomodoros(),
        loadTodayMeals(),
        loadTodayWater(),
        loadWeeklyTasks(),
        loadMealPlans()
    ]);
    loadCheckinView();
}

// --- CHECK-IN VIEW ---
function loadCheckinView() {
    renderWinddownList();
    loadExistingCheckinData();
}

function renderWinddownList() {
    if (!ui.winddownList) return;
    ui.winddownList.innerHTML = '';

    const template = document.getElementById('winddown-item-template');
    winddownItems.forEach((item, idx) => {
        const clone = template.content.cloneNode(true);
        clone.querySelector('.winddown-title').textContent = item;
        const checkbox = clone.querySelector('.winddown-check');
        checkbox.dataset.index = idx;

        // Check if already checked from today's checkin
        if (checkinData && checkinData.winddown_completed) {
            checkbox.checked = checkinData.winddown_completed[idx] || false;
        }

        ui.winddownList.appendChild(clone);
    });
}

async function loadExistingCheckinData() {
    const { data } = await sb.from('daily_checkins').select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .single();

    if (data) {
        checkinData = data;
        // Populate form with existing data
        if (data.mood) document.getElementById('mood-input').value = data.mood;
        document.getElementById('mood-value').textContent = data.mood || 5;
        if (data.sleep_score) document.getElementById('sleep-score').value = data.sleep_score;
        if (data.sleep_start) document.getElementById('sleep-start').value = data.sleep_start;
        if (data.sleep_end) document.getElementById('sleep-end').value = data.sleep_end;
        if (data.deep_sleep_mins) {
            document.getElementById('deep-hours').value = Math.floor(data.deep_sleep_mins / 60);
            document.getElementById('deep-mins').value = data.deep_sleep_mins % 60;
        }
        if (data.rem_sleep_mins) {
            document.getElementById('rem-hours').value = Math.floor(data.rem_sleep_mins / 60);
            document.getElementById('rem-mins').value = data.rem_sleep_mins % 60;
        }
        if (data.light_sleep_mins) {
            document.getElementById('light-hours').value = Math.floor(data.light_sleep_mins / 60);
            document.getElementById('light-mins').value = data.light_sleep_mins % 60;
        }
        if (data.awake_mins) {
            document.getElementById('awake-hours').value = Math.floor(data.awake_mins / 60);
            document.getElementById('awake-mins').value = data.awake_mins % 60;
        }
    }
}

async function saveCheckin() {
    const mood = parseInt(document.getElementById('mood-input').value);
    const sleepScore = parseInt(document.getElementById('sleep-score').value) || null;
    const sleepStart = document.getElementById('sleep-start').value || null;
    const sleepEnd = document.getElementById('sleep-end').value || null;

    const deepH = parseInt(document.getElementById('deep-hours').value) || 0;
    const deepM = parseInt(document.getElementById('deep-mins').value) || 0;
    const remH = parseInt(document.getElementById('rem-hours').value) || 0;
    const remM = parseInt(document.getElementById('rem-mins').value) || 0;
    const lightH = parseInt(document.getElementById('light-hours').value) || 0;
    const lightM = parseInt(document.getElementById('light-mins').value) || 0;
    const awakeH = parseInt(document.getElementById('awake-hours').value) || 0;
    const awakeM = parseInt(document.getElementById('awake-mins').value) || 0;

    // Gather winddown checkboxes
    const winddownCompleted = {};
    ui.winddownList.querySelectorAll('.winddown-check').forEach(cb => {
        winddownCompleted[cb.dataset.index] = cb.checked;
    });

    const checkinRecord = {
        user_id: user.id,
        date: todayStr,
        mood,
        sleep_score: sleepScore,
        sleep_start: sleepStart,
        sleep_end: sleepEnd,
        deep_sleep_mins: deepH * 60 + deepM,
        rem_sleep_mins: remH * 60 + remM,
        light_sleep_mins: lightH * 60 + lightM,
        awake_mins: awakeH * 60 + awakeM,
        winddown_completed: winddownCompleted
    };

    const { error } = await sb.from('daily_checkins').upsert(checkinRecord, { onConflict: 'user_id,date' });

    if (error) {
        console.error('Error saving check-in:', error);
        alert('Error saving check-in. Check console for details.');
    } else {
        checkinData = checkinRecord;
        switchView('morning');
    }
}

// Morning routine items (hardcoded with schedule)
// Days: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
const morningItems = [
    { title: 'Wake up (6:30)', days: [0, 1, 2, 3, 4, 5, 6] },
    { title: 'Light Therapy (6:35-6:55)', days: [0, 1, 2, 3, 4, 5, 6] },

    // --- WORKOUTS (All days except Tue) ---
    { title: 'Workout A: 4x4 Intervals + Shower (6:55-8:00)', days: [0] },      // Mon
    { title: 'Workout C: Calisthenics + Shower (6:55-8:00)', days: [2, 4] },    // Wed, Fri
    { title: 'Workout B: Zone 2 Run + Shower (6:55-8:00)', days: [3, 5] },      // Thu, Sat
    { title: 'Active Recovery: Zone 2 Cardio + Shower (6:55-8:00)', days: [6] }, // Sun

    // --- TUESDAY ROUTINE (Rest Day) ---
    { title: 'Breakfast (6:55-7:20)', days: [1] },
    { title: 'Wash face + brush teeth (7:20-7:25)', days: [1] },

    // --- STANDARD ROUTINE (All days except Tue) ---
    { title: 'Breakfast (8:00-8:20)', days: [0, 2, 3, 4, 5, 6] },
    { title: 'Brush teeth (8:20-8:25)', days: [0, 2, 3, 4, 5, 6] }
];

// --- MORNING ROUTINE ---

function renderMorningList() {
    if (!ui.morningList) return;
    ui.morningList.innerHTML = '';

    // Filter tasks for the active day
    const visibleItems = morningItems.filter(item => item.days.includes(activeDayIndex));

    if (visibleItems.length === 0) {
        ui.morningList.innerHTML = '<div class="empty-state">No tasks scheduled for today. Enjoy!</div>';
        updateMorningProgress(0, 0);
        return;
    }

    const template = document.getElementById('habit-card-template');
    const todayKey = todayStr;

    visibleItems.forEach((item) => {
        const title = item.title;
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.habit-card');

        // Use slug for ID
        const id = title.toLowerCase().replace(/\s+/g, '_');
        const key = `${todayKey}_morning_${id}`;
        const isCompleted = localHistory[key] || false;

        if (isCompleted) card.classList.add('done');

        // Title and checkbox
        clone.querySelector('.habit-title').textContent = title;
        if (isCompleted) clone.querySelector('.check-icon').style.display = 'block';

        // Click to toggle
        clone.querySelector('.habit-main').onclick = () => toggleMorningTask(id, isCompleted);

        // Info button
        const infoBtn = clone.querySelector('.info-btn');
        // Check for predefined task details
        if (taskDetails[id]) {
            infoBtn.style.display = 'flex';
            infoBtn.onclick = (e) => {
                e.stopPropagation();
                showTaskInfo(taskDetails[id].title, taskDetails[id].content);
            };
        }

        // Streak calculation
        const streak = calculateStreak(`morning_${id}`);
        if (streak >= 2) {
            const streakTmpl = document.getElementById('streak-badge-template');
            const streakEl = streakTmpl.content.cloneNode(true);
            streakEl.querySelector('.streak-text').textContent = `${streak} day streak`;
            clone.querySelector('.streak-container').appendChild(streakEl);
        }

        ui.morningList.appendChild(card);
    });

    const completed = visibleItems.filter(item => {
        const id = item.title.toLowerCase().replace(/\s+/g, '_');
        return localHistory[`${todayKey}_morning_${id}`];
    }).length;

    updateMorningProgress(completed, visibleItems.length);
}

function toggleMorningTask(id, currentStatus) {
    const key = `${todayStr}_morning_${id}`;
    if (currentStatus) {
        delete localHistory[key];
    } else {
        localHistory[key] = true;
    }
    setLocal('focus_history', localHistory);
    renderMorningList();
}

function updateMorningProgress(completed, total) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const percentEl = document.getElementById('morning-progress-percent');
    const fillEl = document.getElementById('morning-progress-fill');
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
}

// --- POMODORO ---
async function loadTodayPomodoros() {
    const { data } = await sb.from('pomodoros').select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .order('time', { ascending: true });

    if (data) pomodoros = data;
    renderPomodoros();
}

function renderPomodoros() {
    if (!ui.pomoList) return;
    ui.pomoList.innerHTML = '';

    if (pomodoros.length === 0) {
        ui.pomoList.innerHTML = '<div class="empty-state">No pomodoros logged today. Start logging below!</div>';
    } else {
        const template = document.getElementById('pomodoro-card-template');
        pomodoros.forEach(pomo => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.pomo-time-display').textContent = pomo.time || '--:--';
            clone.querySelector('.pomo-tag-badge').textContent = pomo.tag;
            clone.querySelector('.pomo-notes').textContent = pomo.notes || '';
            clone.querySelector('.delete-pomo-btn').onclick = () => deletePomodoro(pomo.id);
            ui.pomoList.appendChild(clone);
        });
    }

    updatePomoProgress();
}

function updatePomoProgress() {
    const count = pomodoros.length;
    const target = 16; // Typical full work day in 30-min blocks
    const countEl = document.getElementById('pomodoro-count');
    const fillEl = document.getElementById('work-progress-fill');
    if (countEl) countEl.textContent = `${count}/${target}`;
    if (fillEl) fillEl.style.width = `${Math.min((count / target) * 100, 100)}%`;
}

async function addPomodoro() {
    const time = document.getElementById('pomo-time').value;
    const tag = document.getElementById('pomo-tag').value;
    const notes = document.getElementById('pomo-notes').value.trim();

    if (!time) return alert('Please enter a time for this pomodoro.');

    const { data, error } = await sb.from('pomodoros').insert([{
        user_id: user.id,
        date: todayStr,
        time,
        tag,
        notes: notes || null
    }]).select().single();

    if (data) {
        pomodoros.push(data);
        document.getElementById('pomo-time').value = '';
        document.getElementById('pomo-notes').value = '';
        renderPomodoros();
    } else if (error) {
        console.error('Error adding pomodoro:', error);
        alert('Error adding pomodoro');
    }
}

async function deletePomodoro(id) {
    const { error } = await sb.from('pomodoros').delete().eq('id', id);
    if (!error) {
        pomodoros = pomodoros.filter(p => p.id !== id);
        renderPomodoros();
    }
}

// --- MEALS & WATER ---
async function loadTodayMeals() {
    const { data } = await sb.from('meals').select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .order('time', { ascending: true });

    if (data) meals = data;
    renderMeals();
}

async function loadTodayWater() {
    const { data } = await sb.from('water_logs').select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .single();

    if (data) waterCount = data.count || 0;
    renderWaterCount();
}

function renderMealsView() {
    renderMeals();
    renderWaterCount();
}

function renderMeals() {
    if (!ui.mealsList) return;
    ui.mealsList.innerHTML = '';

    if (meals.length === 0) {
        ui.mealsList.innerHTML = '<div class="empty-state">No meals logged today.</div>';
        return;
    }

    const template = document.getElementById('meal-card-template');
    meals.forEach(meal => {
        const clone = template.content.cloneNode(true);
        clone.querySelector('.meal-type-badge').textContent = meal.meal_type;
        clone.querySelector('.meal-time-display').textContent = meal.time || '';
        clone.querySelector('.meal-description').textContent = meal.description || '';

        if (meal.photo) {
            const photo = clone.querySelector('.meal-photo');
            photo.src = meal.photo;
            photo.style.display = 'block';
        }

        clone.querySelector('.delete-meal-btn').onclick = () => deleteMeal(meal.id);
        ui.mealsList.appendChild(clone);
    });
}

function renderWaterCount() {
    const countEl = document.getElementById('water-count');
    const barEl = document.getElementById('water-bar');
    const target = 8;

    if (countEl) countEl.textContent = waterCount;
    if (barEl) barEl.style.width = `${Math.min((waterCount / target) * 100, 100)}%`;
}

async function addWater() {
    waterCount++;
    renderWaterCount();

    // Upsert to database
    const { error } = await sb.from('water_logs').upsert({
        user_id: user.id,
        date: todayStr,
        count: waterCount
    }, { onConflict: 'user_id,date' });

    if (error) {
        console.error('Error saving water count:', error);
    }
}

async function addMeal() {
    const mealType = document.getElementById('meal-type').value;
    const time = document.getElementById('meal-time').value;
    const description = document.getElementById('meal-description').value.trim();
    const photoEl = document.getElementById('meal-preview');
    const photo = photoEl.src && photoEl.style.display !== 'none' ? photoEl.src : null;

    if (!mealType) return alert('Please select a meal type');

    const { data, error } = await sb.from('meals').insert([{
        user_id: user.id,
        date: todayStr,
        meal_type: mealType,
        time: time || null,
        description: description || null,
        photo
    }]).select().single();

    if (data) {
        meals.push(data);
        document.getElementById('meal-description').value = '';
        document.getElementById('meal-time').value = '';
        document.getElementById('meal-preview').src = '';
        document.getElementById('meal-preview').style.display = 'none';
        renderMeals();
    } else if (error) {
        console.error('Error adding meal:', error);
        alert('Error adding meal');
    }
}

async function deleteMeal(id) {
    const { error } = await sb.from('meals').delete().eq('id', id);
    if (!error) {
        meals = meals.filter(m => m.id !== id);
        renderMeals();
    }
}

// --- TASK INFO MODAL ---
function showTaskInfo(title, content) {
    document.getElementById('info-modal-title').textContent = title;
    document.getElementById('info-modal-content').innerHTML = content;
    ui.infoModal.classList.add('active');
}

function closeInfoModal() {
    ui.infoModal.classList.remove('active');
}

// --- STREAK CALCULATION ---
function calculateStreak(habitId) {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const key = `${dateStr}_${habitId}`;

        if (localHistory[key]) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    return streak;
}

// --- STATS & EXPORT ---
function openStats() {
    ui.statsModal.classList.add('active');
    switchTab('week');
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
    // Fix: Calculate best streak using hardcoded morningItems
    const bestStreak = morningItems.reduce((max, t) => {
        const id = t.title.toLowerCase().replace(/\s+/g, '_');
        return Math.max(max, calculateStreak(`morning_${id}`));
    }, 0);
    const activeDays = new Set(Object.keys(localHistory).map(k => k.split('_')[0])).size;

    const summaryTmpl = document.getElementById('stats-summary-template');
    const summaryClone = summaryTmpl.content.cloneNode(true);
    summaryClone.querySelector('.total-done').textContent = totalCompletions;
    summaryClone.querySelector('.best-streak').textContent = bestStreak;
    summaryClone.querySelector('.active-days').textContent = activeDays;
    ui.statsContent.appendChild(summaryClone);

    if (view === 'week') {
        let html = '<div class="calendar-grid">';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => html += `<div class="cal-day header">${d}</div>`);

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayCount = countActivity(dateStr);
            const hasActivity = dayCount > 0;

            html += `<div class="cal-day ${hasActivity ? 'active' : ''}" title="${dayCount} completed">
                ${d.getDate()}
                ${dayCount > 0 ? `<span class="day-count-badge">${dayCount}✓</span>` : ''}
            </div>`;
        }
        html += '</div><p class="graph-caption">Past 7 Days Activity</p>';

        const div = document.createElement('div');
        div.innerHTML = html;
        ui.statsContent.appendChild(div);
    }

    if (view === 'month') {
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let html = `<h4 style="text-align:center; margin-bottom:10px;">${today.toLocaleString('default', { month: 'long' })}</h4>`;
        html += '<div class="calendar-grid">';

        for (let i = 0; i < firstDay.getDay(); i++) {
            html += '<div class="cal-day"></div>';
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayCount = countActivity(dateStr);
            html += `<div class="cal-day ${dayCount > 0 ? 'active' : ''}" title="${dayCount} completed">${i}</div>`;
        }
        html += '</div>';

        const div = document.createElement('div');
        div.innerHTML = html;
        ui.statsContent.appendChild(div);
    }

    if (view === 'year') {
        let html = '<div class="heatmap-grid">';
        for (let m = 0; m < 12; m++) {
            const monthName = new Date(2024, m).toLocaleString('default', { month: 'short' });
            let count = 0;
            Object.keys(localHistory).forEach(k => {
                if (k.startsWith(`${today.getFullYear()}-${String(m + 1).padStart(2, '0')}`)) count++;
            });

            const opacity = Math.min(count / 10, 1);
            const color = count > 0 ? `rgba(16, 185, 129, ${opacity || 0.1})` : 'rgba(255,255,255,0.05)';

            html += `<div class="year-cell-wrapper">
                <div class="year-cell-box" style="background:${color};">${count > 0 ? count : ''}</div>
                ${monthName}
            </div>`;
        }
        html += '</div><p class="graph-caption">Monthly Activity Density</p>';

        const div = document.createElement('div');
        div.innerHTML = html;
        ui.statsContent.appendChild(div);
    }
}

function countActivity(dateStr) {
    return Object.keys(localHistory).filter(key => key.startsWith(dateStr)).length;
}

function exportData() {
    const data = {
        exportedAt: new Date(),
        pomodoros,
        meals,
        waterCount,
        history: localHistory,
        weeklyTasks,
        mealPlans
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "routine_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// ============================================
// WEEKLY TASKS
// ============================================


// Format week label
function formatWeekLabel(weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}`;
}

// Load weekly tasks from Supabase
async function loadWeeklyTasks() {
    const { data } = await sb.from('weekly_tasks').select('*')
        .eq('user_id', user.id)
        .eq('week_start', currentWeekStart)
        .order('priority', { ascending: false });

    if (data) weeklyTasks = data;
}

// Render the plan view
function renderPlanView() {
    updatePlanDayTabs();
    updateWeekLabel('week-plan-label');
    renderWeeklyTasks();
}

// Update day tabs for planning
function updatePlanDayTabs() {
    const tabs = document.querySelectorAll('#plan-day-tabs .day-tab');
    const todayIndex = (new Date().getDay() + 6) % 7;

    tabs.forEach(tab => {
        const day = parseInt(tab.dataset.day);
        tab.classList.remove('active', 'today');
        if (day === planDayIndex) tab.classList.add('active');
        if (day === todayIndex) tab.classList.add('today');
    });
}

// Update week label display
function updateWeekLabel(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = formatWeekLabel(currentWeekStart);
}

// Switch plan day
function switchPlanDay(dayIndex) {
    planDayIndex = dayIndex;
    renderPlanView();
}

// Render weekly tasks list
function renderWeeklyTasks() {
    const list = document.getElementById('weekly-tasks-list');
    if (!list) return;
    list.innerHTML = '';

    const dayTasks = weeklyTasks.filter(t => t.day_of_week === planDayIndex);

    if (dayTasks.length === 0) {
        list.innerHTML = '<div class="empty-state">No tasks for this day. Add some below!</div>';
        updatePlanProgress(0, 0);
        return;
    }

    const template = document.getElementById('weekly-task-template');

    dayTasks.forEach(task => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.weekly-task-card');

        clone.querySelector('.task-title').textContent = task.title;
        clone.querySelector('.task-description').textContent = task.description || '';

        // Priority badge
        const priorityBadge = clone.querySelector('.priority-badge');
        const priorityMap = { 1: 'normal', 2: 'high', 3: 'urgent' };
        const priorityLabel = { 1: 'Normal', 2: 'High', 3: 'Urgent' };
        priorityBadge.classList.add(priorityMap[task.priority] || 'normal');
        priorityBadge.textContent = priorityLabel[task.priority] || 'Normal';

        // Completed state
        if (task.is_completed) {
            card.classList.add('completed');
        }

        // Click to toggle
        clone.querySelector('.task-main').onclick = () => toggleWeeklyTask(task.id, task.is_completed);

        // Delete button
        clone.querySelector('.delete-task-btn').onclick = () => deleteWeeklyTask(task.id);

        list.appendChild(card);
    });

    const completed = dayTasks.filter(t => t.is_completed).length;
    updatePlanProgress(completed, dayTasks.length);
}

// Update plan progress bar
function updatePlanProgress(completed, total) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const percentEl = document.getElementById('plan-progress-percent');
    const fillEl = document.getElementById('plan-progress-fill');
    if (percentEl) percentEl.textContent = `${completed}/${total}`;
    if (fillEl) fillEl.style.width = `${percent}%`;
}

// Toggle weekly task completion
async function toggleWeeklyTask(id, currentStatus) {
    const newStatus = !currentStatus;

    const { error } = await sb.from('weekly_tasks')
        .update({ is_completed: newStatus })
        .eq('id', id);

    if (!error) {
        const task = weeklyTasks.find(t => t.id === id);
        if (task) task.is_completed = newStatus;
        renderWeeklyTasks();
    }
}

// Add weekly task
async function addWeeklyTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = parseInt(document.getElementById('task-priority').value) || 1;

    if (!title) return alert('Please enter a task title.');

    const { data, error } = await sb.from('weekly_tasks').insert([{
        user_id: user.id,
        week_start: currentWeekStart,
        day_of_week: planDayIndex,
        title,
        description: description || null,
        priority,
        is_completed: false
    }]).select().single();

    if (data) {
        weeklyTasks.push(data);
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-priority').value = '1';
        renderWeeklyTasks();
    } else if (error) {
        console.error('Error adding weekly task:', error);
        alert('Error adding task');
    }
}

// Delete weekly task
async function deleteWeeklyTask(id) {
    const { error } = await sb.from('weekly_tasks').delete().eq('id', id);
    if (!error) {
        weeklyTasks = weeklyTasks.filter(t => t.id !== id);
        renderWeeklyTasks();
    }
}

// ============================================
// MEAL PLANNING / RECIPES
// ============================================

// Load meal plans from Supabase
async function loadMealPlans() {
    const { data } = await sb.from('meal_plans').select('*')
        .eq('user_id', user.id)
        .eq('week_start', currentWeekStart)
        .order('meal_type', { ascending: true });

    if (data) mealPlans = data;
}

// Render meal plan view
function renderMealPlanView() {
    updateMealPlanDayTabs();
    updateWeekLabel('week-meals-label');
    renderMealPlans();
}

// Update day tabs for meal planning
function updateMealPlanDayTabs() {
    const tabs = document.querySelectorAll('#recipes-day-tabs .day-tab');
    const todayIndex = (new Date().getDay() + 6) % 7;

    tabs.forEach(tab => {
        const day = parseInt(tab.dataset.day);
        tab.classList.remove('active', 'today');
        if (day === mealPlanDayIndex) tab.classList.add('active');
        if (day === todayIndex) tab.classList.add('today');
    });
}

// Switch meal plan day
function switchMealPlanDay(dayIndex) {
    mealPlanDayIndex = dayIndex;
    renderMealPlanView();
}

// Render meal plans list
function renderMealPlans() {
    const list = document.getElementById('meal-plan-list');
    if (!list) return;
    list.innerHTML = '';

    const dayPlans = mealPlans.filter(p => p.day_of_week === mealPlanDayIndex);

    if (dayPlans.length === 0) {
        list.innerHTML = '<div class="empty-state">No meals planned for this day. Add some recipes below!</div>';
        return;
    }

    // Sort by meal type order
    const mealOrder = { 'Breakfast': 1, 'Lunch': 2, 'Dinner': 3, 'Snack': 4 };
    dayPlans.sort((a, b) => (mealOrder[a.meal_type] || 5) - (mealOrder[b.meal_type] || 5));

    const template = document.getElementById('meal-plan-template');

    dayPlans.forEach(plan => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.meal-plan-card');

        clone.querySelector('.meal-type-badge').textContent = plan.meal_type;
        clone.querySelector('.meal-plan-name').textContent = plan.name;

        // Prep time
        const prepTimeEl = clone.querySelector('.prep-time');
        if (plan.prep_time) {
            prepTimeEl.textContent = `${plan.prep_time} min`;
        } else {
            prepTimeEl.style.display = 'none';
        }

        // Ingredients
        const ingredientsList = clone.querySelector('.ingredients-list');
        if (plan.ingredients) {
            // Parse ingredients (can be comma-separated or newline-separated)
            const items = plan.ingredients.split(/[,\n]+/).map(i => i.trim()).filter(i => i);
            if (items.length > 0) {
                ingredientsList.innerHTML = '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
            } else {
                ingredientsList.textContent = plan.ingredients;
            }
        }

        // Recipe
        clone.querySelector('.recipe-text').textContent = plan.recipe || '';

        // Notes
        const notesSection = clone.querySelector('.notes-section');
        if (plan.notes) {
            clone.querySelector('.notes-text').textContent = plan.notes;
        } else {
            notesSection.style.display = 'none';
        }

        // Expand/collapse recipe details
        const expandBtn = clone.querySelector('.expand-recipe-btn');
        const details = clone.querySelector('.meal-plan-details');
        expandBtn.onclick = () => {
            const isHidden = details.style.display === 'none';
            details.style.display = isHidden ? 'block' : 'none';
            expandBtn.classList.toggle('expanded', isHidden);
        };

        // Delete button
        clone.querySelector('.delete-meal-plan-btn').onclick = () => deleteMealPlan(plan.id);

        list.appendChild(card);
    });
}

// Add meal plan
async function addMealPlan() {
    const mealType = document.getElementById('plan-meal-type').value;
    const name = document.getElementById('plan-meal-name').value.trim();
    const prepTime = parseInt(document.getElementById('plan-prep-time').value) || null;
    const ingredients = document.getElementById('plan-ingredients').value.trim();
    const recipe = document.getElementById('plan-recipe').value.trim();
    const notes = document.getElementById('plan-notes').value.trim();

    if (!name) return alert('Please enter a meal name.');

    const { data, error } = await sb.from('meal_plans').insert([{
        user_id: user.id,
        week_start: currentWeekStart,
        day_of_week: mealPlanDayIndex,
        meal_type: mealType,
        name,
        prep_time: prepTime,
        ingredients: ingredients || null,
        recipe: recipe || null,
        notes: notes || null
    }]).select().single();

    if (data) {
        mealPlans.push(data);
        document.getElementById('plan-meal-name').value = '';
        document.getElementById('plan-prep-time').value = '';
        document.getElementById('plan-ingredients').value = '';
        document.getElementById('plan-recipe').value = '';
        document.getElementById('plan-notes').value = '';
        renderMealPlans();
    } else if (error) {
        console.error('Error adding meal plan:', error);
        alert('Error adding meal plan');
    }
}

// Delete meal plan
async function deleteMealPlan(id) {
    const { error } = await sb.from('meal_plans').delete().eq('id', id);
    if (!error) {
        mealPlans = mealPlans.filter(p => p.id !== id);
        renderMealPlans();
    }
}