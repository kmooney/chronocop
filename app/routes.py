from flask import Blueprint, request, jsonify, render_template
from datetime import datetime, timedelta
from .models import TimeEntry
from . import db

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/api/entries', methods=['GET'])
def get_entries():
    """Get time entries for a specific week"""
    week_start = request.args.get('week_start')
    
    if week_start:
        try:
            start_date = datetime.strptime(week_start, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        # Default to current week (Monday)
        today = datetime.now().date()
        days_since_monday = today.weekday()
        start_date = today - timedelta(days=days_since_monday)
    
    # Get 7-day period
    end_date = start_date + timedelta(days=6)
    
    entries = TimeEntry.query.filter(
        TimeEntry.date >= start_date,
        TimeEntry.date <= end_date
    ).order_by(TimeEntry.date, TimeEntry.start_time).all()
    
    return jsonify([entry.to_dict() for entry in entries])

@main.route('/api/entries', methods=['POST'])
def create_entry():
    """Create a new time entry"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['date', 'start_time', 'activity', 'type', 'energy_impact']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate time slot
    if not TimeEntry.validate_time_slot(data['start_time']):
        return jsonify({'error': 'Start time must be on 30-minute boundaries (:00 or :30)'}), 400
    
    # Validate enum values
    valid_types = ['planned', 'reactive']
    valid_energy = ['energised', 'neutral', 'drained']
    
    if data['type'] not in valid_types:
        return jsonify({'error': f'Invalid type. Must be one of: {valid_types}'}), 400
    
    if data['energy_impact'] not in valid_energy:
        return jsonify({'error': f'Invalid energy_impact. Must be one of: {valid_energy}'}), 400
    
    # Validate activity length
    if len(data['activity']) > 200:
        return jsonify({'error': 'Activity description must be 200 characters or less'}), 400
    
    try:
        # Parse date and time
        date_obj = datetime.strptime(data['date'], '%Y-%m-%d').date()
        time_obj = datetime.strptime(data['start_time'], '%H:%M').time()
        
        # Check for conflicts
        existing_entry = TimeEntry.query.filter_by(
            date=date_obj,
            start_time=time_obj
        ).first()
        
        if existing_entry:
            return jsonify({'error': 'Time slot already occupied'}), 409
        
        # Create new entry
        entry = TimeEntry(
            date=date_obj,
            start_time=time_obj,
            activity=data['activity'],
            type=data['type'],
            energy_impact=data['energy_impact']
        )
        
        db.session.add(entry)
        db.session.commit()
        
        return jsonify(entry.to_dict()), 201
        
    except ValueError as e:
        return jsonify({'error': 'Invalid date or time format'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create entry'}), 500

@main.route('/api/entries/<int:entry_id>', methods=['PUT'])
def update_entry(entry_id):
    """Update an existing time entry"""
    entry = TimeEntry.query.get_or_404(entry_id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['date', 'start_time', 'activity', 'type', 'energy_impact']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate time slot
    if not TimeEntry.validate_time_slot(data['start_time']):
        return jsonify({'error': 'Start time must be on 30-minute boundaries (:00 or :30)'}), 400
    
    # Validate enum values
    valid_types = ['planned', 'reactive']
    valid_energy = ['energised', 'neutral', 'drained']
    
    if data['type'] not in valid_types:
        return jsonify({'error': f'Invalid type. Must be one of: {valid_types}'}), 400
    
    if data['energy_impact'] not in valid_energy:
        return jsonify({'error': f'Invalid energy_impact. Must be one of: {valid_energy}'}), 400
    
    # Validate activity length
    if len(data['activity']) > 200:
        return jsonify({'error': 'Activity description must be 200 characters or less'}), 400
    
    try:
        # Parse date and time
        date_obj = datetime.strptime(data['date'], '%Y-%m-%d').date()
        time_obj = datetime.strptime(data['start_time'], '%H:%M').time()
        
        # Check for conflicts (excluding current entry)
        existing_entry = TimeEntry.query.filter(
            TimeEntry.date == date_obj,
            TimeEntry.start_time == time_obj,
            TimeEntry.id != entry_id
        ).first()
        
        if existing_entry:
            return jsonify({'error': 'Time slot already occupied'}), 409
        
        # Update entry
        entry.date = date_obj
        entry.start_time = time_obj
        entry.activity = data['activity']
        entry.type = data['type']
        entry.energy_impact = data['energy_impact']
        entry.updated_at = datetime.utcnow()
        
        # Recalculate end_time
        start_datetime = datetime.combine(datetime.today(), time_obj)
        end_datetime = start_datetime + timedelta(minutes=30)
        entry.end_time = end_datetime.time()
        
        db.session.commit()
        
        return jsonify(entry.to_dict())
        
    except ValueError as e:
        return jsonify({'error': 'Invalid date or time format'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update entry'}), 500

@main.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    """Delete a time entry"""
    entry = TimeEntry.query.get_or_404(entry_id)
    
    try:
        db.session.delete(entry)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete entry'}), 500 