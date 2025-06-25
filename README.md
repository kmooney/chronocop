# Time Auditor

A single-user Flask web application for local time tracking in 30-minute intervals with weekly calendar visualization and energy impact tracking.

## Features

- **Weekly Calendar View**: 7-day grid showing 48 time slots (30-minute intervals)
- **Time Entry Management**: Add, edit, and delete time entries with a single click
- **Activity Classification**: Mark activities as "Planned" or "Reactive"
- **Energy Impact Tracking**: Track how activities affect your energy levels (Energised, Neutral, Drained)
- **Visual Feedback**: Color-coded entries based on type and energy impact
- **Mobile Responsive**: Touch-friendly interface for mobile devices
- **Conflict Prevention**: No double-booking of time slots

## Installation

1. **Clone or extract the project files**

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python run.py
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

### Navigation
- **Previous/Next Week**: Navigate between weeks
- **Current Week**: Jump back to the current week

### Adding Time Entries
1. Click on any empty time slot in the calendar
2. Fill out the entry form:
   - **Date**: Pre-filled from the clicked slot
   - **Time**: Pre-filled, but can be changed (30-minute intervals only)
   - **Activity**: Describe what you did (max 200 characters)
   - **Type**: Select "Planned" or "Reactive"
   - **Energy Impact**: Select "Energised", "Neutral", or "Drained"
3. Click "Save" to create the entry

### Editing Time Entries
1. Click on an existing time entry
2. Modify the form fields as needed
3. Click "Save" to update, or "Delete" to remove the entry

### Visual Indicators
- **Blue border**: Planned activities
- **Orange border**: Reactive activities
- **Green background**: Energising activities
- **Gray background**: Neutral activities
- **Red background**: Draining activities

## Technical Details

- **Backend**: Flask with SQLAlchemy ORM
- **Database**: SQLite (automatically created as `time_audit.db`)
- **Frontend**: Vanilla JavaScript with CSS Grid
- **API**: RESTful endpoints for CRUD operations

## File Structure

```
time-auditor/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── models.py            # TimeEntry model
│   ├── routes.py            # API endpoints
│   ├── config.py            # Configuration
│   ├── static/
│   │   ├── css/calendar.css # Styling
│   │   ├── js/api.js        # API communication
│   │   └── js/calendar.js   # Main application logic
│   └── templates/
│       └── index.html       # Main template
├── requirements.txt         # Python dependencies
├── run.py                  # Application entry point
└── README.md               # This file
```

## Development

The application runs in debug mode by default. The SQLite database file (`time_audit.db`) will be created automatically in the project root when you first run the application.

For production deployment, consider:
- Setting a proper `SECRET_KEY` environment variable
- Using a production WSGI server like Gunicorn
- Configuring a proper database connection if needed 