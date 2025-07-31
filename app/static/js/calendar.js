// Main calendar application logic

class TimeAuditCalendar {
    constructor() {
        this.currentWeekStart = null;
        this.entries = [];
        this.editingEntry = null;
        this.audioContext = null;
        this.lastNotificationTime = null;
        this.hoverTimeout = null;
        this.tooltip = null;
        this.hasInitiallyLoaded = false;
        this.draggedEntry = null;
        this.draggedElement = null;
        this.init();
    }

    // Initialize the calendar
    init() {
        this.setCurrentWeek();
        this.bindEvents();
        this.populateTimeSelect();
        this.loadCalendar();
        this.startTimeTracking();
        this.createTooltip();
        this.createCurrentTimeLine();
        this.updateCurrentTimeLine();
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

        // Update day headers on window resize (for mobile rotation)
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.createDayHeaders();
                // Redraw energy graph if day detail view is visible
                if (document.getElementById('dayDetailView').style.display !== 'none') {
                    this.loadDayDetail();
                }
            }, 250);
        });
    }

    // Start time tracking notifications
    startTimeTracking() {
        // Check every 30 seconds
        setInterval(() => {
            this.checkTimeForNotification();
        }, 30000);
        
        // Also check immediately
        this.checkTimeForNotification();
    }

    // Check if it's time for a notification
    checkTimeForNotification() {
        const now = new Date();
        const minutes = now.getMinutes();
        const currentTime = `${now.getHours()}:${minutes.toString().padStart(2, '0')}`;
        
        // Only notify at :00 and :30
        if (minutes === 0 || minutes === 30) {
            // Prevent duplicate notifications within the same minute
            if (this.lastNotificationTime !== currentTime) {
                this.lastNotificationTime = currentTime;
                this.showTimeTrackingReminder();
            }
        }
    }

    // Show professional time tracking reminder
    showTimeTrackingReminder() {
        // Don't show multiple reminders at once
        if (document.getElementById('time-tracking-reminder')) {
            return;
        }

        // Create subtle notification that matches the app's aesthetic
        const notification = document.createElement('div');
        notification.id = 'time-tracking-reminder';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #faf8f5;
            border: 1px solid #e6ddd4;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 4px 6px -1px rgba(44, 36, 22, 0.12), 0 2px 4px -1px rgba(44, 36, 22, 0.08);
            z-index: 10000;
            max-width: 320px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #2c2416;
            animation: slideInRight 0.3s ease-out;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            color: #8b4513;
        `;
        header.innerHTML = '⏰ Time Tracking Reminder';

        const message = document.createElement('div');
        message.style.cssText = `
            font-size: 14px;
            color: #5d5347;
            margin-bottom: 12px;
            line-height: 1.5;
        `;
        message.textContent = 'Time to log your recent activities and maintain your productivity tracking.';

        const dismissBtn = document.createElement('button');
        dismissBtn.style.cssText = `
            background: #f5f2ed;
            color: #2c2416;
            border: 1px solid #e6ddd4;
            padding: 6px 12px;
            border-radius: 8px;
            font-family: inherit;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            float: right;
        `;
        dismissBtn.textContent = 'Dismiss';

        dismissBtn.addEventListener('mouseenter', () => {
            dismissBtn.style.background = '#ede8e1';
            dismissBtn.style.borderColor = '#8b4513';
            dismissBtn.style.transform = 'translateY(-1px)';
        });

        dismissBtn.addEventListener('mouseleave', () => {
            dismissBtn.style.background = '#f5f2ed';
            dismissBtn.style.borderColor = '#e6ddd4';
            dismissBtn.style.transform = 'translateY(0)';
        });

        // Dismiss functionality
        dismissBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        });

        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                dismissBtn.click();
            }
        }, 8000);

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { 
                    transform: translateX(100%);
                    opacity: 0;
                }
                to { 
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from { 
                    transform: translateX(0);
                    opacity: 1;
                }
                to { 
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        notification.appendChild(header);
        notification.appendChild(message);
        notification.appendChild(dismissBtn);
        document.body.appendChild(notification);

        // Allow ESC key to dismiss
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                dismissBtn.click();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Create tooltip element
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'entry-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 16px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 400;
            color: #1f2937;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            z-index: 999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            max-width: 300px;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        document.body.appendChild(this.tooltip);
    }

    // Add tooltip events to entry element
    addTooltipEvents(entryEl, entry) {
        let isHovering = false;

        entryEl.addEventListener('mouseenter', (e) => {
            isHovering = true;
            
            // Don't show tooltip if currently dragging
            if (this.draggedEntry) {
                return;
            }
            
            // Clear any existing timeout
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
            }

            // Set timeout for 1 second
            this.hoverTimeout = setTimeout(() => {
                if (isHovering && !this.draggedEntry) {
                    this.showTooltip(e, entry);
                }
            }, 1000);
        });

        entryEl.addEventListener('mouseleave', () => {
            isHovering = false;
            
            // Clear timeout
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }

            this.hideTooltip();
        });

        entryEl.addEventListener('mousemove', (e) => {
            if (this.tooltip.style.opacity === '1') {
                this.positionTooltip(e);
            }
        });
    }

    // Show tooltip with entry details
    showTooltip(event, entry) {
        if (!this.tooltip) return;
        
        // Don't show tooltip if modal is open
        const modal = document.getElementById('entryModal');
        if (modal && modal.style.display === 'block') {
            return;
        }

        const tooltipContent = `
${entry.activity}

Time: ${entry.start_time} - ${entry.end_time}
Type: ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
Energy: ${entry.energy_impact.charAt(0).toUpperCase() + entry.energy_impact.slice(1)}
        `.trim();

        this.tooltip.textContent = tooltipContent;
        this.positionTooltip(event);
        this.tooltip.style.opacity = '1';
    }

    // Position tooltip near cursor
    positionTooltip(event) {
        if (!this.tooltip) return;

        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = event.clientX + 15;
        let top = event.clientY - 10;

        // Adjust if tooltip goes off right edge
        if (left + tooltipRect.width > viewportWidth - 20) {
            left = event.clientX - tooltipRect.width - 15;
        }

        // Adjust if tooltip goes off bottom edge
        if (top + tooltipRect.height > viewportHeight - 20) {
            top = event.clientY - tooltipRect.height - 10;
        }

        // Ensure tooltip doesn't go off left or top edges
        left = Math.max(10, left);
        top = Math.max(10, top);

        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }

    // Hide tooltip
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
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
            
            // Only scroll to morning on initial load
            if (!this.hasInitiallyLoaded) {
                this.scrollToMorning();
                this.hasInitiallyLoaded = true;
            }
            
            this.createCurrentTimeLine();
            this.updateCurrentTimeLine();
        } catch (error) {
            console.error('Failed to load calendar:', error);
        }
    }

    // Scroll to 7:00 AM area
    scrollToMorning() {
        // Wait a bit for the DOM to be fully rendered
        setTimeout(() => {
            const calendarBody = document.querySelector('.calendar-body');
            if (calendarBody) {
                            // 7:00 AM is the 14th time slot (0:00, 0:30, 1:00, 1:30, ... 7:00)
            // Each time slot is 70px tall in desktop, 40px in mobile landscape
            const isMobile = window.innerWidth <= 926;
            const slotHeight = isMobile ? 40 : 70;
                const morningSlot = 14; // 7:00 AM
                const scrollPosition = morningSlot * slotHeight;
                
                // Smooth scroll to the morning position
                calendarBody.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }

    // Create current time line element
    createCurrentTimeLine() {
        // Remove existing line if it exists
        const existingLine = document.getElementById('current-time-line');
        if (existingLine) {
            existingLine.remove();
        }

        // Create the current time line
        this.currentTimeLine = document.createElement('div');
        this.currentTimeLine.id = 'current-time-line';
        this.currentTimeLine.style.cssText = `
            position: absolute;
            left: 80px;
            right: 0;
            height: 2px;
            border-top: 2px dotted #5a7c5a;
            z-index: 1000;
            pointer-events: none;
            opacity: 0.7;
        `;

        // Remove any existing time line styles
        const existingStyle = document.getElementById('current-time-style');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Add to calendar grid (which has the time slots)
        const calendarGrid = document.getElementById('calendar');
        if (calendarGrid) {
            // Ensure the calendar grid has relative positioning
            calendarGrid.style.position = 'relative';
            calendarGrid.appendChild(this.currentTimeLine);
        }
    }

    // Update current time line position
    updateCurrentTimeLine() {
        if (!this.currentTimeLine) return;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Calculate position based on current time
        // Each hour has 2 slots (30-minute intervals)
        const totalMinutes = currentHour * 60 + currentMinute;
        const slotIndex = Math.floor(totalMinutes / 30);
        const minutesIntoSlot = totalMinutes % 30;
        
        // Calculate pixel position
        const isMobile = window.innerWidth <= 926;
        const slotHeight = isMobile ? 40 : 70;
        const progressInSlot = minutesIntoSlot / 30; // 0 to 1
        const pixelPosition = (slotIndex * slotHeight) + (progressInSlot * slotHeight);

        // Update position
        this.currentTimeLine.style.top = pixelPosition + 'px';

        // Schedule next update in 1 minute
        setTimeout(() => {
            this.updateCurrentTimeLine();
        }, 60000);
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
        
        // Use abbreviated names on mobile (768px and below)
        const isMobile = window.innerWidth <= 768;
        const dayNames = isMobile 
            ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
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
            
            // Add click handler for day detail view
            dayHeader.addEventListener('click', () => {
                this.showDayDetail(dayDate);
            });
            
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
                timeSlot.addEventListener('click', () => {
                    this.editEntry(entry);
                });
            } else {
                timeSlot.addEventListener('click', () => {
                    this.addEntry(dateStr, timeStr);
                });
            }
            
            // Add drop zone functionality
            this.addDropZoneEvents(timeSlot);
            
            calendar.appendChild(timeSlot);
        }
    }

    // Create entry element for display
    createEntryElement(entry) {
        const entryEl = document.createElement('div');
        entryEl.className = `entry ${entry.type} ${entry.energy_impact}`;
        entryEl.draggable = true;
        entryEl.dataset.entryId = entry.id;
        
        const activityEl = document.createElement('div');
        activityEl.className = 'entry-activity';
        activityEl.textContent = entry.activity;
        
        const metaEl = document.createElement('div');
        metaEl.className = 'entry-meta';
        
        const typeEl = document.createElement('span');
        typeEl.className = `entry-type ${entry.type}`;
        typeEl.textContent = entry.type.charAt(0).toUpperCase();
        
        const energyEl = document.createElement('span');
        energyEl.className = `entry-energy ${entry.energy_impact}`;
        energyEl.textContent = this.getEnergyIcon(entry.energy_impact);
        
        metaEl.appendChild(typeEl);
        metaEl.appendChild(energyEl);
        
        entryEl.appendChild(activityEl);
        entryEl.appendChild(metaEl);
        
        // Add tooltip functionality
        this.addTooltipEvents(entryEl, entry);
        
        // Add drag and drop functionality
        this.addDragEvents(entryEl, entry);
        
        return entryEl;
    }

    // Add drag events to entry element
    addDragEvents(entryEl, entry) {
        entryEl.addEventListener('dragstart', (e) => {
            this.draggedEntry = entry;
            this.draggedElement = entryEl;
            entryEl.style.opacity = '0.5';
            
            // Hide tooltip and clear any pending timeouts
            this.hideTooltip();
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', entryEl.outerHTML);
        });

        entryEl.addEventListener('dragend', (e) => {
            entryEl.style.opacity = '1';
            this.draggedEntry = null;
            this.draggedElement = null;
        });
    }

    // Add drop zone events to time slot
    addDropZoneEvents(timeSlot) {
        timeSlot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Only highlight if slot is empty or different from source
            if (!timeSlot.classList.contains('has-entry') || 
                (this.draggedEntry && 
                 (timeSlot.dataset.date !== this.draggedEntry.date || 
                  timeSlot.dataset.time !== this.draggedEntry.start_time))) {
                timeSlot.classList.add('drop-target');
            }
        });

        timeSlot.addEventListener('dragleave', (e) => {
            timeSlot.classList.remove('drop-target');
        });

        timeSlot.addEventListener('drop', (e) => {
            e.preventDefault();
            timeSlot.classList.remove('drop-target');
            
            if (this.draggedEntry) {
                const newDate = timeSlot.dataset.date;
                const newTime = timeSlot.dataset.time;
                
                // Don't drop on same slot
                if (newDate === this.draggedEntry.date && newTime === this.draggedEntry.start_time) {
                    return;
                }
                
                // Don't drop on occupied slot
                if (timeSlot.classList.contains('has-entry')) {
                    return;
                }
                
                this.moveEntry(this.draggedEntry, newDate, newTime);
            }
        });
    }

    // Move entry to new date/time
    async moveEntry(entry, newDate, newTime) {
        try {
            const updatedEntry = {
                ...entry,
                date: newDate,
                start_time: newTime
            };
            
            await api.updateEntry(entry.id, updatedEntry);
            this.loadCalendar(); // Refresh to show new position
        } catch (error) {
            console.error('Failed to move entry:', error);
        }
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
        
        // Hide tooltip when modal opens
        this.hideTooltip();
        
        // Clear any pending tooltip timeouts
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        
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
        
        try {
            await api.deleteEntry(this.editingEntry.id);
            this.closeModal();
            this.loadCalendar();
        } catch (error) {
            console.error('Failed to delete entry:', error);
        }
    }

    // Day Detail View Methods
    showDayDetail(date) {
        // Handle both Date objects and date strings
        if (date instanceof Date) {
            this.selectedDate = date;
        } else {
            this.selectedDate = this.parseDate(date);
        }
        
        this.updateDayTitle();
        this.loadDayDetail();
        this.bindDayDetailEvents();
        
        // Update summary manager with properly formatted date string
        if (window.summaryManager) {
            const formattedDate = this.formatDate(this.selectedDate);
            window.summaryManager.setCurrentDate(formattedDate);
            // Load summary if currently on summary tab
            const summaryTab = document.getElementById('summaryTab');
            if (summaryTab && summaryTab.classList.contains('active')) {
                window.summaryManager.loadSummary(formattedDate);
            }
        }
        
        // Switch to day detail view
        document.getElementById('calendarView').style.display = 'none';
        document.getElementById('dayDetailView').style.display = 'block';
        
        // Open settings modal if either settings button is clicked
        document.getElementById('settingsBtn2').addEventListener('click', () => {
            if (window.settingsManager) {
                window.settingsManager.openSettingsModal();
            }
        });
    }

    hideDayDetail() {
        // Switch back to calendar view
        document.getElementById('dayDetailView').style.display = 'none';
        document.getElementById('calendarView').style.display = 'block';
    }

    bindDayDetailEvents() {
        // Remove existing listeners to prevent duplicates
        const backBtn = document.getElementById('backToCalendar');
        const prevBtn = document.getElementById('prevDay');
        const nextBtn = document.getElementById('nextDay');
        
        // Clone and replace to remove all listeners
        [backBtn, prevBtn, nextBtn].forEach(btn => {
            if (btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            }
        });
        
        // Add new listeners
        document.getElementById('backToCalendar').addEventListener('click', () => {
            this.hideDayDetail();
        });

        document.getElementById('prevDay').addEventListener('click', () => {
            this.selectedDate.setDate(this.selectedDate.getDate() - 1);
            this.updateDayTitle();
            this.loadDayDetail();
            // Update summary manager with new date
            if (window.summaryManager) {
                const formattedDate = this.formatDate(this.selectedDate);
                window.summaryManager.setCurrentDate(formattedDate);
                // If Summary tab is active, load summary for new date
                const summaryTab = document.getElementById('summaryTab');
                if (summaryTab && summaryTab.classList.contains('active')) {
                    window.summaryManager.loadSummary(formattedDate);
                }
            }
        });

        document.getElementById('nextDay').addEventListener('click', () => {
            this.selectedDate.setDate(this.selectedDate.getDate() + 1);
            this.updateDayTitle();
            this.loadDayDetail();
            // Update summary manager with new date
            if (window.summaryManager) {
                const formattedDate = this.formatDate(this.selectedDate);
                window.summaryManager.setCurrentDate(formattedDate);
                // If Summary tab is active, load summary for new date
                const summaryTab = document.getElementById('summaryTab');
                if (summaryTab && summaryTab.classList.contains('active')) {
                    window.summaryManager.loadSummary(formattedDate);
                }
            }
        });

        // Tab switching
        document.getElementById('energyTab').addEventListener('click', () => {
            this.switchTab('energy');
        });

        document.getElementById('timelineTab').addEventListener('click', () => {
            this.switchTab('timeline');
        });

        // Summary tab switching
        if (document.getElementById('summaryTab')) {
            document.getElementById('summaryTab').addEventListener('click', () => {
                this.switchTab('summary');
            });
        }
    }

    switchTab(tabName) {
        // Remove active class from all tabs and panels
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        // Add active class to selected tab and panel
        if (tabName === 'energy') {
            document.getElementById('energyTab').classList.add('active');
            document.getElementById('energyTabContent').classList.add('active');
            // Redraw graph when switching to energy tab to ensure proper sizing
            setTimeout(() => {
                const formattedDate = this.formatDate(this.selectedDate);
                const dayEntries = this.entries.filter(entry => entry.date === formattedDate);
                console.log(`Switching to energy tab for ${formattedDate}, found ${dayEntries.length} entries`);
                this.drawEnergyGraph(dayEntries);
            }, 150); // Increased delay to ensure tab is fully visible
        } else if (tabName === 'timeline') {
            document.getElementById('timelineTab').classList.add('active');
            document.getElementById('timelineTabContent').classList.add('active');
        } else if (tabName === 'summary') {
            document.getElementById('summaryTab').classList.add('active');
            document.getElementById('summaryTabContent').classList.add('active');
            // Update summary manager and load summary for current date
            if (window.summaryManager) {
                const formattedDate = this.formatDate(this.selectedDate);
                window.summaryManager.setCurrentDate(formattedDate);
                window.summaryManager.loadSummary(formattedDate);
            }
        }
    }

    updateDayTitle() {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const title = this.selectedDate.toLocaleDateString('en-US', options);
        document.getElementById('dayTitle').textContent = title;
    }

    async loadDayDetail() {
        const formattedDate = this.formatDate(this.selectedDate);
        
        // Update summary manager with current date whenever day detail loads
        if (window.summaryManager) {
            window.summaryManager.setCurrentDate(formattedDate);
        }
        
        // Get entries for this day
        const dayEntries = this.entries.filter(entry => entry.date === formattedDate);
        
        console.log(`Loading day detail for ${formattedDate}, found ${dayEntries.length} entries`);
        
        // Update statistics
        this.updateDayStats(dayEntries);
        
        // Update timeline
        this.updateDayTimeline(dayEntries);
        
        // Ensure energy graph is drawn if energy tab is active (default)
        const energyTab = document.getElementById('energyTab');
        if (energyTab && energyTab.classList.contains('active')) {
            setTimeout(() => {
                this.drawEnergyGraph(dayEntries);
            }, 100);
        }
    }

    updateDayStats(entries) {
        // Basic stats
        document.getElementById('totalEntries').textContent = entries.length;
        
        // Time tracked (each entry is 30 minutes)
        const totalMinutes = entries.length * 30;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        document.getElementById('timeTracked').textContent = `${hours}h ${minutes}m`;
        
        // Type breakdown
        const plannedCount = entries.filter(e => e.type === 'planned').length;
        const reactiveCount = entries.filter(e => e.type === 'reactive').length;
        document.getElementById('plannedCount').textContent = plannedCount;
        document.getElementById('reactiveCount').textContent = reactiveCount;
        
        // Draw energy graph
        this.drawEnergyGraph(entries);
    }

    drawEnergyGraph(entries) {
        const canvas = document.getElementById('energyGraph');
        if (!canvas) {
            console.error('Energy graph canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size for high DPI displays
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            console.log('Canvas has no dimensions, retrying...');
            // Retry after a short delay if canvas isn't ready
            setTimeout(() => this.drawEnergyGraph(entries), 100);
            return;
        }
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        console.log(`Drawing energy graph with ${entries.length} entries for date:`, this.formatDate(this.selectedDate));
        
        if (entries.length === 0) {
            // Draw empty state
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No data for this day', rect.width / 2, rect.height / 2);
            return;
        }
        
        // Sort entries by time
        const sortedEntries = entries.sort((a, b) => {
            return a.start_time.localeCompare(b.start_time);
        });
        
        console.log('Sorted entries:', sortedEntries.map(e => `${e.start_time}: ${e.energy_impact}`));
        
        // Calculate cumulative energy levels
        const dataPoints = [];
        let cumulativeEnergy = 0;
        
        // Add starting point at beginning of day
        dataPoints.push({ time: '00:00', energy: 0 });
        
        sortedEntries.forEach(entry => {
            // Add energy value based on impact
            const energyValue = entry.energy_impact === 'energised' ? 1 : 
                               entry.energy_impact === 'drained' ? -1 : 0;
            cumulativeEnergy += energyValue;
            
            dataPoints.push({
                time: entry.start_time,
                energy: cumulativeEnergy,
                type: entry.energy_impact
            });
        });
        
        console.log('Data points:', dataPoints);
        
        // Drawing parameters
        const padding = 40;
        const graphWidth = rect.width - (padding * 2);
        const graphHeight = rect.height - (padding * 2);
        
        // Find min/max energy for scaling
        const energyValues = dataPoints.map(p => p.energy);
        const minEnergy = Math.min(0, Math.min(...energyValues));
        const maxEnergy = Math.max(0, Math.max(...energyValues));
        const energyRange = Math.max(1, maxEnergy - minEnergy);
        
        // Convert time to minutes for easier calculation
        const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        
        // Draw grid lines
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        // Vertical grid lines (every 4 hours)
        for (let hour = 0; hour <= 24; hour += 4) {
            const x = padding + (hour / 24) * graphWidth;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + graphHeight);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (i / gridLines) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + graphWidth, y);
            ctx.stroke();
        }
        
        // Draw zero line
        const zeroY = padding + graphHeight - ((0 - minEnergy) / energyRange) * graphHeight;
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, zeroY);
        ctx.lineTo(padding + graphWidth, zeroY);
        ctx.stroke();
        
        // Draw energy line
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        dataPoints.forEach((point, index) => {
            const x = padding + (timeToMinutes(point.time) / (24 * 60)) * graphWidth;
            const y = padding + graphHeight - ((point.energy - minEnergy) / energyRange) * graphHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw data points
        dataPoints.forEach((point, index) => {
            if (index === 0) return; // Skip the starting point
            
            const x = padding + (timeToMinutes(point.time) / (24 * 60)) * graphWidth;
            const y = padding + graphHeight - ((point.energy - minEnergy) / energyRange) * graphHeight;
            
            // Color based on energy type
            const colors = {
                'energised': '#10b981',
                'neutral': '#6b7280',
                'drained': '#ef4444'
            };
            
            ctx.fillStyle = colors[point.type] || '#6b7280';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Draw axes labels
        ctx.fillStyle = '#2563eb';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        
        // Time labels
        for (let hour = 0; hour <= 24; hour += 4) {
            const x = padding + (hour / 24) * graphWidth;
            const timeStr = hour === 0 ? '12 AM' : 
                          hour === 12 ? '12 PM' : 
                          hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
            ctx.fillText(timeStr, x, rect.height - 10);
        }
        
        // Energy level labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= gridLines; i++) {
            const energy = minEnergy + (i / gridLines) * energyRange;
            const y = padding + graphHeight - (i / gridLines) * graphHeight;
            ctx.fillText(energy.toFixed(0), padding - 15, y + 4);
        }
        
        // Axis titles
        ctx.fillStyle = '#1f2937';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Time', rect.width / 2, rect.height - 25);
        
        ctx.save();
        ctx.translate(15, rect.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Energy Level', 0, 0);
        ctx.restore();
    }

    updateDayTimeline(entries) {
        const timeline = document.getElementById('dayTimeline');
        
        if (entries.length === 0) {
            timeline.innerHTML = '<div class="empty-timeline">No entries recorded for this day</div>';
            return;
        }
        
        // Sort entries by time
        const sortedEntries = entries.sort((a, b) => {
            return a.start_time.localeCompare(b.start_time);
        });
        
        // Build timeline HTML
        let html = '';
        sortedEntries.forEach(entry => {
            const [hour, minute] = entry.start_time.split(':').map(Number);
            const timeStr = this.formatTimeAMPM(hour, minute);
            
            html += `
                <div class="timeline-entry">
                    <div class="timeline-time">${timeStr}</div>
                    <div class="timeline-content">
                        <div class="timeline-activity">${entry.activity.replace(/\n/g, '<br>')}</div>
                        <div class="timeline-meta">
                            <span class="timeline-type ${entry.type}">${entry.type}</span>
                            <span class="timeline-energy ${entry.energy_impact}">
                                ${this.getEnergyIcon(entry.energy_impact)} ${this.capitalizeFirst(entry.energy_impact)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        timeline.innerHTML = html;
    }

    getEnergyIcon(energyLevel) {
        switch (energyLevel) {
            case 'energised': return '⚡';
            case 'neutral': return '➖';
            case 'drained': return '🔋';
            default: return '';
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new TimeAuditCalendar();
}); 