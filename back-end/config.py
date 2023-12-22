from dotenv import load_dotenv
import os
# Create a Config object with the relative path to the .env file
# config = Config('../../.env')
load_dotenv()

class Config(object):
    DEBUG = True
    TESTING = False
    CSRF_ENABLED = True
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///database.db"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = None
    UPLOAD_FOLDER = "static/assets/"


class ProductionConfig(Config):
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    ENV = "development"
    DEVELOPMENT = True
    SECRET_KEY = "thisisasecretkey"
    SQLALCHEMY_TRACK_MODIFICATIONS = True
    FLASK_DEBUG = 1
