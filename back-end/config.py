class Config(object):
    DEBUG = False
    TESTING = False
    CSRF_ENABLED = True
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///database.db"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = None


class ProductionConfig(Config):
    SECRET_KEY = "8c3f78bc007987a0fecacade5f06199d891da49fe355c7e1f4542c81d5cc95d7"
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    ENV = "development"
    DEVELOPMENT = True
    SECRET_KEY = "thisisasecretkey"
    SQLALCHEMY_TRACK_MODIFICATIONS = True
