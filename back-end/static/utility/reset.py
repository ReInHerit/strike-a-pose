import os
import shutil
from os import listdir
from os.path import isfile, join
from app import bcrypt
from models import db, User, Level, Picture, app


with app.app_context():
	db.drop_all()
	folder = 'static/videos'
	if not os.path.exists(folder):
			os.makedirs(folder)
	for filename in os.listdir(folder):
		file_path = os.path.join(folder, filename)
		try:
			if os.path.isfile(file_path) or os.path.islink(file_path):
				os.unlink(file_path)
			elif os.path.isdir(file_path):
				shutil.rmtree(file_path)
		except Exception as e:
			print('Failed to delete %s. Reason: %s' % (file_path, e))

	db.create_all()
	new_user = User()  # email="test@test.com", password=bcrypt.generate_password_hash("1234"))
	db.session.add(new_user)

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
