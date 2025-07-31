// API utility functions for communicating with the Flask backend

class TimeAuditAPI {
    constructor() {
        this.baseURL = '';
    }

    // Show loading overlay
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // Handle API errors
    handleError(error, customMessage = null) {
        console.error('API Error:', error);
        this.hideLoading();
        
        let message = customMessage;
        if (!message) {
            if (error.response) {
                message = error.response.error || 'An error occurred';
            } else {
                message = 'Network error. Please check your connection.';
            }
        }
        
        alert(message);
        throw error;
    }

    // Make HTTP request
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw {
                    status: response.status,
                    response: errorData
                };
            }

            // Handle 204 No Content responses
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    // Get time entries for a specific week
    async getEntries(weekStart = null) {
        this.showLoading();
        try {
            const url = weekStart 
                ? `/api/entries?week_start=${weekStart}`
                : '/api/entries';
            
            const entries = await this.makeRequest(url);
            this.hideLoading();
            return entries;
        } catch (error) {
            this.handleError(error, 'Failed to load time entries');
        }
    }

    // Create a new time entry
    async createEntry(entryData) {
        this.showLoading();
        try {
            const entry = await this.makeRequest('/api/entries', {
                method: 'POST',
                body: JSON.stringify(entryData)
            });
            this.hideLoading();
            return entry;
        } catch (error) {
            this.handleError(error, 'Failed to create time entry');
        }
    }

    // Update an existing time entry
    async updateEntry(entryId, entryData) {
        this.showLoading();
        try {
            const entry = await this.makeRequest(`/api/entries/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify(entryData)
            });
            this.hideLoading();
            return entry;
        } catch (error) {
            this.handleError(error, 'Failed to update time entry');
        }
    }

    // Delete a time entry
    async deleteEntry(entryId) {
        this.showLoading();
        try {
            await this.makeRequest(`/api/entries/${entryId}`, {
                method: 'DELETE'
            });
            this.hideLoading();
            return true;
        } catch (error) {
            this.handleError(error, 'Failed to delete time entry');
        }
    }

    // Settings API methods
    async getSettings() {
        try {
            return await this.makeRequest('/api/settings');
        } catch (error) {
            console.error('Failed to load settings:', error);
            return {};
        }
    }

    async getSetting(key) {
        try {
            return await this.makeRequest(`/api/settings/${key}`);
        } catch (error) {
            if (error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async setSetting(key, value) {
        try {
            return await this.makeRequest(`/api/settings/${key}`, {
                method: 'PUT',
                body: JSON.stringify({ value })
            });
        } catch (error) {
            throw error;
        }
    }

    // Summary API methods
    async getDailySummary(date) {
        try {
            return await this.makeRequest(`/api/summaries/${date}`);
        } catch (error) {
            if (error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    async generateDailySummary(date) {
        try {
            return await this.makeRequest(`/api/summaries/${date}/generate`, {
                method: 'POST'
            });
        } catch (error) {
            throw error;
        }
    }

    async getWeeklySummary(weekStartDate) {
        try {
            return await this.makeRequest(`/api/weekly-summaries/${weekStartDate}`);
        } catch (error) {
            if (error.message?.includes('404')) {
                return null; // No summary found
            }
            throw error;
        }
    }

    async generateWeeklySummary(weekStartDate) {
        try {
            return await this.makeRequest(`/api/weekly-summaries/${weekStartDate}/generate`, {
                method: 'POST'
            });
        } catch (error) {
            throw error;
        }
    }
}

// Create global API instance
const api = new TimeAuditAPI();

// Settings Management
class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
    }

    bindEvents() {
        // Settings button handlers
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('settingsBtn2').addEventListener('click', () => this.openSettingsModal());
        
        // Settings modal handlers
        document.getElementById('closeSettingsModal').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('testClaudeConnection').addEventListener('click', () => this.testClaudeConnection());
        
        // Close modal when clicking outside
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettingsModal();
            }
        });
    }

    async openSettingsModal() {
        await this.loadSettings();
        document.getElementById('settingsModal').style.display = 'block';
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').style.display = 'none';
        this.hideStatus();
    }

    async loadSettings() {
        try {
            const claudeApiKey = await api.getSetting('claude_api_key');
            if (claudeApiKey) {
                document.getElementById('claudeApiKey').value = claudeApiKey.value || '';
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        const claudeApiKey = document.getElementById('claudeApiKey').value.trim();
        
        try {
            if (claudeApiKey) {
                await api.setSetting('claude_api_key', claudeApiKey);
                this.showStatus('Settings saved successfully!', 'success');
            } else {
                this.showStatus('Please enter a Claude API key', 'error');
                return;
            }
        } catch (error) {
            this.showStatus('Failed to save settings', 'error');
            console.error('Settings save error:', error);
        }
    }

    async testClaudeConnection() {
        const claudeApiKey = document.getElementById('claudeApiKey').value.trim();
        
        if (!claudeApiKey) {
            this.showStatus('Please enter a Claude API key first', 'error');
            return;
        }

        try {
            // Call our Flask endpoint instead of Claude directly (fixes CORS)
            const response = await fetch('/api/test-claude', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: claudeApiKey
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(`✅ ${result.message}`, 'success');
            } else {
                this.showStatus(`❌ ${result.message}`, 'error');
            }
        } catch (error) {
            this.showStatus('❌ Connection test failed. Check your internet connection.', 'error');
            console.error('Connection test error:', error);
        }
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('settingsStatus');
        statusDiv.textContent = message;
        statusDiv.className = `settings-status ${type}`;
        statusDiv.style.display = 'block';
    }

    hideStatus() {
        document.getElementById('settingsStatus').style.display = 'none';
    }
}

// Summary Management
class SummaryManager {
    constructor() {
        this.currentDate = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Summary generation
        document.getElementById('generateSummaryBtn').addEventListener('click', () => this.generateSummary());
        
        // Copy summary to clipboard
        document.getElementById('copySummaryBtn').addEventListener('click', () => this.copySummaryToClipboard());
    }

    setCurrentDate(date) {
        this.currentDate = date;
    }

    async loadSummary(date) {
        try {
            const summary = await api.getDailySummary(date);
            if (summary) {
                this.displaySummary(summary);
            } else {
                this.showPlaceholder();
            }
        } catch (error) {
            console.error('Failed to load summary:', error);
            this.showPlaceholder();
        }
    }

    async generateSummary() {
        if (!this.currentDate) {
            alert('No date selected');
            return;
        }

        // Play button sound like other UI elements
        if (window.calendar && window.calendar.playUISound) {
            window.calendar.playUISound('button');
        }

        // Check if Claude API key is configured
        try {
            const claudeApiKey = await api.getSetting('claude_api_key');
            if (!claudeApiKey || !claudeApiKey.value) {
                alert('Please configure your Claude API key in Settings first.');
                return;
            }
        } catch (error) {
            alert('Please configure your Claude API key in Settings first.');
            return;
        }

        // Show loading state (this will hide any existing summary)
        this.showLoading();

        try {
            // Always generate a fresh summary
            const result = await api.generateDailySummary(this.currentDate);
            if (result && result.summary) {
                this.displaySummary(result.summary);
            } else {
                this.hideLoading();
                alert('Failed to generate summary: No summary data received');
            }
        } catch (error) {
            this.hideLoading();
            const errorMessage = error.response?.error || 'Failed to generate summary';
            alert(errorMessage);
            console.error('Summary generation error:', error);
        }
    }

    showPlaceholder() {
        document.getElementById('summaryPlaceholder').style.display = 'block';
        document.getElementById('summaryText').style.display = 'none';
        document.getElementById('summaryMeta').style.display = 'none';
        document.getElementById('summaryLoading').style.display = 'none';
        document.getElementById('copySummaryBtn').style.display = 'none';
    }

    showLoading() {
        document.getElementById('summaryPlaceholder').style.display = 'none';
        document.getElementById('summaryText').style.display = 'none';
        document.getElementById('summaryMeta').style.display = 'none';
        document.getElementById('summaryLoading').style.display = 'flex';
        document.getElementById('copySummaryBtn').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('summaryLoading').style.display = 'none';
    }

    displaySummary(summary) {
        this.hideLoading();
        
        // Format and display the summary text
        const summaryText = this.formatSummaryText(summary.summary);
        document.getElementById('summaryText').innerHTML = summaryText;
        document.getElementById('summaryText').style.display = 'block';
        
        // Show metadata
        let metaText = `Generated on ${new Date(summary.created_at).toLocaleString()}`;
        if (summary.token_count) {
            metaText += ` • ${summary.token_count} tokens used`;
        }
        document.getElementById('summaryMeta').textContent = metaText;
        document.getElementById('summaryMeta').style.display = 'block';
        
        // Hide placeholder and show copy button
        document.getElementById('summaryPlaceholder').style.display = 'none';
        document.getElementById('copySummaryBtn').style.display = 'inline-block';
    }

    formatSummaryText(text) {
        // Convert bullet points and bold headers to HTML
        return text
            .split('\n')
            .map(line => {
                line = line.trim();
                if (line.startsWith('• ') || line.startsWith('- ')) {
                    // Handle bullet points
                    let content = line.substring(2);
                    // Convert **bold** text to HTML
                    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `<div class="summary-bullet">${content}</div>`;
                } else if (line) {
                    // Handle other lines (section headers, etc.)
                    let content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `<div class="summary-line">${content}</div>`;
                }
                return '';
            })
            .filter(line => line)
            .join('');
    }

    async copySummaryToClipboard() {
        // Play button sound like other UI elements
        if (window.calendar && window.calendar.playUISound) {
            window.calendar.playUISound('button');
        }
        
        const summaryText = document.getElementById('summaryText').innerText;
        if (summaryText) {
            try {
                await navigator.clipboard.writeText(summaryText);
                this.showStatus('Summary copied to clipboard!', 'success');
            } catch (error) {
                this.showStatus('Failed to copy summary to clipboard', 'error');
                console.error('Clipboard copy error:', error);
            }
        } else {
            this.showStatus('No summary text to copy', 'error');
        }
    }

    showStatus(message, type) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = `copy-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            font-family: 'Orbitron', monospace;
            font-weight: 600;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s ease;
            border: 2px solid;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            ${type === 'success' ? `
                background: rgba(0, 255, 65, 0.1);
                color: #00ff41;
                border-color: #00ff41;
                text-shadow: 0 0 10px #00ff41;
            ` : `
                background: rgba(255, 0, 102, 0.1);
                color: #ff0066;
                border-color: #ff0066;
                text-shadow: 0 0 10px #ff0066;
            `}
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.style.opacity = '1', 100);
        
        // Hide and remove notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Weekly Summary Management
class WeeklySummaryManager {
    constructor() {
        this.currentWeekStart = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Weekly summary button handlers
        document.getElementById('weeklySummaryBtn').addEventListener('click', () => this.openWeeklySummaryModal());
        document.getElementById('weeklySummaryBtn2').addEventListener('click', () => this.openWeeklySummaryModal());
        
        // Modal handlers
        document.getElementById('closeWeeklySummaryModal').addEventListener('click', () => this.closeWeeklySummaryModal());
        document.getElementById('generateWeeklySummaryBtn').addEventListener('click', () => this.generateWeeklySummary());
        document.getElementById('copyWeeklySummaryBtn').addEventListener('click', () => this.copyWeeklySummaryToClipboard());
        
        // Close modal when clicking outside
        document.getElementById('weeklySummaryModal').addEventListener('click', (e) => {
            if (e.target.id === 'weeklySummaryModal') {
                this.closeWeeklySummaryModal();
            }
        });
    }

    async openWeeklySummaryModal() {
        // Get the currently displayed week from the calendar
        if (window.calendar && window.calendar.getWeekStart) {
            this.currentWeekStart = window.calendar.getWeekStart();
        } else {
            // Fallback to current week if calendar not available
            const today = new Date();
            const dayOfWeek = today.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const monday = new Date(today);
            monday.setDate(today.getDate() - daysToMonday);
            this.currentWeekStart = monday;
        }
        
        // Update modal title with week range
        const sunday = new Date(this.currentWeekStart);
        sunday.setDate(this.currentWeekStart.getDate() + 6);
        const weekRange = `${this.currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        document.getElementById('weeklyDateRange').textContent = `Week of ${weekRange}`;
        
        // Show modal
        document.getElementById('weeklySummaryModal').style.display = 'block';
        
        // Load existing summary if available
        await this.loadWeeklySummary();
    }

    closeWeeklySummaryModal() {
        document.getElementById('weeklySummaryModal').style.display = 'none';
    }

    async loadWeeklySummary() {
        if (!this.currentWeekStart) return;
        
        const weekStartStr = this.formatDate(this.currentWeekStart);
        
        try {
            const summary = await api.getWeeklySummary(weekStartStr);
            if (summary) {
                this.displayWeeklySummary(summary);
            } else {
                this.showWeeklyPlaceholder();
            }
        } catch (error) {
            console.error('Failed to load weekly summary:', error);
            this.showWeeklyPlaceholder();
        }
    }

    async generateWeeklySummary() {
        if (!this.currentWeekStart) {
            alert('No week selected');
            return;
        }

        // Play button sound like other UI elements
        if (window.calendar && window.calendar.playUISound) {
            window.calendar.playUISound('button');
        }

        // Check if Claude API key is configured
        try {
            const claudeApiKey = await api.getSetting('claude_api_key');
            if (!claudeApiKey || !claudeApiKey.value) {
                alert('Please configure your Claude API key in Settings first.');
                return;
            }
        } catch (error) {
            alert('Please configure your Claude API key in Settings first.');
            return;
        }

        // Show loading state
        this.showWeeklyLoading();

        try {
            const weekStartStr = this.formatDate(this.currentWeekStart);
            const result = await api.generateWeeklySummary(weekStartStr);
            if (result && result.summary) {
                this.displayWeeklySummary(result.summary);
            } else {
                this.hideWeeklyLoading();
                alert('Failed to generate weekly summary: No summary data received');
            }
        } catch (error) {
            this.hideWeeklyLoading();
            const errorMessage = error.response?.error || 'Failed to generate weekly summary';
            alert(errorMessage);
            console.error('Weekly summary generation error:', error);
        }
    }

    showWeeklyPlaceholder() {
        document.getElementById('weeklySummaryPlaceholder').style.display = 'block';
        document.getElementById('weeklySummaryText').style.display = 'none';
        document.getElementById('weeklySummaryMeta').style.display = 'none';
        document.getElementById('weeklySummaryLoading').style.display = 'none';
        document.getElementById('copyWeeklySummaryBtn').style.display = 'none';
    }

    showWeeklyLoading() {
        document.getElementById('weeklySummaryPlaceholder').style.display = 'none';
        document.getElementById('weeklySummaryText').style.display = 'none';
        document.getElementById('weeklySummaryMeta').style.display = 'none';
        document.getElementById('weeklySummaryLoading').style.display = 'flex';
        document.getElementById('copyWeeklySummaryBtn').style.display = 'none';
    }

    hideWeeklyLoading() {
        document.getElementById('weeklySummaryLoading').style.display = 'none';
    }

    displayWeeklySummary(summary) {
        this.hideWeeklyLoading();
        
        // Format and display the summary text
        const summaryText = this.formatSummaryText(summary.summary);
        document.getElementById('weeklySummaryText').innerHTML = summaryText;
        document.getElementById('weeklySummaryText').style.display = 'block';
        
        // Show metadata
        let metaText = `Generated on ${new Date(summary.created_at).toLocaleString()}`;
        if (summary.token_count) {
            metaText += ` • ${summary.token_count} tokens used`;
        }
        document.getElementById('weeklySummaryMeta').textContent = metaText;
        document.getElementById('weeklySummaryMeta').style.display = 'block';
        
        // Hide placeholder and show copy button
        document.getElementById('weeklySummaryPlaceholder').style.display = 'none';
        document.getElementById('copyWeeklySummaryBtn').style.display = 'inline-block';
    }

    formatSummaryText(text) {
        // Convert bullet points and bold headers to HTML (same as daily summary)
        return text
            .split('\n')
            .map(line => {
                line = line.trim();
                if (line.startsWith('• ') || line.startsWith('- ')) {
                    // Handle bullet points
                    let content = line.substring(2);
                    // Convert **bold** text to HTML
                    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `<div class="summary-bullet">${content}</div>`;
                } else if (line) {
                    // Handle other lines (section headers, etc.)
                    let content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `<div class="summary-line">${content}</div>`;
                }
                return '';
            })
            .filter(line => line)
            .join('');
    }

    async copyWeeklySummaryToClipboard() {
        // Play button sound like other UI elements
        if (window.calendar && window.calendar.playUISound) {
            window.calendar.playUISound('button');
        }
        
        const summaryText = document.getElementById('weeklySummaryText').innerText;
        if (summaryText) {
            try {
                await navigator.clipboard.writeText(summaryText);
                this.showStatus('Weekly summary copied to clipboard!', 'success');
            } catch (error) {
                this.showStatus('Failed to copy weekly summary to clipboard', 'error');
                console.error('Clipboard copy error:', error);
            }
        } else {
            this.showStatus('No weekly summary text to copy', 'error');
        }
    }

    showStatus(message, type) {
        // Create a temporary notification (same as daily summary)
        const notification = document.createElement('div');
        notification.className = `copy-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            font-family: 'Orbitron', monospace;
            font-weight: 600;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s ease;
            border: 2px solid;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            ${type === 'success' ? `
                background: rgba(0, 255, 65, 0.1);
                color: #00ff41;
                border-color: #00ff41;
                text-shadow: 0 0 10px #00ff41;
            ` : `
                background: rgba(255, 0, 102, 0.1);
                color: #ff0066;
                border-color: #ff0066;
                text-shadow: 0 0 10px #ff0066;
            `}
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.style.opacity = '1', 100);
        
        // Hide and remove notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}

// Initialize managers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Make managers globally accessible
    window.settingsManager = new SettingsManager();
    window.summaryManager = new SummaryManager();
    window.weeklySummaryManager = new WeeklySummaryManager();
}); 