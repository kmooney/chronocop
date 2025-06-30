#!/usr/bin/env python3
"""
Build script to create a standalone Flask executable using PyInstaller
"""

import subprocess
import sys
import os
import shutil
import platform

def install_pyinstaller():
    """Install PyInstaller if not available."""
    try:
        import PyInstaller
        print("✅ PyInstaller already installed")
        return True
    except ImportError:
        print("📦 Installing PyInstaller...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
            print("✅ PyInstaller installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install PyInstaller: {e}")
            return False

def create_spec_file():
    """Create a PyInstaller spec file for the Flask app."""
    spec_content = '''
# -*- mode: python ; coding: utf-8 -*-

import os
from PyInstaller.utils.hooks import collect_all

# Collect all Flask and SQLAlchemy files
flask_datas, flask_binaries, flask_hiddenimports = collect_all('flask')
sqlalchemy_datas, sqlalchemy_binaries, sqlalchemy_hiddenimports = collect_all('sqlalchemy')
flask_sqlalchemy_datas, flask_sqlalchemy_binaries, flask_sqlalchemy_hiddenimports = collect_all('flask_sqlalchemy')
flask_cors_datas, flask_cors_binaries, flask_cors_hiddenimports = collect_all('flask_cors')

# Combine all data and hidden imports
all_datas = flask_datas + sqlalchemy_datas + flask_sqlalchemy_datas + flask_cors_datas
all_binaries = flask_binaries + sqlalchemy_binaries + flask_sqlalchemy_binaries + flask_cors_binaries
all_hiddenimports = (flask_hiddenimports + sqlalchemy_hiddenimports + 
                    flask_sqlalchemy_hiddenimports + flask_cors_hiddenimports)

# Add application files
all_datas += [
    ('app', 'app'),
    ('instance', 'instance'),
]

a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=all_binaries,
    datas=all_datas,
    hiddenimports=all_hiddenimports + [
        'flask',
        'flask_sqlalchemy',
        'flask_cors',
        'sqlalchemy',
        'sqlalchemy.ext.declarative',
        'sqlalchemy.orm',
        'sqlite3',
        'email.mime.multipart',
        'email.mime.text',
        'email.mime.base',
        'email.utils',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='chronocop-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    with open('chronocop.spec', 'w') as f:
        f.write(spec_content.strip())
    print("✅ Created PyInstaller spec file")

def build_executable():
    """Build the standalone executable using PyInstaller."""
    print("🔨 Building standalone executable...")
    
    # Clean previous builds
    if os.path.exists('build'):
        shutil.rmtree('build')
    if os.path.exists('dist/chronocop-server'):
        os.remove('dist/chronocop-server')
    if os.path.exists('dist/chronocop-server.exe'):
        os.remove('dist/chronocop-server.exe')
    
    try:
        # Build using the spec file
        subprocess.check_call([
            sys.executable, "-m", "PyInstaller", 
            "--clean", 
            "chronocop.spec"
        ])
        
        # Check if executable was created
        exe_name = 'chronocop-server.exe' if platform.system() == 'Windows' else 'chronocop-server'
        exe_path = os.path.join('dist', exe_name)
        
        if os.path.exists(exe_path):
            size_mb = os.path.getsize(exe_path) / (1024 * 1024)
            print(f"✅ Executable built successfully: {exe_path} ({size_mb:.1f} MB)")
            return True
        else:
            print("❌ Executable not found after build")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        return False

def main():
    print("🚀 Building CHRONOCOP Standalone Flask Server")
    print("=" * 50)
    
    # Check if we're in a virtual environment
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("⚠️  Warning: Not in a virtual environment")
        print("   Consider activating your virtual environment first")
    
    # Install PyInstaller
    if not install_pyinstaller():
        return False
    
    # Create spec file
    create_spec_file()
    
    # Build executable
    if build_executable():
        print("\n🎉 Build completed successfully!")
        print("📁 Executable location: dist/chronocop-server")
        print("🔄 Now run: npm run build")
        return True
    else:
        print("\n❌ Build failed")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n❌ Build cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1) 