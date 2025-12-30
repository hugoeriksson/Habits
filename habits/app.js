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
        showApp();
    } else {
        currentUser = null;
        habitsCache = [];
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
    } catch (err) {
        console.error('[Fetch Error]', err);
    }
}

function renderHabits() {
    DOM.habitList.innerHTML = '';
    updateProgress();

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

    habitsCache.forEach(habit => {
        const div = document.createElement('div');
        div.className = `habit-item ${habit.is_completed ? 'done' : ''}`;
        div.onclick = () => toggleHabit(habit.id, !habit.is_completed);

        const escapedTitle = habit.title
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        div.innerHTML = `
            <div class="habit-content">
                <div class="checkbox">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <span class="habit-title">${escapedTitle}</span>
            </div>`;
        DOM.habitList.appendChild(div);
    });
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

    try {
        const { data, error } = await sb
            .from('habits')
            .insert([{ title, user_id: currentUser.id }])
            .select()
            .single();

        if (error) throw error;

        habitsCache.push(data);
        renderHabits();
        DOM.newHabitInput.value = '';
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

    try {
        const { error } = await sb
            .from('habits')
            .update({ is_completed: status })
            .eq('id', id);

        if (error) throw error;
    } catch (err) {
        habitsCache[habitIndex].is_completed = previousStatus;
        renderHabits();
        console.error('[Toggle Error]', err);
    }
}

async function resetDay() {
    if (!currentUser || habitsCache.length === 0) return;
    if (!confirm('Reset all habits for tomorrow?')) return;

    const previousCache = habitsCache.map(h => ({ ...h }));
    habitsCache.forEach(h => h.is_completed = false);
    renderHabits();

    try {
        const { error } = await sb
            .from('habits')
            .update({ is_completed: false })
            .eq('user_id', currentUser.id);

        if (error) throw error;
    } catch (err) {
        habitsCache = previousCache;
        renderHabits();
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
        }
    }
});