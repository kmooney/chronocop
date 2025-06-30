import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', os.environ.get('PORT', 31337)))
    debug = os.environ.get('FLASK_ENV') != 'production'
    print(f"🚀 Starting Flask server on 127.0.0.1:{port}")
    app.run(debug=debug, host='127.0.0.1', port=port) 
