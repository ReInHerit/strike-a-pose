import os
from flask import Flask, url_for
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import socket
app = Flask(__name__)
port = int(os.environ.get("PORT", 5000))
host_name = socket.gethostname()
cors = CORS(app, resources={r"/*": {"origins":  [f"http://localhost:{port}", f"http://127.0.0.1:{port}", "*", "Content-Type", "X-Requested-With", "PUT, GET, POST, DELETE, OPTIONS" ]}})  # Add your origin here
socketio = SocketIO(app, cors_allowed_origins=[f"http://localhost:{port}", f"http://127.0.0.1:{port}"])  # Add your origin here

app.config.from_object("config.DevelopmentConfig")

db = SQLAlchemy(app)
migrate = Migrate(app, db)

bcrypt = Bcrypt(app)

print(f"Using port: {port}")

if __name__ == "__main__":
    # DEVELOPMENT CONFIG
    app.run(host="0.0.0.0", port=port, debug=True)

    # PRODUCTION CONFIG
    # from waitress import serve
    # serve(app, host="0.0.0.0", port=port)
