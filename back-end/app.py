from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="https://strikeapose.it")
cors = CORS(app, resources={r"/*": {"origins": "https://strikeapose.it"}})

app.config.from_object("config.DevelopmentConfig")

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

from views import *

if __name__ == "__main__":
    #DEVELOPMENT CONFIG
	app.run(host="0.0.0.0")

    #PRODUCTION CONFIG
    #from waitress import serve
    #serve(app, host="0.0.0.0", port=5000)
