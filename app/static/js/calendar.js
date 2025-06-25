// Main calendar application logic

class TimeAuditCalendar {
    constructor() {
        this.currentWeekStart = null;
        this.entries = [];
        this.editingEntry = null;
        this.init();
    }

    // Initialize the calendar
    init() {
        this.setCurrentWeek();
        this.bindEvents();
        this.populateTimeSelect();
        this.loadCalendar();
    }

    // Get Monday of current week
    setCurrentWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysToMonday);
        this.currentWeekStart = monday;
    }

    // Format date as YYYY-MM-DD
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Parse date string to Date object
    parseDate(dateStr) {
        return new Date(dateStr + 'T00:00:00');
    }

    // Get week start date for navigation
    getWeekStart(offset = 0) {
        const date = new Date(this.currentWeekStart);
        date.setDate(date.getDate() + (offset * 7));
        return date;
    }

    // Update week display
    updateWeekDisplay() {
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const startStr = this.currentWeekStart.toLocaleDateString('en-US', options);
        const endStr = weekEnd.toLocaleDateString('en-US', options);
        
        document.getElementById('weekRange').textContent = `${startStr} - ${endStr}`;
    }

    // Bind event listeners
    bindEvents() {
        // Week navigation
        document.getElementById('prevWeek').addEventListener('click', () => {
            this.currentWeekStart = this.getWeekStart(-1);
            this.loadCalendar();
        });

        document.getElementById('nextWeek').addEventListener('click', () => {
            this.currentWeekStart = this.getWeekStart(1);
            this.loadCalendar();
        });

        document.getElementById('currentWeek').addEventListener('click', () => {
            this.setCurrentWeek();
            this.loadCalendar();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            this.deleteCurrentEntry();
        });

        // Form submission
        document.getElementById('entryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEntry();
        });

        // Activity textarea character counter
        const activityTextarea = document.getElementById('entryActivity');
        const charCount = document.getElementById('charCount');
        
        activityTextarea.addEventListener('input', () => {
            charCount.textContent = activityTextarea.value.length;
        });

        // Close modal when clicking outside
        document.getElementById('entryModal').addEventListener('click', (e) => {
            if (e.target.id === 'entryModal') {
                this.closeModal();
            }
        });
    }

    // Convert 24-hour time to 12-hour AM/PM format
    formatTimeAMPM(hour, minute) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const minuteStr = minute.toString().padStart(2, '0');
        return `${displayHour}:${minuteStr} ${period}`;
    }

    // Populate time select with 30-minute intervals
    populateTimeSelect() {
        const timeSelect = document.getElementById('entryTime');
        timeSelect.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeStr24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const timeStrAMPM = this.formatTimeAMPM(hour, minute);
                const option = document.createElement('option');
                option.value = timeStr24; // Keep 24-hour format for backend
                option.textContent = timeStrAMPM; // Display AM/PM format
                timeSelect.appendChild(option);
            }
        }
    }

    // Load calendar data and render
    async loadCalendar() {
        try {
            this.updateWeekDisplay();
            const weekStartStr = this.formatDate(this.currentWeekStart);
            this.entries = await api.getEntries(weekStartStr);
            this.renderCalendar();
        } catch (error) {
            console.error('Failed to load calendar:', error);
        }
    }

    // Render the calendar grid
    renderCalendar() {
        // Create day headers
        this.createDayHeaders();
        
        // Create calendar grid
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';

        // Create time rows (48 rows for 24 hours)
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                this.createTimeRow(hour, minute);
            }
        }
    }

    // Create day headers (separate from scrollable grid)
    createDayHeaders() {
        const calendarHeader = document.getElementById('calendarHeader');
        
        // Remove existing day headers (keep the corner cell)
        const existingHeaders = calendarHeader.querySelectorAll('.day-header');
        existingHeaders.forEach(header => header.remove());
        
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(this.currentWeekStart);
            dayDate.setDate(dayDate.getDate() + i);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            
            const dayName = document.createElement('div');
            dayName.className = 'day-name';
            dayName.textContent = dayNames[i];
            
            const dayDateEl = document.createElement('div');
            dayDateEl.className = 'day-date';
            dayDateEl.textContent = dayDate.getDate();
            
            dayHeader.appendChild(dayName);
            dayHeader.appendChild(dayDateEl);
            calendarHeader.appendChild(dayHeader);
        }
    }

    // Create time row for specific hour and minute
    createTimeRow(hour, minute) {
        const calendar = document.getElementById('calendar');
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Create time label for this row
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = this.formatTimeAMPM(hour, minute);
        calendar.appendChild(timeLabel);
        
        // Create time slots for each day in this row
        for (let day = 0; day < 7; day++) {
            const slotDate = new Date(this.currentWeekStart);
            slotDate.setDate(slotDate.getDate() + day);
            const dateStr = this.formatDate(slotDate);
            
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.dataset.date = dateStr;
            timeSlot.dataset.time = timeStr;
            
            // Check if there's an entry for this slot
            const entry = this.entries.find(e => 
                e.date === dateStr && e.start_time === timeStr
            );
            
            if (entry) {
                timeSlot.classList.add('has-entry');
                timeSlot.appendChild(this.createEntryElement(entry));
                timeSlot.addEventListener('click', () => this.editEntry(entry));
            } else {
                timeSlot.addEventListener('click', () => this.addEntry(dateStr, timeStr));
            }
            
            calendar.appendChild(timeSlot);
        }
    }

    // Create entry element for display
    createEntryElement(entry) {
        const entryEl = document.createElement('div');
        entryEl.className = `entry ${entry.type} ${entry.energy_impact}`;
        
        const activityEl = document.createElement('div');
        activityEl.className = 'entry-activity';
        activityEl.textContent = entry.activity;
        
        const metaEl = document.createElement('div');
        metaEl.className = 'entry-meta';
        
        const typeEl = document.createElement('span');
        typeEl.className = `entry-type ${entry.type}`;
        typeEl.textContent = entry.type.charAt(0).toUpperCase();
        
        metaEl.appendChild(typeEl);
        
        entryEl.appendChild(activityEl);
        entryEl.appendChild(metaEl);
        
        return entryEl;
    }

    // Open modal to add new entry
    addEntry(date, time) {
        this.editingEntry = null;
        this.openModal('Add Time Entry');
        
        document.getElementById('entryDate').value = date;
        document.getElementById('entryTime').value = time;
        document.getElementById('entryActivity').value = '';
        document.getElementById('charCount').textContent = '0';
        
        // Reset radio buttons
        document.querySelectorAll('input[name="type"]').forEach(input => input.checked = false);
        document.querySelectorAll('input[name="energy_impact"]').forEach(input => input.checked = false);
        
        document.getElementById('deleteBtn').style.display = 'none';
    }

    // Open modal to edit existing entry
    editEntry(entry) {
        this.editingEntry = entry;
        this.openModal('Edit Time Entry');
        
        document.getElementById('entryDate').value = entry.date;
        document.getElementById('entryTime').value = entry.start_time;
        document.getElementById('entryActivity').value = entry.activity;
        document.getElementById('charCount').textContent = entry.activity.length;
        
        // Set radio buttons
        document.querySelector(`input[name="type"][value="${entry.type}"]`).checked = true;
        document.querySelector(`input[name="energy_impact"][value="${entry.energy_impact}"]`).checked = true;
        
        document.getElementById('deleteBtn').style.display = 'inline-block';
    }

    // Open modal
    openModal(title) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('entryModal').style.display = 'block';
        document.getElementById('entryActivity').focus();
    }

    // Close modal
    closeModal() {
        document.getElementById('entryModal').style.display = 'none';
        this.editingEntry = null;
    }

    // Save entry (create or update)
    async saveEntry() {
        const formData = new FormData(document.getElementById('entryForm'));
        const entryData = {
            date: formData.get('date'),
            start_time: formData.get('start_time'),
            activity: formData.get('activity').trim(),
            type: formData.get('type'),
            energy_impact: formData.get('energy_impact')
        };

        // Basic validation
        if (!entryData.activity) {
            alert('Please enter an activity description');
            return;
        }

        if (!entryData.type) {
            alert('Please select an activity type');
            return;
        }

        if (!entryData.energy_impact) {
            alert('Please select an energy impact');
            return;
        }

        try {
            if (this.editingEntry) {
                await api.updateEntry(this.editingEntry.id, entryData);
            } else {
                await api.createEntry(entryData);
            }
            
            this.closeModal();
            this.loadCalendar();
        } catch (error) {
            console.error('Failed to save entry:', error);
        }
    }

    // Delete current entry
    async deleteCurrentEntry() {
        if (!this.editingEntry) return;
        
        if (confirm('Are you sure you want to delete this entry?')) {
            try {
                await api.deleteEntry(this.editingEntry.id);
                this.closeModal();
                this.loadCalendar();
            } catch (error) {
                console.error('Failed to delete entry:', error);
            }
        }
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TimeAuditCalendar();
}); 