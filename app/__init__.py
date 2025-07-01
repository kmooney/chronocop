from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import platform
from pathlib import Path

db = SQLAlchemy()

def get_data_directory():
    """Get the persistent data directory for the application"""
    if platform.system() == 'Darwin':  # macOS
        data_dir = Path.home() / 'Library' / 'Application Support' / 'CHRONOCOP'
    elif platform.system() == 'Windows':
        data_dir = Path.home() / 'AppData' / 'Local' / 'CHRONOCOP'
    else:  # Linux and others
        data_dir = Path.home() / '.chronocop'
    
    # Create directory if it doesn't exist
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir

def create_app():
    app = Flask(__name__)
    
    # Get persistent data directory
    data_dir = get_data_directory()
    db_path = data_dir / 'time_audit.db'
    
    print(f"📁 Using database: {db_path}")
    
    # Configuration
    app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    
    # Register routes
    from .routes import main
    app.register_blueprint(main)
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    return app 