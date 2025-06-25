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
}

// Create global API instance
const api = new TimeAuditAPI(); 