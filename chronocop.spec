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