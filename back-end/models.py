from flask_login import UserMixin
from app import db, bcrypt


class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    videos = db.relationship('Video', backref='user', lazy=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(100), nullable=False)
    new_username = db.Column(db.String(50))
    new_password_hash = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True, nullable=False)
    is_superuser = db.Column(db.Boolean, default=False)
    registered = db.Column(db.Boolean, default=False)
    confirmed = db.Column(db.Boolean, default=False)
    confirmation_token = db.Column(db.String(100), unique=True)
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    def as_dict(self):
        return {"id": self.id}


class UserProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unique_id = db.Column(db.String(50), unique=True, nullable=False)

    # Define a relationship to link User and UserProfile
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref='profile', lazy=True)

    def as_dict(self):
        return {"id": self.id, "unique_id": self.unique_id}


class Level(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255))
    pictures = db.relationship('Picture', backref='level', lazy=True)

    def as_dict(self):
        return {"id": self.id, "name": self.name, "description": self.description, "picture_ids": [p.id for p in self.pictures]}


class Picture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    author_name = db.Column(db.String(255), nullable=False)
    artwork_name = db.Column(db.String(255), nullable=False)
    path = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # Add category field
    level_id = db.Column(db.Integer, db.ForeignKey('level.id'),
                         nullable=False)

    def as_dict(self):
        return {"id": self.id, "path": self.path, "author_name": self.author_name, "artwork_name": self.artwork_name, "category": self.category}


class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'),
                        nullable=False)

    def as_dict(self):
        return {"id": self.id, "path": self.path, 'user_id': self.user_id}


class Room:
    def __init__(self, id, n_pose, n_round, level, players_mode, creator):
        self.id = id
        self.clients = [creator]
        self.num_clients = 1
        self.free = True
        self.n_pose = n_pose
        self.n_round = n_round
        self.level = level
        self.n = None
        self.creator = creator
        self.results = [None] * 2
        self.players_mode = players_mode

    def to_string(self):
        return {"id": self.id, "clients": self.clients, "num_clients": self.num_clients, "free": self.free,
                "n_pose": self.n_pose, "n_round": self.n_round, "level": self.level, "n": self.n,
                "creator": self.creator, "results": self.results, "players_mode": self.players_mode}
