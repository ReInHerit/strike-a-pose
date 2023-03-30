import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
import socket

app = Flask(__name__)
host_name = socket.getfqdn()
socketio = SocketIO(app, cors_allowed_origins="https://" + host_name)
cors = CORS(app, resources={r"/*": {"origins": "https://" + host_name}})
print(f"CORS: https://{host_name}")

app.config.from_object("config.DevelopmentConfig")

db = SQLAlchemy(app)
print(f'DB: {app.config["SQLALCHEMY_DATABASE_URI"]}')
bcrypt = Bcrypt(app)

from views import *

port = int(os.environ.get("PORT", 5000))
print(f"Using port: {port}")

if __name__ == "__main__":
    # DEVELOPMENT CONFIG
    app.run(host="0.0.0.0", port=port)

    # PRODUCTION CONFIG
    # from waitress import serve
    # serve(app, host="0.0.0.0", port=port)
