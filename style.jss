:root {
    --bg-primary: #0a0a0f;
    --bg-card: rgba(25, 25, 35, 0.95);
    --bg-glass: rgba(255, 255, 255, 0.05);
    --accent-primary: #6366f1;
    --accent-secondary: #8b5cf6;
    --accent-success: #10b981;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --border-subtle: rgba(255, 255, 255, 0.1);
    --radius-md: 12px;
    --radius-lg: 16px;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 20px;
}

.container {
    width: 100%;
    max-width: 480px;
    position: relative;
}

.screen {
    display: none;
    animation: fadeIn 0.4s ease;
}

.visible {
    display: block !important;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.glass-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

/* Header */
.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.brand-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
}

.header-actions {
    display: flex;
    gap: 15px;
    align-items: center;
}

.icon-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: 0.2s;
}

.icon-btn:hover {
    color: white;
}

/* Day Controller */
.day-controller {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 12px 16px;
    background: var(--bg-glass);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
}

.date-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.day-select {
    background: transparent;
    color: var(--accent-primary);
    border: none;
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
    text-align: right;
    outline: none;
}

.day-select option {
    background: #1f1f2e;
    color: white;
}

/* Habit List */
.habit-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 100px;
}

.habit-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: 0.2s;
}

.habit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
}

.habit-main {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    flex: 1;
}

.checkbox {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 2px solid var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;
}

.habit-card.done .checkbox {
    background: var(--accent-success);
    border-color: var(--accent-success);
}

.habit-title {
    font-weight: 500;
    transition: 0.2s;
}

.habit-card.done .habit-title {
    color: var(--text-secondary);
    text-decoration: line-through;
}

/* Actions Button */
.action-btn {
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
}

.action-btn:hover,
.action-btn.active {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: white;
}

/* Details Section */
.habit-details {
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid var(--border-subtle);
    padding: 0 16px;
    max-height: 0;
    overflow: hidden;
    transition: 0.3s ease;
}

.habit-details.open {
    padding: 16px;
    max-height: 500px;
}

.detail-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 8px;
    display: block;
}

.detail-textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    color: white;
    padding: 10px;
    font-family: inherit;
    margin-bottom: 12px;
    resize: none;
}

.upload-box {
    border: 2px dashed var(--border-subtle);
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    cursor: pointer;
    transition: 0.2s;
}

.upload-box:hover {
    border-color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.02);
}

.preview-img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 6px;
    margin-top: 10px;
    display: none;
}

.preview-img.visible {
    display: block;
}

/* Add Section */
.add-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--border-subtle);
}

.week-selector {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
}

.day-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--bg-glass);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    cursor: pointer;
}

.day-btn.selected {
    background: var(--accent-primary);
    color: white;
    border-color: var(--accent-primary);
}

/* Stats Modal */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: 0.3s;
}

.modal-overlay.active {
    opacity: 1;
    pointer-events: all;
}

.modal-card {
    background: #15151b;
    width: 90%;
    max-width: 440px;
    border-radius: var(--radius-lg);
    padding: 24px;
    border: 1px solid var(--border-subtle);
    max-height: 85vh;
    overflow-y: auto;
}

.stats-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    background: var(--bg-glass);
    padding: 4px;
    border-radius: 8px;
}

.tab-btn {
    flex: 1;
    padding: 8px;
    border: none;
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 6px;
    font-size: 0.9rem;
}

.tab-btn.active {
    background: var(--bg-card);
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 20px;
}

.cal-day {
    aspect-ratio: 1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.03);
}

.cal-day.active {
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.cal-day.header {
    background: none;
    font-weight: bold;
}

.heatmap-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
}

.heat-cell {
    aspect-ratio: 1;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.05);
}

/* Inputs & Buttons */
input {
    width: 100%;
    padding: 14px;
    background: var(--bg-glass);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: white;
    margin-bottom: 12px;
}

button.primary {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-weight: 600;
    cursor: pointer;
}

button.secondary {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    margin-top: 12px;
}

button.secondary:hover {
    border-color: white;
    color: white;
}

/* Auth */
.auth-container {
    text-align: center;
}

.error-msg {
    color: #f87171;
    font-size: 0.9rem;
    display: none;
}

/* Progress Bar */
.progress-container {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-glass);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
}

.progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.progress-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.progress-percent {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--accent-success);
}

.progress-bar-bg {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-success));
    border-radius: 4px;
    transition: width 0.4s ease;
}

/* Streak Badge */
.streak-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: white;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    margin-left: 8px;
}

.streak-badge svg {
    width: 12px;
    height: 12px;
}

/* Log Indicator */
.log-indicator {
    display: flex;
    gap: 6px;
    margin-left: auto;
    margin-right: 10px;
}

.log-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    opacity: 0.3;
}

.log-dot.active {
    opacity: 1;
}

.log-dot.note {
    background: var(--accent-primary);
}

.log-dot.photo {
    background: var(--accent-secondary);
}

/* Delete Button */
.delete-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.8rem;
    width: 100%;
    justify-content: center;
    transition: 0.2s;
}

.delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #f87171;
}

/* Stats Enhancements */
.stat-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}

.stat-box {
    background: var(--bg-glass);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 12px;
    text-align: center;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-success);
}

.stat-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
}

/* Utilities extracted from JS */
.loading-indicator {
    text-align: center;
    opacity: 0.7;
}

.empty-state {
    text-align: center;
    padding: 30px;
    color: var(--text-secondary);
}

.upload-hint {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.graph-caption {
    text-align: center;
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 10px;
}

.day-count-badge {
    font-size: 0.6rem;
    display: block;
}

.year-cell-wrapper {
    text-align: center;
    font-size: 0.7rem;
}

.year-cell-box {
    aspect-ratio: 1;
    border-radius: 4px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
}