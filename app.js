const { createClient } = supabase;
const sb = createClient(
    'https://rizzzisqxifemunpffsq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpenp6aXNxeGlmZW11bnBmZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA4NzMsImV4cCI6MjA4MjY4Njg3M30.5HaAOLhIoF9qT-bgwushnGt4ymGDE6atYVorsbgFNQw'
);

// --- GLOBAL STATE ---
let currentUser = null;
let isLoading = false;
let habitsCache = [];
let isSignUpMode = false; // Toggle between Sign In and Sign Up

// Overview state
let currentPeriod = 'week';
let calendarOffset = 0;
let completionHistory = {}; // { 'YYYY-MM-DD': { habitId: true/false, ... } }

// Habit colors for the legend
const HABIT_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4'
];

// Category colors
const CATEGORY_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#3b82f6', '#a855f7', '#f472b6', '#fb7185', '#fb923c'
];

// Category state
let categories = []; // { id, name, color }
let habitCategories = {}; // { habitId: categoryId }
let collapsedCategories = {}; // { categoryId: true/false }
let selectedCategoryColor = CATEGORY_COLORS[0];
let editingHabitId = null;

// --- DOM ELEMENTS ---
const DOM = {
    authScreen: document.getElementById('auth-screen'),
    appScreen: document.getElementById('app-screen'),
    emailInput: document.getElementById('email-input'),
    passwordInput: document.getElementById('password-input'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authToggleBtn: document.getElementById('auth-toggle-btn'),
    errorMessage: document.getElementById('error-message'),
    successMessage: document.getElementById('success-message'),
    habitList: document.getElementById('habit-list'),
    newHabitInput: document.getElementById('new-habit'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    progressSection: document.getElementById('progress-section'),
    dateDisplay: document.getElementById('date-display'),
    // Overview elements
    tabHabits: document.getElementById('tab-habits'),
    tabOverview: document.getElementById('tab-overview'),
    contentHabits: document.getElementById('content-habits'),
    contentOverview: document.getElementById('content-overview'),
    calendarGrid: document.getElementById('calendar-grid'),
    calendarTitle: document.getElementById('calendar-title'),
    statTotalCompletions: document.getElementById('stat-total-completions'),
    statCompletionRate: document.getElementById('stat-completion-rate'),
    statBestStreak: document.getElementById('stat-best-streak'),
    habitLegendItems: document.getElementById('habit-legend-items'),
    dayDetailModal: document.getElementById('day-detail-modal'),
    dayDetailDate: document.getElementById('day-detail-date'),
    dayDetailHabits: document.getElementById('day-detail-habits'),
    // Category elements
    categoryModal: document.getElementById('category-modal'),
    categoryList: document.getElementById('category-list'),
    newCategoryName: document.getElementById('new-category-name'),
    colorPicker: document.getElementById('color-picker'),
    newHabitCategory: document.getElementById('new-habit-category'),
    editHabitModal: document.getElementById('edit-habit-modal'),
    editHabitName: document.getElementById('edit-habit-name'),
    editHabitCategory: document.getElementById('edit-habit-category'),
};

// --- UTILITY FUNCTIONS ---

function showError(message) {
    DOM.errorMessage.textContent = message;
    DOM.errorMessage.classList.add('visible');
    DOM.successMessage.classList.remove('visible');
}

function showSuccess(message) {
    DOM.successMessage.textContent = message;
    DOM.successMessage.classList.add('visible');
    DOM.errorMessage.classList.remove('visible');
}

function clearMessages() {
    DOM.errorMessage.classList.remove('visible');
    DOM.successMessage.classList.remove('visible');
}

function setLoading(loading) {
    isLoading = loading;
    DOM.authSubmitBtn.disabled = loading;
    DOM.authSubmitBtn.style.opacity = loading ? '0.6' : '1';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getDateString(date) {
    return date.toISOString().split('T')[0];
}

function getTodayString() {
    return getDateString(new Date());
}

// --- COMPLETION HISTORY ---

function getStorageKey() {
    return currentUser ? `habit_history_${currentUser.id}` : null;
}

function loadCompletionHistory() {
    const key = getStorageKey();
    if (!key) return;

    try {
        const stored = localStorage.getItem(key);
        completionHistory = stored ? JSON.parse(stored) : {};
    } catch (err) {
        console.error('[History Load Error]', err);
        completionHistory = {};
    }
}

function saveCompletionHistory() {
    const key = getStorageKey();
    if (!key) return;

    try {
        localStorage.setItem(key, JSON.stringify(completionHistory));
    } catch (err) {
        console.error('[History Save Error]', err);
    }
}

function recordTodayCompletion() {
    const today = getTodayString();
    completionHistory[today] = {};

    habitsCache.forEach(habit => {
        completionHistory[today][habit.id] = habit.is_completed;
    });

    saveCompletionHistory();
}

// --- CATEGORY STORAGE ---

function getCategoryStorageKey() {
    return currentUser ? `habit_categories_${currentUser.id}` : null;
}

function getHabitCategoryStorageKey() {
    return currentUser ? `habit_category_map_${currentUser.id}` : null;
}

function getCollapsedCategoriesKey() {
    return currentUser ? `collapsed_categories_${currentUser.id}` : null;
}

function loadCategories() {
    const catKey = getCategoryStorageKey();
    const mapKey = getHabitCategoryStorageKey();
    const collapsedKey = getCollapsedCategoriesKey();

    if (!catKey) return;

    try {
        const storedCats = localStorage.getItem(catKey);
        categories = storedCats ? JSON.parse(storedCats) : [];

        const storedMap = localStorage.getItem(mapKey);
        habitCategories = storedMap ? JSON.parse(storedMap) : {};

        const storedCollapsed = localStorage.getItem(collapsedKey);
        collapsedCategories = storedCollapsed ? JSON.parse(storedCollapsed) : {};
    } catch (err) {
        console.error('[Category Load Error]', err);
        categories = [];
        habitCategories = {};
        collapsedCategories = {};
    }
}

function saveCategories() {
    const catKey = getCategoryStorageKey();
    const mapKey = getHabitCategoryStorageKey();
    const collapsedKey = getCollapsedCategoriesKey();

    if (!catKey) return;

    try {
        localStorage.setItem(catKey, JSON.stringify(categories));
        localStorage.setItem(mapKey, JSON.stringify(habitCategories));
        localStorage.setItem(collapsedKey, JSON.stringify(collapsedCategories));
    } catch (err) {
        console.error('[Category Save Error]', err);
    }
}

function updateCategorySelects() {
    const selects = [DOM.newHabitCategory, DOM.editHabitCategory];

    selects.forEach(select => {
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">No category</option>';

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            option.style.color = cat.color;
            select.appendChild(option);
        });

        select.value = currentValue;
    });
}

// --- AUTH MODE TOGGLE ---

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    clearMessages();

    if (isSignUpMode) {
        DOM.authTitle.textContent = 'Create Account';
        DOM.authSubtitle.textContent = 'Sign up to start tracking your habits';
        DOM.authSubmitBtn.textContent = 'Sign Up';
        DOM.authToggleBtn.textContent = 'Already have an account? Sign In';
    } else {
        DOM.authTitle.textContent = 'Sign In';
        DOM.authSubtitle.textContent = 'Enter your credentials to continue';
        DOM.authSubmitBtn.textContent = 'Sign In';
        DOM.authToggleBtn.textContent = 'Create an account';
    }
}

// --- AUTH STATE LISTENER ---

sb.auth.onAuthStateChange((event, session) => {
    console.log("[Auth]", event);

    if (session?.user) {
        currentUser = session.user;
        loadCompletionHistory();
        loadCategories();
        showApp();
    } else {
        currentUser = null;
        habitsCache = [];
        completionHistory = {};
        categories = [];
        habitCategories = {};
        showAuth();
    }
});

// --- AUTHENTICATION ---

async function handleAuth() {
    if (isLoading) return;

    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value;

    // Validation
    if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters.');
        return;
    }

    clearMessages();
    setLoading(true);

    try {
        if (isSignUpMode) {
            // SIGN UP
            const { data, error } = await sb.auth.signUp({ email, password });

            if (error) {
                showError(error.message);
            } else if (data.user && !data.session) {
                // Email confirmation required
                showSuccess('Check your email for a confirmation link!');
            }
            // If session exists, onAuthStateChange handles it
        } else {
            // SIGN IN
            const { data, error } = await sb.auth.signInWithPassword({ email, password });

            if (error) {
                showError(error.message);
            }
            // Success handled by onAuthStateChange
        }
    } catch (err) {
        console.error('[Auth Error]', err);
        showError('An unexpected error occurred. Please try again.');
    } finally {
        setLoading(false);
    }
}

// --- SCREEN NAVIGATION ---

function showAuth() {
    DOM.appScreen.classList.remove('visible');
    DOM.authScreen.classList.add('visible');
    DOM.passwordInput.value = '';
    clearMessages();
}

function showApp() {
    DOM.authScreen.classList.remove('visible');
    DOM.appScreen.classList.add('visible');
    updateDateDisplay();
    fetchHabits();
}

// --- TAB SWITCHING ---

function switchTab(tab) {
    if (tab === 'habits') {
        DOM.tabHabits.classList.add('active');
        DOM.tabOverview.classList.remove('active');
        DOM.contentHabits.classList.add('active');
        DOM.contentOverview.classList.remove('active');
    } else {
        DOM.tabHabits.classList.remove('active');
        DOM.tabOverview.classList.add('active');
        DOM.contentHabits.classList.remove('active');
        DOM.contentOverview.classList.add('active');
        renderOverview();
    }
}

// --- PERIOD SELECTION ---

function setPeriod(period) {
    currentPeriod = period;
    calendarOffset = 0;

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });

    renderOverview();
}

// --- CALENDAR NAVIGATION ---

function navigateCalendar(direction) {
    calendarOffset += direction;
    renderOverview();
}

// --- OVERVIEW RENDERING ---

function renderOverview() {
    recordTodayCompletion();
    renderCalendar();
    renderStats();
    renderHabitLegend();
}

function getCalendarDays() {
    const today = new Date();
    const days = [];

    if (currentPeriod === 'week') {
        // Get start of week (Sunday)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        startOfWeek.setDate(today.getDate() - dayOfWeek + (calendarOffset * 7));

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            days.push(day);
        }

        // Update title
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const options = { month: 'short', day: 'numeric' };
        DOM.calendarTitle.textContent = `${startOfWeek.toLocaleDateString('en-US', options)} - ${endOfWeek.toLocaleDateString('en-US', options)}`;

    } else if (currentPeriod === 'month') {
        // Get start of month
        const month = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1);
        const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const firstDayOfWeek = month.getDay();

        // Add empty days for alignment
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(month.getFullYear(), month.getMonth(), i));
        }

        DOM.calendarTitle.textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    } else { // year
        // Show last 365 days
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364 + (calendarOffset * 365));
        const firstDayOfWeek = startDate.getDay();

        // Add empty days for alignment
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }

        for (let i = 0; i < 365; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            days.push(day);
        }

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 364);
        DOM.calendarTitle.textContent = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }

    return days;
}

function renderCalendar() {
    const days = getCalendarDays();
    const today = getTodayString();
    const todayDate = new Date();

    DOM.calendarGrid.innerHTML = '';

    days.forEach(day => {
        const cell = document.createElement('div');

        if (!day) {
            cell.className = 'calendar-day empty';
        } else {
            const dateStr = getDateString(day);
            const isFuture = day > todayDate;
            const isToday = dateStr === today;
            const dayData = completionHistory[dateStr] || {};

            // Calculate completion for this day
            const habitIds = Object.keys(dayData);
            const completedCount = habitIds.filter(id => dayData[id]).length;
            const totalHabits = habitsCache.length || habitIds.length;
            const completionRatio = totalHabits > 0 ? completedCount / totalHabits : 0;

            // Determine heat level (0-5)
            let heatLevel = 0;
            if (completedCount > 0) {
                heatLevel = Math.ceil(completionRatio * 5);
            }

            cell.className = `calendar-day heat-${heatLevel}`;
            if (isToday) cell.classList.add('today');
            if (isFuture) cell.classList.add('future');

            const dayNumber = day.getDate();
            cell.innerHTML = `<span class="day-number">${dayNumber}</span>`;

            if (!isFuture && (completedCount > 0 || dateStr === today)) {
                cell.onclick = () => showDayDetail(dateStr, day);
            }
        }

        DOM.calendarGrid.appendChild(cell);
    });
}

function renderStats() {
    const today = new Date();
    let startDate;

    if (currentPeriod === 'week') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
    } else if (currentPeriod === 'month') {
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
    } else {
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
    }

    let totalCompletions = 0;
    let totalPossible = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Get sorted dates
    const dates = Object.keys(completionHistory).sort();

    dates.forEach(dateStr => {
        const date = new Date(dateStr);
        if (date >= startDate && date <= today) {
            const dayData = completionHistory[dateStr];
            const habitIds = Object.keys(dayData);
            const completed = habitIds.filter(id => dayData[id]).length;
            totalCompletions += completed;
            totalPossible += habitIds.length;
        }
    });

    // Calculate streaks (consecutive days with all habits completed)
    const sortedDates = dates.filter(d => {
        const date = new Date(d);
        return date <= today;
    }).sort().reverse();

    for (let i = 0; i < sortedDates.length; i++) {
        const dateStr = sortedDates[i];
        const dayData = completionHistory[dateStr];
        const habitIds = Object.keys(dayData);
        const completed = habitIds.filter(id => dayData[id]).length;
        const allDone = habitIds.length > 0 && completed === habitIds.length;

        if (allDone) {
            tempStreak++;
            if (i === 0) currentStreak = tempStreak;
        } else {
            if (tempStreak > bestStreak) bestStreak = tempStreak;
            if (i === 0) currentStreak = 0;
            tempStreak = 0;
        }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;

    const rate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;

    DOM.statTotalCompletions.textContent = totalCompletions;
    DOM.statCompletionRate.textContent = `${rate}%`;
    DOM.statBestStreak.textContent = bestStreak;
}

function renderHabitLegend() {
    DOM.habitLegendItems.innerHTML = '';

    if (habitsCache.length === 0) {
        DOM.habitLegendItems.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No habits to display</p>';
        return;
    }

    habitsCache.forEach((habit, index) => {
        const color = HABIT_COLORS[index % HABIT_COLORS.length];
        const streak = calculateHabitStreak(habit.id);

        const item = document.createElement('div');
        item.className = 'legend-item';

        const escapedTitle = habit.title
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        item.innerHTML = `
            <div class="legend-color" style="background: ${color}"></div>
            <span class="legend-name">${escapedTitle}</span>
            <span class="legend-streak ${streak > 0 ? 'active' : ''}">
                🔥 ${streak} day${streak !== 1 ? 's' : ''}
            </span>
        `;

        DOM.habitLegendItems.appendChild(item);
    });
}

function calculateHabitStreak(habitId) {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    // Check backwards from today
    while (true) {
        const dateStr = getDateString(currentDate);
        const dayData = completionHistory[dateStr];

        if (!dayData || dayData[habitId] === undefined) {
            // No data for this day, check if it's today
            if (dateStr === getTodayString()) {
                // For today, use current habit status
                const habit = habitsCache.find(h => h.id === habitId);
                if (habit && habit.is_completed) {
                    streak++;
                } else {
                    break;
                }
            } else {
                break;
            }
        } else if (dayData[habitId]) {
            streak++;
        } else {
            break;
        }

        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
}

// --- DAY DETAIL MODAL ---

function showDayDetail(dateStr, date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.dayDetailDate.textContent = date.toLocaleDateString('en-US', options);

    const dayData = completionHistory[dateStr] || {};
    DOM.dayDetailHabits.innerHTML = '';

    // If it's today, show current habits
    const isToday = dateStr === getTodayString();
    const habitsToShow = isToday ? habitsCache : Object.keys(dayData).map(id => {
        const habit = habitsCache.find(h => h.id == id);
        return habit || { id, title: `Habit #${id}`, is_completed: dayData[id] };
    });

    if (habitsToShow.length === 0) {
        DOM.dayDetailHabits.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No habit data for this day</p>';
    } else {
        habitsToShow.forEach(habit => {
            const isCompleted = isToday ? habit.is_completed : (dayData[habit.id] || false);
            const div = document.createElement('div');
            div.className = `day-detail-habit ${isCompleted ? 'completed' : ''}`;

            const escapedTitle = habit.title
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            div.innerHTML = `
                <div class="habit-status">
                    ${isCompleted ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
                </div>
                <span class="habit-name">${escapedTitle}</span>
            `;

            DOM.dayDetailHabits.appendChild(div);
        });
    }

    DOM.dayDetailModal.classList.add('visible');
}

function closeDayDetail(event) {
    if (event.target === DOM.dayDetailModal) {
        DOM.dayDetailModal.classList.remove('visible');
    }
}

function closeDayDetailModal() {
    DOM.dayDetailModal.classList.remove('visible');
}

// --- HABITS ---

async function fetchHabits() {
    if (!currentUser) return;

    try {
        const { data: habits, error } = await sb
            .from('habits')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('id', { ascending: true });

        if (error) throw error;

        habitsCache = habits || [];
        renderHabits();
        recordTodayCompletion();
    } catch (err) {
        console.error('[Fetch Error]', err);
    }
}

function renderHabits() {
    DOM.habitList.innerHTML = '';
    updateProgress();
    updateCategorySelects();

    if (habitsCache.length === 0) {
        DOM.habitList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <p>No habits yet. Add your first one!</p>
            </div>`;
        DOM.progressSection.style.display = 'none';
        return;
    }

    DOM.progressSection.style.display = 'block';

    // Group habits by category
    const categorizedHabits = {};
    const uncategorized = [];

    habitsCache.forEach(habit => {
        const catId = habitCategories[habit.id];
        if (catId && categories.find(c => c.id === catId)) {
            if (!categorizedHabits[catId]) {
                categorizedHabits[catId] = [];
            }
            categorizedHabits[catId].push(habit);
        } else {
            uncategorized.push(habit);
        }
    });

    // Render categorized habits
    categories.forEach(category => {
        const habits = categorizedHabits[category.id] || [];
        if (habits.length === 0) return;

        const isCollapsed = collapsedCategories[category.id];
        const completedCount = habits.filter(h => h.is_completed).length;

        const section = document.createElement('div');
        section.className = 'category-section';

        section.innerHTML = `
            <div class="category-header ${isCollapsed ? 'collapsed' : ''}" onclick="toggleCategory('${category.id}')">
                <div class="category-color" style="background: ${category.color}"></div>
                <span class="category-name">${escapeHtml(category.name)}</span>
                <span class="category-count">${completedCount}/${habits.length}</span>
                <svg class="category-toggle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            <div class="category-habits ${isCollapsed ? 'collapsed' : ''}"></div>
        `;

        const habitsContainer = section.querySelector('.category-habits');
        habits.forEach(habit => {
            habitsContainer.appendChild(createHabitElement(habit, category.color));
        });

        DOM.habitList.appendChild(section);
    });

    // Render uncategorized habits
    if (uncategorized.length > 0) {
        const section = document.createElement('div');
        section.className = 'uncategorized-section';

        if (categories.length > 0) {
            section.innerHTML = `<div class="uncategorized-label">📋 Uncategorized</div>`;
        }

        uncategorized.forEach(habit => {
            section.appendChild(createHabitElement(habit));
        });

        DOM.habitList.appendChild(section);
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function createHabitElement(habit, categoryColor = null) {
    const div = document.createElement('div');
    div.className = `habit-item ${habit.is_completed ? 'done' : ''}`;

    const escapedTitle = escapeHtml(habit.title);

    div.innerHTML = `
        <div class="habit-content" onclick="toggleHabit(${habit.id}, ${!habit.is_completed})">
            ${categoryColor ? `<div class="habit-category-dot" style="background: ${categoryColor}"></div>` : ''}
            <div class="checkbox">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <span class="habit-title">${escapedTitle}</span>
        </div>
        <button class="habit-edit-btn" onclick="event.stopPropagation(); openEditHabitModal(${habit.id})">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
        </button>
    `;

    return div;
}

function toggleCategory(categoryId) {
    collapsedCategories[categoryId] = !collapsedCategories[categoryId];
    saveCategories();
    renderHabits();
}

function updateProgress() {
    const total = habitsCache.length;
    const completed = habitsCache.filter(h => h.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (DOM.progressFill) DOM.progressFill.style.width = `${percentage}%`;
    if (DOM.progressText) DOM.progressText.textContent = `${completed}/${total}`;
}

function updateDateDisplay() {
    if (DOM.dateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        DOM.dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

async function addHabit() {
    if (isLoading || !currentUser) return;

    const title = DOM.newHabitInput.value.trim().slice(0, 200);
    if (!title) return;

    const categoryId = DOM.newHabitCategory?.value || '';

    try {
        const { data, error } = await sb
            .from('habits')
            .insert([{ title, user_id: currentUser.id }])
            .select()
            .single();

        if (error) throw error;

        habitsCache.push(data);

        // Assign to category if selected
        if (categoryId) {
            habitCategories[data.id] = categoryId;
            saveCategories();
        }

        renderHabits();
        recordTodayCompletion();
        DOM.newHabitInput.value = '';
        if (DOM.newHabitCategory) DOM.newHabitCategory.value = '';
    } catch (err) {
        console.error('[Add Error]', err);
        alert('Failed to add habit. Please try again.');
    }
}

async function toggleHabit(id, status) {
    const habitIndex = habitsCache.findIndex(h => h.id === id);
    if (habitIndex === -1) return;

    const previousStatus = habitsCache[habitIndex].is_completed;
    habitsCache[habitIndex].is_completed = status;
    renderHabits();
    recordTodayCompletion();

    try {
        const { error } = await sb
            .from('habits')
            .update({ is_completed: status })
            .eq('id', id);

        if (error) throw error;
    } catch (err) {
        habitsCache[habitIndex].is_completed = previousStatus;
        renderHabits();
        recordTodayCompletion();
        console.error('[Toggle Error]', err);
    }
}

async function resetDay() {
    if (!currentUser || habitsCache.length === 0) return;
    if (!confirm('Reset all habits for tomorrow?')) return;

    const previousCache = habitsCache.map(h => ({ ...h }));
    habitsCache.forEach(h => h.is_completed = false);
    renderHabits();
    recordTodayCompletion();

    try {
        const { error } = await sb
            .from('habits')
            .update({ is_completed: false })
            .eq('user_id', currentUser.id);

        if (error) throw error;
    } catch (err) {
        habitsCache = previousCache;
        renderHabits();
        recordTodayCompletion();
        console.error('[Reset Error]', err);
    }
}

async function logout() {
    try {
        await sb.auth.signOut();
    } catch (err) {
        console.error('[Logout Error]', err);
    }
}

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (DOM.authScreen.classList.contains('visible')) {
            handleAuth();
        } else if (DOM.appScreen.classList.contains('visible') && document.activeElement === DOM.newHabitInput) {
            addHabit();
        } else if (DOM.categoryModal?.classList.contains('visible') && document.activeElement === DOM.newCategoryName) {
            addCategory();
        }
    }

    // Close modals on Escape
    if (e.key === 'Escape') {
        if (DOM.dayDetailModal?.classList.contains('visible')) {
            closeDayDetailModal();
        }
        if (DOM.categoryModal?.classList.contains('visible')) {
            closeCategoryModalBtn();
        }
        if (DOM.editHabitModal?.classList.contains('visible')) {
            closeEditHabitModalBtn();
        }
    }
});

// --- CATEGORY MANAGEMENT ---

function openCategoryModal() {
    renderColorPicker();
    renderCategoryList();
    DOM.categoryModal.classList.add('visible');
}

function closeCategoryModal(event) {
    if (event.target === DOM.categoryModal) {
        DOM.categoryModal.classList.remove('visible');
    }
}

function closeCategoryModalBtn() {
    DOM.categoryModal.classList.remove('visible');
}

function renderColorPicker() {
    DOM.colorPicker.innerHTML = '';

    CATEGORY_COLORS.forEach(color => {
        const div = document.createElement('div');
        div.className = `color-option ${color === selectedCategoryColor ? 'selected' : ''}`;
        div.style.background = color;
        div.onclick = () => selectCategoryColor(color);
        DOM.colorPicker.appendChild(div);
    });
}

function selectCategoryColor(color) {
    selectedCategoryColor = color;
    renderColorPicker();
}

function renderCategoryList() {
    DOM.categoryList.innerHTML = '';

    if (categories.length === 0) {
        DOM.categoryList.innerHTML = '<div class="empty-categories">No categories yet. Create one below!</div>';
        return;
    }

    categories.forEach(cat => {
        const habitCount = Object.values(habitCategories).filter(id => id === cat.id).length;

        const item = document.createElement('div');
        item.className = 'category-list-item';

        item.innerHTML = `
            <div class="category-color" style="background: ${cat.color}"></div>
            <div class="category-info">
                <div class="category-name">${escapeHtml(cat.name)}</div>
                <div class="category-habit-count">${habitCount} habit${habitCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="category-actions">
                <button class="category-action-btn delete" onclick="deleteCategory('${cat.id}')">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;

        DOM.categoryList.appendChild(item);
    });
}

function addCategory() {
    const name = DOM.newCategoryName.value.trim();
    if (!name) return;

    const newCategory = {
        id: 'cat_' + Date.now(),
        name: name.slice(0, 50),
        color: selectedCategoryColor
    };

    categories.push(newCategory);
    saveCategories();

    DOM.newCategoryName.value = '';
    selectedCategoryColor = CATEGORY_COLORS[0];

    renderCategoryList();
    renderColorPicker();
    renderHabits();
}

function deleteCategory(categoryId) {
    if (!confirm('Delete this category? Habits will become uncategorized.')) return;

    categories = categories.filter(c => c.id !== categoryId);

    // Remove category assignment from habits
    Object.keys(habitCategories).forEach(habitId => {
        if (habitCategories[habitId] === categoryId) {
            delete habitCategories[habitId];
        }
    });

    saveCategories();
    renderCategoryList();
    renderHabits();
}

// --- EDIT HABIT MODAL ---

function openEditHabitModal(habitId) {
    editingHabitId = habitId;
    const habit = habitsCache.find(h => h.id === habitId);
    if (!habit) return;

    DOM.editHabitName.value = habit.title;
    DOM.editHabitCategory.value = habitCategories[habitId] || '';

    updateCategorySelects();
    DOM.editHabitModal.classList.add('visible');
}

function closeEditHabitModal(event) {
    if (event.target === DOM.editHabitModal) {
        DOM.editHabitModal.classList.remove('visible');
        editingHabitId = null;
    }
}

function closeEditHabitModalBtn() {
    DOM.editHabitModal.classList.remove('visible');
    editingHabitId = null;
}

async function saveHabitEdit() {
    if (!editingHabitId) return;

    const newTitle = DOM.editHabitName.value.trim().slice(0, 200);
    const newCategoryId = DOM.editHabitCategory.value;

    if (!newTitle) {
        alert('Habit name cannot be empty.');
        return;
    }

    const habitIndex = habitsCache.findIndex(h => h.id === editingHabitId);
    if (habitIndex === -1) return;

    const previousTitle = habitsCache[habitIndex].title;
    habitsCache[habitIndex].title = newTitle;

    // Update category
    if (newCategoryId) {
        habitCategories[editingHabitId] = newCategoryId;
    } else {
        delete habitCategories[editingHabitId];
    }
    saveCategories();

    renderHabits();
    closeEditHabitModalBtn();

    // Update in database
    try {
        const { error } = await sb
            .from('habits')
            .update({ title: newTitle })
            .eq('id', editingHabitId);

        if (error) throw error;
    } catch (err) {
        habitsCache[habitIndex].title = previousTitle;
        renderHabits();
        console.error('[Edit Error]', err);
        alert('Failed to save changes.');
    }
}

async function deleteHabit() {
    if (!editingHabitId) return;
    if (!confirm('Delete this habit? This cannot be undone.')) return;

    const habitId = editingHabitId;
    const habitIndex = habitsCache.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    const deletedHabit = habitsCache[habitIndex];
    habitsCache.splice(habitIndex, 1);
    delete habitCategories[habitId];
    saveCategories();

    renderHabits();
    recordTodayCompletion();
    closeEditHabitModalBtn();

    try {
        const { error } = await sb
            .from('habits')
            .delete()
            .eq('id', habitId);

        if (error) throw error;
    } catch (err) {
        habitsCache.splice(habitIndex, 0, deletedHabit);
        renderHabits();
        console.error('[Delete Error]', err);
        alert('Failed to delete habit.');
    }
}