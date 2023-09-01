from flask_login import UserMixin

from app import db

class User(db.Model, UserMixin):
    id = db.Column(db.String(36), primary_key=True)
    videos = db.relationship('Video', backref='user', lazy=True)

    def as_dict(self):
        return {"id": self.id}


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
    level_id = db.Column(db.Integer, db.ForeignKey('level.id'),
                         nullable=False)

    def as_dict(self):
        return {"id": self.id, "path": self.path, "author_name": self.author_name, "artwork_name": self.artwork_name}


class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'),
                        nullable=False)

    def as_dict(self):
        return {"id": self.id, "path": self.path, 'user_id': self.user_id}


class Room:
    def __init__(self, id, n_pose, n_round):
        self.id = id
        self.clients = []
        self.num_clients = 0
        self.free = True
        self.n_pose = n_pose
        self.n_round = n_round
        self.level = None
        self.n = None
        self.results = [None] * 2

    def to_string(self):
        return {"id":self.id, "clients":self.clients, "num_clients":self.num_clients, "free":self.free, "n_pose":self.n_pose, "n_round":self.n_round, "level":self.level, "n":self.n}
