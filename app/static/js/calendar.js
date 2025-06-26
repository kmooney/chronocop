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
        this.init();
    }

    // Initialize the calendar
    init() {
        this.setCurrentWeek();
        this.bindEvents();
        this.populateTimeSelect();
        this.loadCalendar();
        this.initAudio();
        this.startTimeTracking();
        this.createTooltip();
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
            this.playUISound('nav');
            this.currentWeekStart = this.getWeekStart(-1);
            this.loadCalendar();
        });

        document.getElementById('nextWeek').addEventListener('click', () => {
            this.playUISound('nav');
            this.currentWeekStart = this.getWeekStart(1);
            this.loadCalendar();
        });

        document.getElementById('currentWeek').addEventListener('click', () => {
            this.playUISound('button');
            this.setCurrentWeek();
            this.loadCalendar();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.playUISound('close');
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.playUISound('button');
            this.closeModal();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            this.playUISound('button');
            this.deleteCurrentEntry();
        });

        // Form submission
        document.getElementById('entryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.playUISound('button');
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

        // Initialize audio on first user interaction
        document.addEventListener('click', () => {
            this.initAudio();
        }, { once: true });

        // Update day headers on window resize (for mobile rotation)
        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.createDayHeaders();
            }, 250);
        });
    }

    // Initialize Web Audio API
    initAudio() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.log('Web Audio API not supported');
            }
        }
    }

    // Create and play cyberpunk chime sound
    playChime() {
        if (!this.audioContext) return;

        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Create louder, more prominent cyberpunk-style chime that repeats
            const now = this.audioContext.currentTime;
            
            // Play the alarm sequence 3 times for more prominence
            for (let repeat = 0; repeat < 3; repeat++) {
                const baseTime = now + (repeat * 1.0);
                
                // First tone - high pitch
                const oscillator1 = this.audioContext.createOscillator();
                const gain1 = this.audioContext.createGain();
                oscillator1.connect(gain1);
                gain1.connect(this.audioContext.destination);
                oscillator1.frequency.setValueAtTime(880, baseTime); // A5
                gain1.gain.setValueAtTime(0.8, baseTime);
                gain1.gain.exponentialRampToValueAtTime(0.01, baseTime + 0.5);
                oscillator1.start(baseTime);
                oscillator1.stop(baseTime + 0.5);

                // Second tone - mid pitch with delay
                const oscillator2 = this.audioContext.createOscillator();
                const gain2 = this.audioContext.createGain();
                oscillator2.connect(gain2);
                gain2.connect(this.audioContext.destination);
                oscillator2.frequency.setValueAtTime(660, baseTime + 0.1); // E5
                gain2.gain.setValueAtTime(0.6, baseTime + 0.1);
                gain2.gain.exponentialRampToValueAtTime(0.01, baseTime + 0.6);
                oscillator2.start(baseTime + 0.1);
                oscillator2.stop(baseTime + 0.6);

                // Third tone - lower pitch
                const oscillator3 = this.audioContext.createOscillator();
                const gain3 = this.audioContext.createGain();
                oscillator3.connect(gain3);
                gain3.connect(this.audioContext.destination);
                oscillator3.frequency.setValueAtTime(440, baseTime + 0.2); // A4
                gain3.gain.setValueAtTime(0.5, baseTime + 0.2);
                gain3.gain.exponentialRampToValueAtTime(0.01, baseTime + 0.7);
                oscillator3.start(baseTime + 0.2);
                oscillator3.stop(baseTime + 0.7);
            }

        } catch (e) {
            console.log('Error playing chime:', e);
        }
    }

    // Play UI sound effects
    playUISound(type) {
        if (!this.audioContext) return;

        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const now = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            oscillator.connect(gain);
            gain.connect(this.audioContext.destination);

            let frequency, duration, volume;

            switch (type) {
                case 'click':
                    // Higher pitched bleep for regular clicks
                    frequency = 800;
                    duration = 0.1;
                    volume = 0.9;
                    break;
                case 'select':
                    // Mid pitched bloop for selecting entries
                    frequency = 600;
                    duration = 0.15;
                    volume = 0.8;
                    break;
                case 'button':
                    // Lower pitched beep for buttons
                    frequency = 400;
                    duration = 0.12;
                    volume = 0.7;
                    break;
                case 'open':
                    // Rising tone for opening modals
                    frequency = 300;
                    duration = 0.2;
                    volume = 0.6;
                    oscillator.frequency.setValueAtTime(300, now);
                    oscillator.frequency.exponentialRampToValueAtTime(600, now + duration);
                    break;
                case 'close':
                    // Falling tone for closing modals
                    frequency = 600;
                    duration = 0.2;
                    volume = 0.6;
                    oscillator.frequency.setValueAtTime(600, now);
                    oscillator.frequency.exponentialRampToValueAtTime(300, now + duration);
                    break;
                case 'nav':
                    // Double bleep for navigation
                    frequency = 700;
                    duration = 0.08;
                    volume = 0.7;
                    // First bleep
                    gain.gain.setValueAtTime(volume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
                    // Second bleep
                    setTimeout(() => {
                        if (this.audioContext) {
                            this.playUISound('nav-second');
                        }
                    }, 100);
                    break;
                case 'nav-second':
                    frequency = 900;
                    duration = 0.08;
                    volume = 0.6;
                    break;
                default:
                    frequency = 500;
                    duration = 0.1;
                    volume = 0.7;
            }

            if (type !== 'open' && type !== 'close') {
                oscillator.frequency.setValueAtTime(frequency, now);
            }
            
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);

        } catch (e) {
            console.log('Error playing UI sound:', e);
        }
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
                this.playChime();
                
                // Show a subtle notification
                this.showTimeTrackingReminder();
            }
        }
    }

    // Show persistent visual reminder that requires dismissal
    showTimeTrackingReminder() {
        // Don't show multiple reminders at once
        if (document.getElementById('time-tracking-alarm')) {
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'time-tracking-alarm';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: alarmPulse 1s ease-in-out infinite alternate;
        `;

        // Create alarm dialog
        const alarm = document.createElement('div');
        alarm.style.cssText = `
            background: linear-gradient(135deg, #ff0066, #00ffff, #ff00ff);
            color: #000;
            padding: 30px 40px;
            border-radius: 15px;
            font-family: 'Orbitron', monospace;
            font-weight: 700;
            text-align: center;
            box-shadow: 0 0 50px rgba(0, 255, 255, 0.8);
            border: 3px solid #00ffff;
            max-width: 400px;
            min-width: 320px;
            animation: alarmShake 0.5s ease-in-out infinite;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 24px;
            margin-bottom: 15px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            white-space: nowrap;
        `;
        title.innerHTML = '🚨 CHRONOCOP ALERT 🚨';

        const message = document.createElement('div');
        message.style.cssText = `
            font-size: 16px;
            margin-bottom: 25px;
            font-family: 'Rajdhani', monospace;
            font-weight: 600;
        `;
        message.textContent = 'Time to track your last 30 minutes!';

        const dismissBtn = document.createElement('button');
        dismissBtn.style.cssText = `
            background: linear-gradient(45deg, #000, #333);
            color: #00ffff;
            border: 2px solid #00ffff;
            padding: 12px 25px;
            border-radius: 8px;
            font-family: 'Orbitron', monospace;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            text-transform: uppercase;
            box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
            transition: all 0.3s ease;
        `;
        dismissBtn.textContent = 'Dismiss';

        // Add hover effect
        dismissBtn.addEventListener('mouseenter', () => {
            dismissBtn.style.background = 'linear-gradient(45deg, #00ffff, #ff00ff)';
            dismissBtn.style.color = '#000';
            dismissBtn.style.transform = 'scale(1.05)';
            this.playUISound('button');
        });

        dismissBtn.addEventListener('mouseleave', () => {
            dismissBtn.style.background = 'linear-gradient(45deg, #000, #333)';
            dismissBtn.style.color = '#00ffff';
            dismissBtn.style.transform = 'scale(1)';
        });

        // Dismiss functionality
        dismissBtn.addEventListener('click', () => {
            this.playUISound('close');
            overlay.remove();
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        });

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes alarmPulse {
                0% { background: rgba(0, 0, 0, 0.8); }
                100% { background: rgba(255, 0, 102, 0.2); }
            }
            @keyframes alarmShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                75% { transform: translateX(2px); }
            }
        `;
        document.head.appendChild(style);

        alarm.appendChild(title);
        alarm.appendChild(message);
        alarm.appendChild(dismissBtn);
        overlay.appendChild(alarm);
        document.body.appendChild(overlay);

        // Auto-focus the dismiss button
        dismissBtn.focus();

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
            background: linear-gradient(135deg, #1a0033, #330066, #0066cc);
            border: 2px solid #00ffff;
            border-radius: 8px;
            padding: 12px 16px;
            font-family: 'Rajdhani', monospace;
            font-size: 14px;
            font-weight: 500;
            color: #ffffff;
            text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
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
            
            // Clear any existing timeout
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
            }

            // Set timeout for 1 second
            this.hoverTimeout = setTimeout(() => {
                if (isHovering) {
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
            this.scrollToMorning();
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
                // Each time slot is 40px tall in desktop, 25px in mobile landscape
                const isMobile = window.innerWidth <= 926;
                const slotHeight = isMobile ? 25 : 40;
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
                    this.playUISound('select');
                    this.editEntry(entry);
                });
            } else {
                timeSlot.addEventListener('click', () => {
                    this.playUISound('click');
                    this.addEntry(dateStr, timeStr);
                });
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
        
        // Add tooltip functionality
        this.addTooltipEvents(entryEl, entry);
        
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
        this.playUISound('open');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('entryModal').style.display = 'block';
        
        // Hide tooltip when modal opens
        this.hideTooltip();
        
        // Clear any pending tooltip timeouts
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        
        // Prevent body scroll on mobile
        document.body.classList.add('modal-open');
        
        document.getElementById('entryActivity').focus();
    }

    // Close modal
    closeModal() {
        document.getElementById('entryModal').style.display = 'none';
        this.editingEntry = null;
        
        // Restore body scroll
        document.body.classList.remove('modal-open');
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