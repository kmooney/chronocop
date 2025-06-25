# Time Audit Flask Application - Software Specification

## Overview
A single-user Flask web application for local time tracking in 30-minute intervals with weekly calendar visualization and energy impact tracking.

## Core Requirements

### Data Model
**TimeEntry**
- `id`: Primary key
- `date`: Date (YYYY-MM-DD)
- `start_time`: Time (HH:MM, must be on 30-minute boundaries: 00, 30)
- `end_time`: Time (HH:MM, calculated as start_time + 30 minutes)
- `activity`: Text description of what was done
- `type`: Enum ('planned', 'reactive')
- `energy_impact`: Enum ('energised', 'neutral', 'drained')
- `created_at`: Timestamp
- `updated_at`: Timestamp

### API Endpoints

**GET /api/entries**
- Query params: `week_start` (YYYY-MM-DD, Monday of week), defaults to current week
- Returns: JSON array of time entries for the 7-day period

**POST /api/entries**
- Body: `{date, start_time, activity, type, energy_impact}`
- Validation: start_time must be :00 or :30
- Returns: Created entry with generated end_time

**PUT /api/entries/{id}**
- Body: Same as POST
- Returns: Updated entry

**DELETE /api/entries/{id}**
- Returns: 204 status

### Frontend Components

**Weekly Calendar View**
- 7-day week grid (Monday-Sunday)
- Each day column shows 48 time slots (00:00-23:30 in 30-minute increments)
- Time slots display: activity (truncated), type indicator, energy color coding
- Time labels on left axis (00:00, 00:30, 01:00, etc.)
- Click any slot to add/edit entry
- Navigation: previous/next week, jump to current week

**Entry Form Modal**
- Date picker (pre-filled from clicked slot)
- Time selector (30-minute increments only)
- Activity text field (required, max 200 chars)
- Type radio buttons: Planned/Reactive
- Energy impact radio buttons: Energised/Neutral/Drained
- Save/Cancel buttons

**Daily Detail View**
- List all entries for selected day
- Quick edit inline
- Summary: total planned vs reactive time, energy distribution

### Technical Stack
- **Backend**: Flask, SQLAlchemy, Flask-CORS
- **Database**: SQLite
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: CSS Grid for calendar layout, CSS variables for theming

### Validation Rules
- Time slots must start at :00 or :30 minutes
- No overlapping entries (enforce at API level)
- Activity field is required and non-empty
- All enum fields must match defined values

### Visual Design
**Color Coding**
- Planned activities: Blue border
- Reactive activities: Orange border
- Energy levels: Green (energised), Gray (neutral), Red (drained) background tint; use light pastel colors

**Calendar Layout**
- 7-day week grid with time axis
- Days as columns, time slots as rows (48 rows × 7 columns)
- Fixed height for consistent slot sizing
- Horizontal scroll if needed on mobile

### File Structure
```
app/
├── __init__.py
├── models.py (TimeEntry model)
├── routes.py (API endpoints)
├── static/
│   ├── css/calendar.css
│   ├── js/calendar.js
│   └── js/api.js
├── templates/
│   └── index.html
└── config.py

requirements.txt
run.py
```

### Database Schema
```sql
CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity VARCHAR(200) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('planned', 'reactive')),
    energy_impact VARCHAR(10) NOT NULL CHECK (energy_impact IN ('energised', 'neutral', 'drained')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, start_time)
);
```

### Key Features
1. **30-minute slot enforcement** - All time inputs constrained to :00 and :30
2. **Conflict prevention** - No double-booking of time slots
3. **Quick entry** - Single click to add entry to any time slot
4. **Visual feedback** - Color coding for activity type and energy impact
5. **Mobile responsive** - Touch-friendly interface for mobile devices

### Future Enhancements (Out of Scope)
- Export to CSV
- Time tracking analytics/reports
- Categories/tags for activities
- Team sharing features