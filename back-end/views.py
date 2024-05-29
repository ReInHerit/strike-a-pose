import html
import random
import re
import secrets
import string
import time
from functools import wraps

import cv2
import numpy as np
import uuid
import os
from random import randrange

from flask import jsonify, request, render_template, redirect, url_for, session, g, make_response, flash, abort, \
    get_flashed_messages, render_template_string
from flask_login import login_required, current_user, LoginManager, login_user, logout_user
from flask_socketio import join_room, leave_room, send, emit
from flask_mail import Mail, Message
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

from app import app, socketio, db
from models import *
from forms import *
import smtplib
from email_validator import validate_email, EmailNotValidError
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

login_manager = LoginManager(app)
login_manager.login_view = 'admin_login'
connected_clients = {}
players_ready_to_start = {}
room_states = {}
rooms = []
rooms_to_delete = []

# HOST = os.getenv('HOST', 'localhost')
# PORT = os.getenv('PORT', '8000')
# PROTOCOL = os.getenv('PROTOCOL', 'http')

cwd = os.getcwd()
print('///////////////////////////CWD///////////////////////////', cwd)
server = os.getenv('SERVER_URL')
privacy_policy_url = os.getenv('PRIVACY_POLICY_URL')
smtp_username = os.getenv('SMTP_USERNAME')
smtp_password = os.getenv('SMTP_PASSWORD')
smtp_server = 'smtp.gmail.com'
print('///////////////////////////SERVER///////////////////////////', server, privacy_policy_url)
# Set video_directory based on the current working directory
if os.path.exists(os.path.join(cwd, 'static')):
    video_directory = 'static/videos'
    static_assets_directory = 'static/assets'
elif os.path.exists(os.path.join(cwd, 'back-end')):
    video_directory = 'back-end/static/videos'
    static_assets_directory = 'back-end/static/assets'
elif os.path.exists(os.path.join(os.path.dirname(cwd), 'static')):
    video_directory = '../static/videos'
    static_assets_directory = '../static/assets'
else:
    print("Neither 'static' nor 'back-end' directories exist in the current working directory.")
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}
app.config['MAIL_SERVER'] = smtp_server
app.config['MAIL_PORT'] = 465  # Use 465 for SSL, 587 for TLS
app.config['MAIL_USE_SSL'] = True  # Set to True for SSL, False for TLS
app.config['MAIL_USE_TLS'] = False  # Set to True for TLS, False for SSL
app.config['MAIL_USERNAME'] = smtp_username  # Your Gmail username
app.config['MAIL_PASSWORD'] = smtp_password  # Your Gmail password
app.config['MAIL_DEFAULT_SENDER'] = smtp_username  # Your default sender address
mail = Mail(app)
select_signup_tab = True


def superuser_required(view_func):
    @wraps(view_func)
    def decorated_view(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_superuser:
            abort(403)  # Forbidden
        return view_func(*args, **kwargs)

    return decorated_view


@app.route("/", methods=["GET"])
def index():
    session["end"] = False
    return render_template("index.html")


@app.route('/policy')
def policy():
    smtp_username = os.environ.get('SMTP_USERNAME')
    return render_template('policy.html', smtp_username=smtp_username)


@app.route("/start", methods=["GET"])
def start():
    user_id = generate_new_user_id()
    print('/////////////////////////////', user_id, '////////////////////////////////////////////////////////////')
    session["end"] = False
    session["game"] = True
    form = CreateRoomForm()

    form.set_level_choices()
    form.process()
    try:
        room_id = session.pop("room_id")
        n_round = session.pop("n_round")
        n_pose = session.pop("n_pose")
        print('/////////ROOM///////////', room_id, '/////',n_round, n_pose,'///////////////////////////////////////////////////')
    except:
        print('/////////NO ROOM///////////', '////////////////////////////////////////////////////////////')
        return render_template("start.html", form=form, join_form=JoinRoomForm(), levels=Level.query.all(),
                               user_id=user_id)

    form.n_round.default = n_round
    form.n_pose.default = n_pose

    form.process()

    return render_template("start.html", form=form, join_form=JoinRoomForm(), levels=Level.query.all(), room=room_id,
                           user_id=user_id)  #


@app.route("/create_room", methods=["POST"])
def start_post():
    user_id = request.form.get("userId")
    n_round = request.form.get("n_round")
    n_pose = request.form.get("n_pose")
    level = request.form.get("level")
    players_mode = request.form.get("playersMode")

    print('////////HOST////////////', user_id, '////////////////////////////////////////////////////////////')

    id = randrange(1000000)
    exist = next((x for x in rooms if x.id == id), None)
    while exist is not None:
        id = randrange(1000000)
        exist = next((x for x in rooms if x.id == id), None)

    my_room = Room(id, n_pose, n_round, level, players_mode, user_id)
    rooms.append(my_room)
    if players_mode == "1":
        my_room.free = False
    json_response = jsonify(my_room.to_string())
    return json_response


# @app.route("/room", methods=["POST"])
# def room():
#     id = request.json.get("id", None)
#     level = request.json.get("level", None)
#     n = request.json.get("n", None)
#     my_room = next((x for x in rooms if x.id == int(id)), None)
#     my_room.level = level
#     my_room.n = n
#     return jsonify(my_room.to_string())


@app.route("/delete/room/<id>", methods=["GET"])
def delete_room(id):
    print('/////////DELETE///////////', id, '////////////////////////////////////////////////////////////')
    my_room = next((x for x in rooms if x.id == int(id)), None)
    if my_room is None:
        return jsonify("This room doesn't exists"), 400
    if my_room is not None:
        rooms.remove(my_room)
        return jsonify({"message": "Room deleted successfully"}), 200


# @app.route("/join/<id>", methods=["GET"])
# def join(id):
#     user_id = request.args.get("user_id")
#     my_room = next((x for x in rooms if x.id == int(id)), None)
#     if my_room is None:
#         return jsonify("This room doesn't exist"), 400  # Return an error if the room doesn't exist
#
#     if user_id in my_room.clients:
#         return jsonify(my_room.to_string())
#
#     if len(my_room.clients) == 0:
#         return jsonify("There is no host in the room"), 400
#     my_room.clients.append(user_id)
#     my_room.num_clients += 1
#     if len(my_room.clients) == 2:
#         my_room.free = False
#     else:
#         my_room.free = True
#     socketio.emit("join", {"room_data": my_room.to_string(), "joiner": user_id})  # Notify all clients
#     return jsonify(my_room.to_string())


@app.route("/logout", methods=["GET"])
def logout():
    user_id = request.args.get("user_id")
    for room in rooms:
        if user_id in room.clients:
            remove_user_from_room(room, user_id)
    for room in rooms_to_delete:
        if room in rooms:
            rooms.remove(room)
    session["end"] = True
    return redirect(url_for("index"))


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)


@app.route('/admin/registered_users', methods=['GET'])
@superuser_required  # Use your actual decorator for superuser role
def registered_users():
    users = User.query.filter_by(registered=True).all()
    return render_template('admin/registered_users.html', users=users)


@app.route('/admin/approve_registration/<int:user_id>', methods=['POST'])
@superuser_required
def approve_registration(user_id):
    user = User.query.get(user_id)
    if user:
        user.registered = True  # Update the registration status
        db.session.commit()
        flash(f'Admin registration for {user.username} approved successfully.', 'success')
    else:
        flash('User not found.', 'error')

    return redirect(url_for('admin_database_management'))


@app.route('/admin/remove_registration/<int:user_id>', methods=['POST'])
@superuser_required
def remove_registration(user_id):
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
        flash(f'Admin registration for {user.username} removed successfully.', 'success')
    else:
        flash('User not found.', 'error')

    return redirect(url_for('admin_database_management'))


@app.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    global select_signup_tab
    messages = []

    print('///////////////////////////ADMIN LOGIN///////////////////////////')
    if current_user.is_authenticated:
        print('user_logged', current_user)
        # If the user is already logged in, redirect to the database management section
        return redirect(url_for('admin_database_management'))

    login_form = LoginForm()

    if login_form.is_submitted():
        user = User.query.filter_by(username=login_form.username.data).first()
        print('user', user)
        if user and user.check_password(login_form.password.data):
            if user.confirmed and user.registered:
                print('user_logged', user)
                login_user(user)
                session['user_authenticated'] = True
                session['is_superuser'] = user.is_superuser
                flash('Logged in successfully!', 'success')
                return redirect(url_for('admin_database_management'))
            else:
                flash('Email not confirmed. Please check your email for the confirmation link.', 'error')
        else:
            print('user_not_logged', user)
            flash('Invalid username or password', 'error')
        messages = get_flashed_messages(with_categories=True, category_filter=['error', 'success'])

    select_signup_tab = True
    return render_template('admin.html', login_form=login_form, registration_form=RegistrationForm(),
                           messages=messages, select_signup_tab=select_signup_tab)


@app.route('/admin_register', methods=['GET', 'POST'])
def admin_register():
    global select_signup_tab
    messages = []

    print('///////////////////////////ADMIN REGISTER///////////////////////////')
    print('Request method:', request.method)
    if current_user.is_authenticated and current_user.is_superuser:
        print('superuser_logged', current_user)
        # If the user is already logged in, redirect to the database management section
        return redirect(url_for('admin_database_management'))
    select_signup_tab = True
    registration_form = RegistrationForm()
    print('registration_form', registration_form)
    if registration_form.validate_on_submit():
        print('registration_form.validate_on_submit()')
        username = registration_form.username.data
        email = registration_form.newEmail.data
        password = registration_form.newPassword.data
        confirmation_token = secrets.token_urlsafe(30)
        existing_user = User.query.filter(or_(User.username == username, User.email == email)).first()

        if existing_user:
            print('existing_user', existing_user)
            if existing_user.username == username:
                flash(
                    'Oops! It looks like that username is already in use. Please try another one to personalize your account.',
                    'error')
                select_signup_tab = False
            elif existing_user.email == email:
                flash('Oops! It looks like that email is already registered. Please choose another one.', 'error')
                select_signup_tab = False
            messages = get_flashed_messages(with_categories=True, category_filter=['error', 'success'])
        else:
            try:
                new_user = User(username=username, email=email, is_superuser=False, registered=False,
                                confirmation_token=confirmation_token)
                print('new_user', new_user)
                new_user.set_password(password)

                # Attempt to add the new user to the database
                db.session.add(new_user)
                db.session.commit()

                print('send_confirmation_email')
                send_confirmation_email(email, confirmation_token)

                print('registered_user', new_user)
                flash('Registration successful! Waiting for superuser confirmation.', 'success')
                return redirect(url_for('index'))

            except IntegrityError as e:
                # Handle any database integrity errors (e.g., duplicate username or email)
                print('IntegrityError:', str(e))
                db.session.rollback()

                if 'UNIQUE constraint failed: user.email' in str(e):
                    flash('Email is already registered. Please choose another one.', 'error')
                else:
                    flash('An error occurred during registration. Please try again.', 'error')
            messages = get_flashed_messages(with_categories=True, category_filter=['error', 'success'])
    else:
        print('Form not validated:', registration_form.errors)

    print('not_registered_user')
    return render_template('admin.html', registration_form=registration_form,
                           messages=messages, select_signup_tab=select_signup_tab)


@app.route('/confirm_email/<token>', methods=['GET'])
def confirm_email(token):
    user = User.query.filter_by(confirmation_token=token).first()
    if user:
        user.confirmed = True
        db.session.commit()
        flash('Email confirmed successfully. You can now log in.', 'success')
    else:
        flash('Invalid confirmation link. Please try again.', 'error')

    return redirect(url_for('admin_login'))


@app.route('/admin_database_management', methods=['GET', 'POST'])
@login_required
def admin_database_management():
    print('///////////////////////////ADMIN///////////////////////////', current_user.is_superuser)
    add_picture_form = AddPictureForm()
    session['user_authenticated'] = True
    session['is_superuser'] = current_user.is_superuser
    users = User.query.filter_by(is_superuser=False).all()
    existing_categories = Picture.query.with_entities(Picture.category).distinct().all()
    add_picture_form.existing_category.choices = [(category, category) for category, in existing_categories]
    category = ''
    if request.method == 'POST' and add_picture_form.validate_on_submit():
        print('in CATEGORY TYPE', add_picture_form.category_type.data)
        category_type = add_picture_form.category_type.data
        print('///////////////////////////ADMIN///////////////////////////', category_type)
        if category_type == 'existing':
            existing_category = add_picture_form.existing_category.data
            category = existing_category
        elif category_type == 'new':
            new_category = add_picture_form.new_category.data.strip()
            print('in NEW', new_category)
            if not new_category:
                print('Please enter a valid category.', 'error')
                return redirect(url_for('admin_database_management'))

            existing_category = Picture.query.filter_by(category=new_category).first()
            print('existing_category', existing_category)
            if existing_category:
                print('Category already exists.', 'error')
                return redirect(url_for('admin_database_management'))

            # Add the new category to the database
            category = new_category.replace(' ', '_')  # .lower()
            new_level = Level(name=category)
            db.session.add(new_level)
            db.session.commit()
        if 'image' in request.files and allowed_file(request.files['image'].filename):
            file = request.files['image']
            filename = secure_filename(file.filename)

            image_folder = os.path.join(app.config['UPLOAD_FOLDER'], category)
            destination_folder = image_folder  # os.path.join('back-end', image_folder)
            if destination_folder and not os.path.exists(destination_folder):
                os.makedirs(destination_folder)
            # Save the file to the desired path
            file_path = os.path.join(destination_folder, filename)
            read_path = os.path.join(image_folder, filename)
            file.save(file_path)
            new_picture = Picture(
                author_name=add_picture_form.author_name.data,
                artwork_name=add_picture_form.artwork_name.data,
                path=read_path,
                category=category,
                description=add_picture_form.description.data,
                level_id=1,
            )

            db.session.add(new_picture)
            db.session.commit()
            flash('Picture added successfully!', 'success')
            return redirect(url_for('admin_database_management'))
        else:
            flash('Invalid file format. Allowed formats: jpg, jpeg, png, gif', 'error')
    else:
        print('Form errors:', add_picture_form.errors)
    if request.method == 'POST':
        delete_picture_id = request.form.get('delete_picture_id')
        if delete_picture_id:
            picture_to_remove = Picture.query.get(delete_picture_id)
            if picture_to_remove:
                category = picture_to_remove.category
                path = picture_to_remove.path  # 'back-end',
                if os.path.exists(path):
                    os.remove(path)
                db.session.delete(picture_to_remove)
                db.session.commit()

                flash('Picture removed successfully!', 'success')

                if os.path.isdir(os.path.dirname(path)) and not os.listdir(os.path.dirname(path)):
                    os.rmdir(os.path.dirname(path))
                    flash('Folder deleted successfully!', 'info')

                remaining_pictures = Picture.query.filter_by(category=category).first()
                if not remaining_pictures:
                    # If no remaining pictures, remove the category from the Level model
                    level_to_remove = Level.query.filter(func.lower(Level.name) == category.lower()).first()
                    if level_to_remove:
                        db.session.delete(level_to_remove)
                        db.session.commit()
                        flash(f'Category "{category}" removed from levels.', 'info')
                return redirect(url_for('admin_database_management'))
            else:
                flash('Picture not found.', 'error')

    pictures = Picture.query.all()

    return render_template('admin.html', add_picture_form=add_picture_form, pictures=pictures, users=users)


def send_confirmation_email(email, confirmation_token):
    # print("""Send a confirmation e/mail with the provided token.""")
    print("Sending confirmation email...")
    print(f"Recipient: {email}")
    subject = "Confirm Your Email Address"
    confirm_url = url_for('confirm_email', token=confirmation_token, _external=True)
    print(f"Confirmation URL: {confirm_url}")
    body = f"Please click the following link to confirm your email address: {confirm_url}"

    # Create a Flask-Mail Message object
    message = Message(subject=subject, recipients=[email], body=body)
    print('///////////////////////////ADMIN///////////////////////////', message)
    # Send the email
    mail.send(message)


@app.route('/admin_logout')
@login_required
def admin_logout():
    # Log out the current user
    logout_user()

    # Clear the session variables
    session.pop('user_authenticated', None)
    session.pop('is_superuser', None)
    return redirect(url_for('index'))


@app.route('/admin/upload', methods=['GET', 'POST'])
@login_required
def admin_upload():
    if not current_user.is_superuser:
        return redirect(url_for('index'))
    form = ImageForm()

    if form.validate_on_submit():
        title = form.title.data
        image = form.image.data

        # Save image to the upload folder
        filename = secure_filename(image.filename)
        image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        # Save data to the database
        new_image = Picture(title=title, filename=filename)
        db.session.add(new_image)
        db.session.commit()

        return redirect(url_for('admin_upload'))

    return render_template('admin_upload.html', form=form)


def remove_user_from_room(room, user_id):
    if user_id == room.creator:
        print("delete room", room.id)
        # rooms.remove(room)
        rooms_to_delete.append(room)
        # socketio.emit("room_deleted", {"room_id": room.id})
    elif user_id in room.clients:
        print("remove user", user_id)
        room.clients.remove(user_id)
        room.num_clients -= 1
        room.free_space = True
        if room.num_clients == 0:
            print("num_clients 0, delete room", room.id)
            rooms_to_delete.append(room)

            # rooms.remove(room)


@app.route("/rooms", methods=["GET"])
def get_rooms():
    return render_template("rooms.html", rooms=rooms)


@app.route("/rooms_data", methods=["GET"])
def get_rooms_data():
    rooms_data = []
    # Convert Room objects to dictionaries
    for room in rooms:
        room_dict = {
            "room_id": room.id,
            "num_clients": room.num_clients,
            "free_space": room.free,
            "n_round": room.n_round,
            "n_pose": room.n_pose,
            "level": room.level,
            "creator": room.creator,
            "clients": room.clients,
            "n": room.n,
            "players_mode": room.players_mode,
        }
        rooms_data.append(room_dict)

    return jsonify({"rooms": rooms_data})


@app.route("/game", methods=["GET"])
def game():
    session["end"] = True

    try:
        mode = request.args.get("mode")
        if mode == "solo":
            id = request.args.get("id")
            print("ID:", id)
            # Log the values of id and mode for debugging
            print("Mode:", mode)
            return render_template("game.html", id=id, mode=mode)
        elif mode == "versus":
            game_data = request.args.get("gameData")
            player = request.args.get("player")
            print("Game Data:", game_data)
            print("Player:", player)
            # Process versus mode data and render the template accordingly
            return render_template("game.html", game_data=game_data, player=player)
        else:
            return redirect(url_for("start"))

    except Exception as e:
        print("Exception:", str(e))
        return redirect(url_for("start"))


@app.route("/pictures/", methods=["POST"])
def post_picture():
    path = request.json.get("path", None)
    new_picture = Picture(path=path)
    db.session.add(new_picture)
    db.session.commit()
    return jsonify(new_picture.as_dict())


@app.route("/pictures/<id>", methods=["GET"])
def get_picture(id):
    picture = Picture.query.get(int(id))
    return (jsonify(picture.as_dict()))


@app.route("/pictures/all/", methods=["GET"])
def get_all_pictures():
    pictures = Picture.query.all()
    # existing_categories = Picture.query.with_entities(Picture.category).distinct().all()
    # category_list = [category for category, in existing_categories]
    pictures_list = [picture.as_dict() for picture in pictures]
    picture_data = {'picturesList': pictures_list}

    return jsonify(picture_data)

@app.route("/levels/<id>", methods=["GET"])
def get_level(id):
    level = Level.query.get(int(id))
    return jsonify(level.as_dict())


@app.route("/levels", methods=["GET"])
def get_levels():
    levels = Level.query.all()
    return jsonify([level.as_dict() for level in levels])


@app.route("/videos", methods=["POST"])
def post_video():
    user_id = request.form.get("user_id")
    print('/////////POST VIDEO///////////', user_id, '////////////////////////////////////////////////////////////')
    if not os.path.exists(video_directory):
        os.makedirs(video_directory)
    video_path = f'{video_directory}/{uuid.uuid4()}.mp4'
    out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), 14.0, (1024, 2048))

    picture_height = 1118
    center_row_height = 10
    frame_height = 672
    bottom_row_height = 51
    video_width = 1024
    # Load and resize the logo image
    title_section = cv2.imread(static_assets_directory + '/video_logo2.png')
    title_section_flipped = cv2.flip(title_section, 1)
    center_row = np.zeros((center_row_height, video_width, 3), np.uint8)
    center_row[5:10, :] = (0, 157, 224)
    bottom_row = np.zeros((bottom_row_height, video_width, 3), np.uint8)
    bottom_row[:] = 206

    for picture_id in request.form.getlist('picture_ids[]'):
        picture = Picture.query.get(int(picture_id))
        picture_path = os.path.join(static_assets_directory, picture.path.replace('static/assets/', '', 1))
        print('/////////PICTURE///////////', picture_path, '////////////////////////////////////////////////////////////')
        picture_image = cv2.imread(picture_path)
        picture_aspect_ratio = picture_image.shape[1] / picture_image.shape[0]

        if picture_aspect_ratio > 1:
            # Landscape (horizontal) picture
            new_picture_width = video_width
            new_picture_height = int(new_picture_width / picture_aspect_ratio)
            if new_picture_height > picture_height:
                new_picture_height = picture_height
                new_picture_width = int(new_picture_height * picture_aspect_ratio)
        else:
            # Portrait (vertical) picture
            new_picture_height = picture_height
            new_picture_width = int(new_picture_height * picture_aspect_ratio)
            if new_picture_width > video_width:
                new_picture_width = video_width
                new_picture_height = int(new_picture_width / picture_aspect_ratio)
        resized_picture_image = cv2.resize(picture_image, (new_picture_width, new_picture_height))
        picture_section = np.zeros((picture_height, video_width, 3), np.uint8)
        picture_section[:] = (25, 25, 25)  # Black background
        # center resized picture image
        centered_height = (picture_height - new_picture_height) // 2
        centered_width = (video_width - new_picture_width) // 2
        picture_section[centered_height:centered_height + new_picture_height,
        centered_width:centered_width + new_picture_width] = resized_picture_image

        for file in request.files.getlist(f'frames_{picture_id}[]'):
            img = cv2.imdecode(np.fromstring(file.read(), np.uint8), cv2.IMREAD_COLOR)
            resized_frame_image = cv2.resize(img, (video_width, frame_height))
            # combine the 2 videos one up and one down
            combined_images = np.concatenate(
                (title_section_flipped, resized_frame_image, center_row, picture_section, bottom_row), axis=0)
            flipped_combined_images = cv2.flip(combined_images, 1)
            out.write(flipped_combined_images)

    out.release()
    new_video = Video(path=video_path, user_id=user_id)
    db.session.add(new_video)
    db.session.commit()
    return jsonify(new_video.as_dict())


@app.route("/videos/<id>", methods=["GET"])
def get_video(id):
    print('///////////////////////////GET VIDEO///////////////////////////', id, '////////////////////////////////////////////////////////////')
    video = Video.query.get(int(id))
    return jsonify(video.as_dict())


@app.route('/send-video', methods=['POST'])
def send_video():
    try:
        # Get the user's email from the form
        user_email = request.form.get('email')
        nposes = int(request.form.get('poses'))
        paintings_ids = [int(p_id) for p_id in request.form.get('paintings_ids').split(',')]
        print('////////////////////////////////////////////////////', user_email, nposes, paintings_ids)
        paintings_info = []
        for painting_id in paintings_ids[:nposes]:

            painting = Picture.query.get(painting_id)
            if painting:
                print('////////////////////////////////////////////////////', painting.author_name, painting.artwork_name)
                sanitized_description = sanitize_html_text(painting.description)
                sanitized_author_name = sanitize_html_text(painting.author_name)
                sanitized_artwork_name = sanitize_html_text(painting.artwork_name)
                # description = html.escape(sanitized_text)
                paintings_info.append({
                    'author_name': sanitized_author_name,
                    'artwork_name': sanitized_artwork_name,
                    'description': sanitized_description
                })

            # Add painting details to the email body
        paintings_info_str = '\n'.join(
            [f"Artwork {i + 1}: {info['author_name']} - {info['artwork_name']}: {info['description']}<br/>" for i, info in
             enumerate(paintings_info)])
        # Attach the video file
        video = request.files['video']
        video_data = video.read()
        # Define your email server and credentials
        # smtp_server = 'smtp.gmail.com'
        smtp_port = 587

        # Create a message object
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = user_email
        msg['Subject'] = 'Your Strike-a-pose Video'
        print('////////////////////////////////////////////////////', user_email)

        body = f"""
                <html>
                <body>
                    <p>Dear User,</p>
                    <p>Thank you for participating in this engagement experience with art.</p>
                    <p>We are delighted to share with you the video capturing your graceful poses inspired by some of the masterpieces in our collection.</p>
                    <p>Your interaction can inspire you for a deeper exploration of the following artworks:</p>
                    {paintings_info_str}
                    <p>Feel free to enjoy and share your experience in your social media.</p>
                    <p>Best regards,<br/>The ReInHerit Consortium</p>
                </body>
                </html>
                """
        print(privacy_policy_url)
        body += f'''
            <div style="font-size: 0.8em; color: #888;">
                <br>You received this e-mail because, while using Strike-A-Pose, you requested that the results be e-mailed to you. 
                As specified in the privacy policy you accepted, the head poses captured have been used to create the attached 
                final images. No files or images are stored in our system, and this e-mail will be promptly removed from our 
                servers after the result video is generated and sent to you. We do not share your body images or personal 
                information with any third-party services. Please see the <a href="{privacy_policy_url}"> Privacy Policy</a> for more details.
            </div>
            '''

        msg.attach(MIMEText(body, 'html', 'utf-8'))
        # Attach the video file
        video_attachment = MIMEApplication(video_data, Name='video.mp4')  # Set the desired filename
        video_attachment['Content-Disposition'] = 'attachment; filename="strike-a-pose-video.mp4"'
        msg.attach(video_attachment)
        # Create an SMTP session
        smtp = smtplib.SMTP(smtp_server, smtp_port)
        smtp.starttls()
        smtp.set_debuglevel(2)
        smtp.login(smtp_username, smtp_password)
        # Send the email
        try:
            smtp.sendmail(msg['From'], user_email, msg.as_string())
            print('//////////email sent//////////')
        except Exception as e:
            print('//////////email not sent//////////', str(e))
        # Close the SMTP session
        smtp.quit()
        print('///////////////////////////SEND VIDEO///////////////////////////', user_email, nposes, paintings_ids)

        return jsonify({'message': 'Video sent successfully!'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



def sanitize_html_text(text):
    if ('<p>' in text) and ('</p>' in text):
        text = text.replace('<p>', '').replace('</p>', '')
    # Remove right and left double quotes
    text = re.sub(r'[“”]', '"', text)
    # Remove right and left single quotes
    text = re.sub(r'[‘’]', "'", text)
    # Remove other non-allowed characters
    replaced_description = ''.join(f"&#{ord(c)};" if ord(c) > 127 else c for c in text)

    # text = re.sub(r'[^\w\s.,!?]', '', text)
    return replaced_description

@app.route('/update_picture', methods=['POST'])
def update_picture():
    try:
        field = request.form.get('field')
        picture_id = request.form.get('id')
        new_value = request.form.get('value')

        if not (field and picture_id and new_value):
            return jsonify({'error': 'Incomplete data in the request.'}), 400
        picture = Picture.query.get(int(picture_id))
        if picture:
            # Update the corresponding field based on the 'field' value
            if field == 'author_name':
                picture.author_name = new_value
            elif field == 'artwork_name':
                picture.artwork_name = new_value
            elif field == 'description':
                picture.description = new_value
            elif field == 'category':
                picture.category = new_value
            else:
                return jsonify({'error': 'Invalid field specified.'}), 400

            db.session.commit()
            return jsonify({'message': 'Picture updated successfully.'}), 200
        else:
            return jsonify({'error': 'Picture not found.'}), 404
    except Exception as e:
        return jsonify({'error': f'Error updating picture: {str(e)}'}), 500
@app.route('/delete-video', methods=['DELETE'])
def delete_video():
    print('/////////DELETE VIDEO///////////')
    data = request.get_json()

    video_id = data.get('videoId')
    if not video_id:
        return jsonify({'error': 'Video ID is missing in the request.'}), 400

    video = Video.query.get(int(video_id))
    if video:
        # Delete the video file based on the path in the database record
        video_file_path = video.path
        if os.path.exists(video_file_path):
            try:
                os.remove(video_file_path)
                return jsonify({'message': 'Video deleted successfully.'}), 200

            except Exception as e:
                return jsonify({'error': 'An error occurred while deleting the video.'}), 500
    else:
        # video_path = None
        return jsonify({'error': 'Video not found.'}), 404


@app.route("/end", methods=["GET"])
def end():
    try:
        if session.pop("end"):
            id = request.args.get("id")
            player = request.args.get("player")
            winner = request.args.get("winner")
            return render_template("end.html", id=id, player=player, winner=winner)
    except:
        return redirect(url_for("start"))
    return redirect(url_for("start"))


# SocketIO events
# @socketio.on("connect")
# def connect():
#     emit("status", {"data": "connection established!"})
#     emit("update_rooms", [room.to_string() for room in rooms])
#
#
# @socketio.on("join_room")
# def handle_join_room(room_id):
#     join_room(room_id)
#
#
# @socketio.on("player_leave")
# def handle_player_leave(room_id, user_id):
#     leave_room(room_id)
#     # Optionally, notify other players in the room about the departure
#     emit("player_left", {"player_id": user_id}, room=room_id)
#
#
# @socketio.on('leave_room')
# def handle_leave_room(data):
#     room_id = data.get('room_id')
#     user_id = data.get('user_id')
#
#     my_room = next((x for x in rooms if x.id == int(room_id)), None)
#     if my_room is not None:
#         if user_id in my_room.clients:
#             my_room.clients.remove(user_id)
#
#         if not my_room.clients:
#             rooms.remove(my_room)
#             socketio.emit("room_deleted", {"room_id": my_room.id})  # Notify all clients
#
#
# @socketio.on("ready_to_start_game")
# def handle_start_game_request(data):
#     room_id = data["room_id"]
#     user_id = data["user_id"]
#
#     # Check if the room exists and initialize the players_ready_to_start list if needed
#     if room_id not in room_states:
#         room_states[room_id] = {
#             'player1': None,
#             'player2_ready': False
#         }
#     # Assign the first player to join as player1
#     if room_states[room_id]['player1'] is None:
#         room_states[room_id]['player1'] = user_id
#         print("Player 1:", user_id)
#     else:
#         # Assign the second player to join as player2
#         room_states[room_id]['player2_ready'] = True
#         print("Player 2:", user_id)
#
#         if room_states[room_id]['player1'] is not None and room_states[room_id]['player2_ready']:
#             # Both players are ready, emit a "start_game" event to both clients in the room
#             socketio.emit("start_game", {"id": room_id})
#
#
# @socketio.on("start_game_player2")
# def handle_start_game_player2(room_id, paintings_ids):
#     print("Received 'start_game_player2' from player 1 in room:", room_id, paintings_ids)
#     socketio.emit("start_player2", {"room": room_id, "paintings_ids": paintings_ids})
#
#
# @socketio.on("sendResults")
# def on_sendResults(room_id, results):
#     print('rooms:', rooms)
#     my_room = next((x for x in rooms if x.id == int(room_id)), None)
#     print("***********MY ROOM in results***********", my_room.id, my_room.results)
#     if my_room.results[0] is None:
#         my_room.results[0] = results
#         print("*********results1", my_room.results[0], "*********")
#         emit("results_received", {"player": "1"})
#     else:
#         my_room.results[1] = results
#         print("*********results2", my_room.results[1], "*********")
#         emit("results_received", {"player": "2"})
#
#
# @socketio.on("acquireResults")
# def on_acquireResults(room_id):
#     try:
#         my_room = next((x for x in rooms if x.id == int(room_id)), None)
#         if my_room.num_clients == 2:
#             if my_room.results[0] is not None and my_room.results[1] is not None:
#                 emit("getResults", my_room.results)
#     except Exception as e:
#         print("Error in on_acquireResults:", str(e))
#
#
# @socketio.on("leaveGame")
# def on_leaveGame(room_id):
#     my_room = next((x for x in rooms if x.id == int(room_id)), None)
#     leave_room(my_room.id)
#     my_room.clients.remove(request.sid)
#     my_room.num_clients -= 1
#     emit("user_retired", to=my_room.id)
#
#
# @socketio.on("sendDataToP1")
# def send_data_to_player1(room_id, data):
#     emit("receiveDataFromP2", data, to=room_id)
#
#
# @socketio.on("sendWinnerToP1")
# def send_winner_to_player1(data):
#     room_id = data["roomId"]
#     data = {"p1_text": data["p1_text"], "p1_ImgSrc": data["p1_ImgSrc"]}
#     emit("receiveWinnerFromP2", data, to=room_id)
#
#
# @socketio.on("end")
# def on_end(room_id, player, winner):
#     my_room = next((x for x in rooms if x.id == int(room_id)), None)
#     if my_room is not None:
#         rooms.remove(my_room)
#         emit("endGame", "Successfully deleted room", to=my_room.id)
#     else:
#         send("This room doesn't exsits")


# UTILITY FUNCTIONS
def is_valid_email(email):
    try:
        # Validate the email address
        valid = validate_email(email)
        # If valid, return True
        return True

    except EmailNotValidError:
        # If not valid, return False
        return False


def generate_new_user_id():
    # Generate a random user ID consisting of alphanumeric characters
    user_id_length = 10  # You can adjust the length as needed
    characters = string.ascii_letters + string.digits
    user_id = ''.join(random.choice(characters) for _ in range(user_id_length))
    return user_id


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
