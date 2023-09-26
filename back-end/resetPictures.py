import os
from os import listdir
from os.path import isfile, join
from app import app, db  # Import the Flask app and db from app.py
from models import Level, Picture
with app.app_context():
    db.session.query(Level).delete()
    db.session.query(Picture).delete()

    new_level = Level(name="Half bust",
                      description="Match the poses of some artworks. You'll find only half bust figures.")
    db.session.add(new_level)
    mypath = f'static/assets/halfBust/'
    onlyfiles = [f for f in listdir(mypath) if isfile(join(mypath, f))]
    for id in onlyfiles:
        author_name = id.split(".")[0].split("-")[1].replace("_", " ")
        artwork_name = id.split(".")[0].split("-")[0].replace("_", " ")
        new_picture = Picture(
            path=f'static/assets/halfBust/{id}', level=new_level, author_name=author_name, artwork_name=artwork_name)
        db.session.add(new_picture)

    new_level = Level(
        name="Full length", description="Match the poses of some artworks. You'll find only full length figures.")
    db.session.add(new_level)
    mypath = f'static/assets/fullLength/'
    onlyfiles2 = [f for f in listdir(mypath) if isfile(join(mypath, f))]
    for id in onlyfiles2:
        author_name = id.split(".")[0].split("-")[1].replace("_", " ")
        artwork_name = id.split(".")[0].split("-")[0].replace("_", " ")
        new_picture = Picture(
            path=f'static/assets/fullLength/{id}', level=new_level, author_name=author_name, artwork_name=artwork_name)
        db.session.add(new_picture)

    new_level = Level(
        name="Both", description="Match the poses of some artworks. You'll find full length and half bust figures.")
    db.session.add(new_level)
    for id in onlyfiles:
        author_name = id.split(".")[0].split("-")[1].replace("_", " ")
        artwork_name = id.split(".")[0].split("-")[0].replace("_", " ")
        new_picture = Picture(
            path=f'static/assets/halfBust/{id}', level=new_level, author_name=author_name, artwork_name=artwork_name)
        db.session.add(new_picture)
    for id in onlyfiles2:
        author_name = id.split(".")[0].split("-")[1].replace("_", " ")
        artwork_name = id.split(".")[0].split("-")[0].replace("_", " ")
        new_picture = Picture(
            path=f'static/assets/fullLength/{id}', level=new_level, author_name=author_name, artwork_name=artwork_name)
        db.session.add(new_picture)
    db.session.commit()