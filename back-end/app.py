import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import socket
app = Flask(__name__)
port = int(os.environ.get("PORT", 8000))
host_name = socket.gethostname()
cors = CORS(app, resources={r"/*": {"origins":  [f"http://localhost:{port}", f"http://127.0.0.1:{port}", "*", "Content-Type", "X-Requested-With", "PUT, GET, POST, DELETE, OPTIONS" ]}})  # Add your origin here
socketio = SocketIO(app, cors_allowed_origins=[f"http://localhost:{port}", f"http://127.0.0.1:{port}"])  # Add your origin here

app.config.from_object("config.DevelopmentConfig")

db = SQLAlchemy(app)
migrate = Migrate(app, db)

bcrypt = Bcrypt(app)
from views import *


print(f"Using port: {port}")

if __name__ == "__main__":
    in_docker = os.environ.get('AM_I_IN_A_DOCKER_CONTAINER', False)
    # DEVELOPMENT CONFIG
    if in_docker:
        app.run(host="0.0.0.0", port=port, debug=True)
    else:
        socketio.run(app, host="0.0.0.0", port=port, debug=True, allow_unsafe_werkzeug=True)


    # PRODUCTION CONFIG
    # from waitress import serve
    # serve(app, host="0.0.0.0", port=port)
