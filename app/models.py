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