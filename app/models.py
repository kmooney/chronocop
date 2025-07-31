from datetime import datetime, time, timedelta
from . import db

class TimeEntry(db.Model):
    __tablename__ = 'time_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    activity = db.Column(db.String(200), nullable=False)
    type = db.Column(db.Enum('planned', 'reactive', name='activity_type'), nullable=False)
    energy_impact = db.Column(db.Enum('energised', 'neutral', 'drained', name='energy_impact'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('date', 'start_time', name='unique_date_time'),
    )
    
    def __init__(self, date, start_time, activity, type, energy_impact):
        self.date = date
        self.start_time = start_time
        self.activity = activity
        self.type = type
        self.energy_impact = energy_impact
        
        # Calculate end_time as start_time + 30 minutes
        start_datetime = datetime.combine(datetime.today(), start_time)
        end_datetime = start_datetime + timedelta(minutes=30)
        self.end_time = end_datetime.time()
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'start_time': self.start_time.strftime('%H:%M'),
            'end_time': self.end_time.strftime('%H:%M'),
            'activity': self.activity,
            'type': self.type,
            'energy_impact': self.energy_impact,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def validate_time_slot(time_str):
        """Validate that time is on 30-minute boundaries (00 or 30 minutes)"""
        try:
            time_obj = datetime.strptime(time_str, '%H:%M').time()
            return time_obj.minute in [0, 30]
        except ValueError:
            return False


class AppSettings(db.Model):
    __tablename__ = 'app_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def get_setting(key, default=None):
        """Get a setting value by key"""
        setting = AppSettings.query.filter_by(key=key).first()
        return setting.value if setting else default
    
    @staticmethod
    def set_setting(key, value):
        """Set a setting value by key"""
        setting = AppSettings.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            setting.updated_at = datetime.utcnow()
        else:
            setting = AppSettings(key=key, value=value)
            db.session.add(setting)
        db.session.commit()
        return setting


class DailySummary(db.Model):
    __tablename__ = 'daily_summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False)
    summary = db.Column(db.Text, nullable=False)
    token_count = db.Column(db.Integer, nullable=True)  # Track API usage
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'summary': self.summary,
            'token_count': self.token_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def get_summary(date):
        """Get summary for a specific date"""
        if isinstance(date, str):
            date = datetime.strptime(date, '%Y-%m-%d').date()
        return DailySummary.query.filter_by(date=date).first()
    
    @staticmethod
    def create_summary(date, summary, token_count=None):
        """Create or update a daily summary"""
        if isinstance(date, str):
            date = datetime.strptime(date, '%Y-%m-%d').date()
        
        existing = DailySummary.query.filter_by(date=date).first()
        if existing:
            existing.summary = summary
            existing.token_count = token_count
            existing.updated_at = datetime.utcnow()
            daily_summary = existing
        else:
            daily_summary = DailySummary(
                date=date,
                summary=summary,
                token_count=token_count
            )
            db.session.add(daily_summary)
        
        db.session.commit()
        return daily_summary


class WeeklySummary(db.Model):
    __tablename__ = 'weekly_summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    week_start_date = db.Column(db.Date, unique=True, nullable=False)  # Monday of the week
    summary = db.Column(db.Text, nullable=False)
    token_count = db.Column(db.Integer, nullable=True)  # Track API usage
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'week_start_date': self.week_start_date.isoformat(),
            'summary': self.summary,
            'token_count': self.token_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @staticmethod
    def get_summary(week_start_date):
        """Get summary for a specific week (Monday date)"""
        if isinstance(week_start_date, str):
            week_start_date = datetime.strptime(week_start_date, '%Y-%m-%d').date()
        return WeeklySummary.query.filter_by(week_start_date=week_start_date).first()
    
    @staticmethod
    def create_summary(week_start_date, summary, token_count=None):
        """Create or update a weekly summary"""
        if isinstance(week_start_date, str):
            week_start_date = datetime.strptime(week_start_date, '%Y-%m-%d').date()
        
        existing = WeeklySummary.query.filter_by(week_start_date=week_start_date).first()
        if existing:
            existing.summary = summary
            existing.token_count = token_count
            existing.updated_at = datetime.utcnow()
            weekly_summary = existing
        else:
            weekly_summary = WeeklySummary(
                week_start_date=week_start_date,
                summary=summary,
                token_count=token_count
            )
            db.session.add(weekly_summary)
        
        db.session.commit()
        return weekly_summary 