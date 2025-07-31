from flask import Blueprint, request, jsonify, render_template
from datetime import datetime, timedelta
from .models import TimeEntry, AppSettings, DailySummary, WeeklySummary
from . import db
import requests
import json

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


# Settings API routes
@main.route('/api/settings', methods=['GET'])
def get_settings():
    """Get all app settings"""
    settings = AppSettings.query.all()
    return jsonify({setting.key: setting.value for setting in settings})

@main.route('/api/settings/<key>', methods=['GET'])
def get_setting(key):
    """Get a specific setting"""
    value = AppSettings.get_setting(key)
    if value is None:
        return jsonify({'error': 'Setting not found'}), 404
    return jsonify({'key': key, 'value': value})

@main.route('/api/settings/<key>', methods=['PUT'])
def set_setting(key):
    """Set a specific setting"""
    data = request.get_json()
    
    if 'value' not in data:
        return jsonify({'error': 'Missing value field'}), 400
    
    try:
        setting = AppSettings.set_setting(key, data['value'])
        return jsonify(setting.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save setting'}), 500

@main.route('/api/settings/<key>', methods=['DELETE'])
def delete_setting(key):
    """Delete a specific setting"""
    setting = AppSettings.query.filter_by(key=key).first()
    if not setting:
        return jsonify({'error': 'Setting not found'}), 404
    
    try:
        db.session.delete(setting)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete setting'}), 500


# Claude API test route (to avoid CORS issues)
@main.route('/api/test-claude', methods=['POST'])
def test_claude_connection():
    """Test Claude API connection from backend to avoid CORS issues"""
    data = request.get_json()
    
    if 'api_key' not in data:
        return jsonify({'error': 'Missing api_key field'}), 400
    
    api_key = data['api_key'].strip()
    if not api_key:
        return jsonify({'error': 'API key cannot be empty'}), 400
    
    try:
        # Test with a simple prompt
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01'
        }
        
        payload = {
            'model': 'claude-3-haiku-20240307',
            'max_tokens': 50,
            'messages': [{ 'role': 'user', 'content': 'Say "Connection test successful"' }]
        }
        
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return jsonify({
                'success': True,
                'message': 'Claude API connection successful!',
                'response': result['content'][0]['text'] if result.get('content') else 'OK'
            })
        else:
            error_data = response.json() if response.content else {}
            error_message = error_data.get('error', {}).get('message', f'HTTP {response.status_code}')
            return jsonify({
                'success': False,
                'message': f'Connection failed: {error_message}'
            }), 400
            
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'message': 'Connection test timed out. Check your internet connection.'
        }), 408
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'message': f'Connection test failed: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Unexpected error: {str(e)}'
        }), 500


# Daily Summary API routes
@main.route('/api/summaries/<date>', methods=['GET'])
def get_daily_summary(date):
    """Get daily summary for a specific date"""
    try:
        summary = DailySummary.get_summary(date)
        if not summary:
            return jsonify({'error': 'Summary not found'}), 404
        return jsonify(summary.to_dict())
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

@main.route('/api/summaries/<date>/generate', methods=['POST'])
def generate_daily_summary(date):
    """Generate AI summary for a specific date"""
    try:
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
        
        # Get entries for the date
        entries = TimeEntry.query.filter_by(date=date_obj).order_by(TimeEntry.start_time).all()
        
        if not entries:
            return jsonify({'error': 'No entries found for this date'}), 404
        
        # Check if Claude API token is configured
        claude_api_key = AppSettings.get_setting('claude_api_key')
        if not claude_api_key:
            return jsonify({'error': 'Claude API key not configured. Please set it in Settings.'}), 400
        
        # Generate summary using Claude API
        try:
            summary_text, token_count = generate_claude_summary(entries, claude_api_key)
            
            # Check if summary already exists and delete it to regenerate
            existing_summary = DailySummary.get_summary(date_obj)
            if existing_summary:
                db.session.delete(existing_summary)
                db.session.commit()
            
            # Save the new summary
            summary = DailySummary.create_summary(date_obj, summary_text, token_count)
            
            return jsonify({
                'message': 'Summary generated successfully',
                'summary': summary.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to generate summary: {str(e)}'}), 500
        
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to generate summary: {str(e)}'}), 500

def generate_claude_summary(entries, api_key):
    """Generate summary using Claude API with enhanced analysis"""
    
    # Calculate statistics for richer context
    total_minutes = sum((entry.end_time.hour * 60 + entry.end_time.minute) - 
                       (entry.start_time.hour * 60 + entry.start_time.minute) for entry in entries)
    total_hours = total_minutes / 60
    
    planned_count = sum(1 for entry in entries if entry.type == 'planned')
    reactive_count = sum(1 for entry in entries if entry.type == 'reactive')
    
    energy_counts = {}
    for entry in entries:
        energy_counts[entry.energy_impact] = energy_counts.get(entry.energy_impact, 0) + 1
    
    # Prepare the activity data for Claude with enhanced context
    activities_text = ""
    for entry in entries:
        duration_mins = (entry.end_time.hour * 60 + entry.end_time.minute) - (entry.start_time.hour * 60 + entry.start_time.minute)
        activities_text += f"• {entry.start_time.strftime('%H:%M')}-{entry.end_time.strftime('%H:%M')} ({duration_mins}min): {entry.activity} [{entry.type}, {entry.energy_impact}]\n"
    
    # Create enhanced prompt with examples and better structure
    prompt = f"""You are an expert productivity analyst. Analyze this time tracking data to create a professional daily summary that provides actionable insights.

**TIME TRACKING DATA:**
{activities_text}

**STATISTICAL CONTEXT:**
• Total tracked time: {total_hours:.1f} hours
• Work style: {planned_count} planned vs {reactive_count} reactive activities
• Energy distribution: {', '.join(f'{k}: {v}' for k, v in energy_counts.items())}

**ANALYSIS FRAMEWORK:**
Create a structured summary that identifies patterns, productivity insights, and strategic recommendations. This should be valuable for both personal reflection and professional communication.

**REQUIRED FORMAT:**

• **Key Accomplishments**
  - List 2-3 most significant outcomes/deliverables completed
  - Focus on impact and value created, not just tasks done

• **Energy & Focus Patterns** 
  - Identify peak performance periods and energy trends
  - Note any productivity bottlenecks or flow states
  - Connect energy levels to activity types and timing

• **Work Style Analysis**
  - Analyze planned vs reactive work balance and effectiveness
  - Assess time allocation across different activity categories
  - Identify any workflow optimization opportunities

• **Tomorrow's Strategic Focus**
  - Provide 2-3 specific, actionable recommendations
  - Base suggestions on observed patterns and energy management
  - Include timing recommendations for optimal productivity

**QUALITY STANDARDS:**
- Keep concise but insightful (target ~150-200 words)
- Use professional yet approachable tone
- Focus on actionable insights over mere description
- Ensure recommendations are specific and implementable

Generate a summary that demonstrates clear analytical thinking and provides genuine strategic value."""

    # Claude API request with upgraded model
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01'
    }
    
    data = {
        'model': 'claude-3-5-sonnet-20241022',  # Upgraded to Claude 3.5 Sonnet for much better analysis
        'max_tokens': 400,  # Increased for more detailed insights
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ]
    }
    
    response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers=headers,
        json=data,
        timeout=30
    )
    
    if response.status_code != 200:
        raise Exception(f"Claude API error: {response.status_code} - {response.text}")
    
    result = response.json()
    
    # Extract the summary text and token usage
    summary_text = result['content'][0]['text']
    token_count = result.get('usage', {}).get('output_tokens', 0)
    
    return summary_text, token_count


# Weekly Summary API routes
@main.route('/api/weekly-summaries/<date>', methods=['GET'])
def get_weekly_summary(date):
    """Get weekly summary for a specific week (Monday date)"""
    try:
        # Parse date and ensure it's a Monday
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
        # Calculate Monday of the week
        days_since_monday = date_obj.weekday()
        monday_date = date_obj - timedelta(days=days_since_monday)
        
        summary = WeeklySummary.get_summary(monday_date)
        if not summary:
            return jsonify({'error': 'Weekly summary not found'}), 404
        return jsonify(summary.to_dict())
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

@main.route('/api/weekly-summaries/<date>/generate', methods=['POST'])
def generate_weekly_summary(date):
    """Generate AI summary for a specific week"""
    try:
        # Parse date and ensure it's a Monday
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
        # Calculate Monday of the week
        days_since_monday = date_obj.weekday()
        monday_date = date_obj - timedelta(days=days_since_monday)
        sunday_date = monday_date + timedelta(days=6)
        
        # Get all entries for the week
        entries = TimeEntry.query.filter(
            TimeEntry.date >= monday_date,
            TimeEntry.date <= sunday_date
        ).order_by(TimeEntry.date, TimeEntry.start_time).all()
        
        if not entries:
            return jsonify({'error': 'No entries found for this week'}), 404
        
        # Check if Claude API token is configured
        claude_api_key = AppSettings.get_setting('claude_api_key')
        if not claude_api_key:
            return jsonify({'error': 'Claude API key not configured. Please set it in Settings.'}), 400
        
        # Generate weekly summary using Claude API
        try:
            summary_text, token_count = generate_claude_weekly_summary(entries, claude_api_key)
            
            # Check if summary already exists and delete it to regenerate
            existing_summary = WeeklySummary.get_summary(monday_date)
            if existing_summary:
                db.session.delete(existing_summary)
                db.session.commit()
            
            # Save the new weekly summary
            summary = WeeklySummary.create_summary(monday_date, summary_text, token_count)
            
            return jsonify({
                'message': 'Weekly summary generated successfully',
                'summary': summary.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to generate weekly summary: {str(e)}'}), 500
        
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to generate weekly summary: {str(e)}'}), 500

def generate_claude_weekly_summary(entries, api_key):
    """Generate weekly summary using Claude API with enhanced analysis"""
    
    # Calculate comprehensive statistics
    total_minutes = sum((entry.end_time.hour * 60 + entry.end_time.minute) - 
                       (entry.start_time.hour * 60 + entry.start_time.minute) for entry in entries)
    total_hours = total_minutes / 60
    
    planned_count = sum(1 for entry in entries if entry.type == 'planned')
    reactive_count = sum(1 for entry in entries if entry.type == 'reactive')
    
    energy_distribution = {}
    for entry in entries:
        energy_distribution[entry.energy_impact] = energy_distribution.get(entry.energy_impact, 0) + 1
    
    # Group entries by day with statistics
    days_data = {}
    daily_stats = {}
    for entry in entries:
        day_name = entry.date.strftime('%A')
        if day_name not in days_data:
            days_data[day_name] = []
            daily_stats[day_name] = {'planned': 0, 'reactive': 0, 'total_mins': 0}
        
        days_data[day_name].append(entry)
        daily_stats[day_name][entry.type] += 1
        duration = (entry.end_time.hour * 60 + entry.end_time.minute) - (entry.start_time.hour * 60 + entry.start_time.minute)
        daily_stats[day_name]['total_mins'] += duration
    
    # Prepare enhanced weekly activity data for Claude
    weekly_text = ""
    active_days = len(days_data)
    
    for day_name in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
        if day_name in days_data:
            day_hours = daily_stats[day_name]['total_mins'] / 60
            weekly_text += f"\n**{day_name}** ({day_hours:.1f}h tracked):\n"
            for entry in days_data[day_name]:
                duration_mins = (entry.end_time.hour * 60 + entry.end_time.minute) - (entry.start_time.hour * 60 + entry.start_time.minute)
                weekly_text += f"• {entry.start_time.strftime('%H:%M')}-{entry.end_time.strftime('%H:%M')} ({duration_mins}min): {entry.activity} [{entry.type}, {entry.energy_impact}]\n"
        else:
            weekly_text += f"\n**{day_name}:** No tracked activities\n"
    
    # Create enhanced prompt with sophisticated analysis framework
    prompt = f"""You are a senior productivity strategist analyzing weekly performance data. Generate a comprehensive strategic summary that provides deep insights for executive-level review and strategic planning.

**WEEKLY TIME TRACKING DATA:**
{weekly_text}

**PERFORMANCE METRICS:**
• Total tracked time: {total_hours:.1f} hours across {active_days} active days
• Work approach: {planned_count} planned vs {reactive_count} reactive activities ({(planned_count/(planned_count+reactive_count)*100):.0f}% planned)
• Energy distribution: {', '.join(f'{k}: {v}' for k, v in energy_distribution.items())}
• Average daily engagement: {total_hours/7:.1f} hours per day

**STRATEGIC ANALYSIS FRAMEWORK:**
Provide a comprehensive weekly assessment that identifies trends, strategic insights, and forward-looking recommendations suitable for leadership review and strategic planning.

**REQUIRED SECTIONS:**

• **Executive Summary**
  - High-level strategic overview of the week's productivity themes
  - Key patterns in work approach and energy management
  - Overall strategic positioning and focus areas

• **Strategic Accomplishments**
  - Major deliverables and strategic outcomes achieved
  - Value creation and impact assessment
  - Progress toward larger objectives and initiatives

• **Productivity Intelligence**
  - Deep analysis of peak performance patterns and optimal working conditions
  - Energy management insights and flow state identification
  - Work style effectiveness and strategic work allocation

• **Operational Insights**
  - Assessment of planned vs reactive work balance and strategic implications
  - Time allocation analysis across different activity categories
  - Workflow optimization opportunities and operational improvements

• **Daily Performance Highlights**
  - Strategic insights from each productive day
  - Notable patterns, breakthroughs, or learning moments
  - Day-specific observations that inform future planning

• **Strategic Development Areas**
  - Specific opportunities for enhanced productivity and strategic focus
  - Systems and process improvements identified
  - Professional development and capability building insights

• **Next Week's Strategic Priorities**
  - Forward-looking strategic recommendations based on observed patterns
  - Optimal scheduling and energy management strategies
  - Key focus areas and strategic objectives for maximum impact

**QUALITY EXPECTATIONS:**
- Demonstrate sophisticated analytical thinking and strategic perspective
- Provide actionable insights suitable for executive decision-making
- Balance comprehensive analysis with clear, decisive recommendations
- Target 400-500 words for thorough strategic coverage
- Use professional executive communication style
- Focus on strategic value and forward-looking insights

Generate a summary that demonstrates exceptional strategic thinking and provides genuine leadership-level insights for high-performance optimization."""

    # Claude API request for weekly summary with premium model
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01'
    }
    
    data = {
        'model': 'claude-3-5-sonnet-20241022',  # Upgraded to Claude 3.5 Sonnet for strategic-level analysis
        'max_tokens': 800,  # Increased for comprehensive strategic analysis
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ]
    }
    
    response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers=headers,
        json=data,
        timeout=45  # Increased timeout for more complex analysis
    )
    
    if response.status_code != 200:
        raise Exception(f"Claude API error: {response.status_code} - {response.text}")
    
    result = response.json()
    
    # Extract the summary text and token usage
    summary_text = result['content'][0]['text']
    token_count = result.get('usage', {}).get('output_tokens', 0)
    
    return summary_text, token_count 