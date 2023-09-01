import random
import cv2
import numpy as np
import uuid
import os
from random import randrange
from flask import jsonify, request, render_template, redirect, url_for, session
from flask_socketio import join_room, leave_room, send, emit

from app import app, socketio, db
from models import *
from forms import *


rooms = []
@app.route("/", methods=["GET"])
def index():
    session["end"] = False
    return render_template("index.html")

@app.route("/start", methods=["GET"])
def start():
    session["end"] = False
    session["game"] = True
    try:
        room_id = session.pop("room_id")
        n_round = session.pop("n_round")
        n_pose = session.pop("n_pose")
    except:
        return render_template("start.html", form=CreateRoomForm(), join_form=JoinRoomForm(), levels=Level.query.all())
    form = CreateRoomForm()
    form.n_round.default = n_round
    form.n_pose.default = n_pose
    form.process()
    return render_template("start.html", form=form, join_form=JoinRoomForm(), levels=Level.query.all(), room=room_id)

@app.route("/start", methods=["POST"])
def start_post():
    form = CreateRoomForm()
    if form.validate_on_submit():
        id = randrange(1000000)
        exist = next((x for x in rooms if x.id == id), None)
        while exist is not None:
            id = randrange(1000000)
            exist = next((x for x in rooms if x.id == id), None)
        n_round = int(form.n_round.data)
        n_pose = int(form.n_pose.data)
        my_room = Room(id, n_pose, n_round)
        rooms.append(my_room)
        session["room_id"] = id
        session["n_round"] = n_round
        session["n_pose"] = n_pose
        return redirect(url_for("start"))
    return render_template("start.html", form=form, join_form=JoinRoomForm(), levels=Level.query.all())


@app.route("/logout", methods=["GET"])
def logout():
    session["end"] = True
    return redirect(url_for("index"))
@app.route("/join/<id>", methods=["GET"])
def join(id):
    my_room = next((x for x in rooms if x.id == int(id)), None)
    if my_room is None:
        return jsonify("This room doesn't exists")
    if len(my_room.clients) == 0:
        return jsonify("There is no host in the room"), 400
    return jsonify(my_room.to_string())


@app.route("/room", methods=["POST"])
def room():
    id = request.json.get("id", None)
    level = request.json.get("level", None)
    n = request.json.get("n", None)
    my_room = next((x for x in rooms if x.id == int(id)), None)
    my_room.level = level
    my_room.n = n
    return jsonify(my_room.to_string())


@app.route("/delete/room/<id>", methods=["GET"])
def delete_room(id):
    my_room = next((x for x in rooms if x.id == int(id)), None)
    if my_room is None:
        return jsonify("This room doesn't exists"), 400
    if my_room is not None:
        rooms.remove(my_room)
        return redirect(url_for("get_rooms"))


@app.route("/rooms", methods=["GET"])
def get_rooms():
    return render_template("rooms.html", rooms=rooms)


@app.route("/game", methods=["GET"])
def game():
    session["end"] = True
    try:
        if session.pop("game"):
            session["game"] = False
            id = request.args.get("id")
            mode = request.args.get("mode")
            return render_template("game.html", id=id, mode=mode)
    except:
        return redirect(url_for("start"))
    return redirect(url_for("start"))


# @app.route("/user/me", methods=["GET"])
# def user_me():
#     # We can now access our sqlalchemy User object via `current_user`.
#     return jsonify(
#         current_user.as_dict()
#     )


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
    return jsonify(picture.as_dict())


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
    print('Session contents:', session)  # Debug session contents
    user_id = request.form.get("user_id") # session.get("user_id")
    print('User ID:', user_id)
    if user_id is None:
        return jsonify({"error": "User not authenticated"}), 401  # Unauthorized status code

    if not os.path.exists('static/videos'):
        os.makedirs('static/videos')
    video_path = f'static/videos/{uuid.uuid4()}.mp4'
    out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), 14.0, (1024, 2048))
    title_height = 376
    picture_height = 1000
    frame_height = 672

    # Load and resize the logo image
    logo = cv2.imread('static/assets/logo.png')
    logo_aspect_ratio = logo.shape[1] / logo.shape[0]
    if logo_aspect_ratio > 1:
        # Landscape (horizontal) logo
        new_logo_width = 200
        new_logo_height = int(new_logo_width / logo_aspect_ratio)
    elif logo_aspect_ratio < 1:
        # Portrait (vertical) logo
        new_logo_height = 200
        new_logo_width = int(new_logo_height * logo_aspect_ratio)
    else:
        # Square logo
        new_logo_height = 200
        new_logo_width = 200

    logo_resized = cv2.resize(logo, (new_logo_width, new_logo_height))

    # Create a black background for the title section
    title_section = np.zeros((title_height, 1024, 3), np.uint8)
    title_section[:] = (0, 0, 0)  # Black background
    centered_logo_y = (title_height - new_logo_height) // 2
    # Add the logo to the title section
    title_section[centered_logo_y:centered_logo_y + new_logo_height, 25:new_logo_width + 25] = logo_resized

    # Add the text title using OpenCV
    text = 'STRIKE A POSE'
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 2
    font_color = (255, 255, 255)  # White color
    text_size = cv2.getTextSize(text, font, font_scale, 1)[0]
    text_x = new_logo_width + 60
    text_y = (title_height + text_size[1]) // 2
    cv2.putText(title_section, text, (text_x, text_y), font, font_scale, font_color, 1, cv2.LINE_AA)

    for picture_id in request.form.getlist('picture_ids[]'):
        picture = Picture.query.get(int(picture_id))
        picture_image = cv2.imread(picture.path)
        print('picture_shape: ', picture_image.shape)
        picture_aspect_ratio = picture_image.shape[1] / picture_image.shape[0]

        if picture_aspect_ratio > 1:
            # Landscape (horizontal) picture
            new_picture_width = 1024
            new_picture_height = int(new_picture_width / picture_aspect_ratio)
        else:
            # Portrait (vertical) picture
            new_picture_height = 1000
            new_picture_width = int(new_picture_height * picture_aspect_ratio)

        resized_picture_image = cv2.resize(picture_image, (new_picture_width, new_picture_height))
        picture_section = np.zeros((1000, 1024, 3), np.uint8)
        picture_section[:] = (25, 25, 25)  # Black background
        # center resized picture image
        centered_height = (1000 - new_picture_height) // 2
        centered_width = (1024 - new_picture_width) // 2
        picture_section[centered_height:centered_height + new_picture_height, centered_width:centered_width + new_picture_width] = resized_picture_image

        for file in request.files.getlist(f'frames_{picture_id}[]'):
            img = cv2.imdecode(np.fromstring(file.read(), np.uint8), cv2.IMREAD_COLOR)
            resized_frame_image = cv2.resize(img, (1024, 672))
            # combine the 2 videos one up and one down
            combined_images = np.concatenate((cv2.flip(title_section, 1), picture_section, resized_frame_image), axis=0)
            flipped_combined_images = cv2.flip(combined_images, 1)

            # Create a black frame for the combined images
            black_frame = np.zeros((2048, 1024, 3), np.uint8)

            # Calculate positions for pasting images
            paste_start_row = (2048 - (title_height + picture_height + frame_height)) // 2
            paste_end_row = paste_start_row + title_height + picture_height + frame_height
            paste_start_col = 0
            black_frame[paste_start_row:paste_end_row, paste_start_col:] = flipped_combined_images

            # write the frame to the video
            out.write(black_frame)

    out.release()
    new_video = Video(path=video_path, user_id=user_id)
    db.session.add(new_video)
    db.session.commit()
    return jsonify(new_video.as_dict())
#
# @app.route("/videos", methods=["POST"])
# def post_video():
#     print('Session contents:', session)  # Debug session contents
#     user_id = request.form.get("user_id") # session.get("user_id")
#     print('User ID:', user_id)
#     if user_id is None:
#         return jsonify({"error": "User not authenticated"}), 401  # Unauthorized status code
#
#     if not os.path.exists('static/videos'):
#         os.makedirs('static/videos')
#     video_path = f'static/videos/{uuid.uuid4()}.mp4'
#     out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), 14.0, (1024, 2048))
#
#     total_height = 0
#
#     for picture_id in request.form.getlist('picture_ids[]'):
#         picture = Picture.query.get(int(picture_id))
#         picture_image = cv2.imread(picture.path)
#         for file in request.files.getlist(f'frames_{picture_id}[]'):
#             img = cv2.imdecode(np.fromstring(file.read(), np.uint8), cv2.IMREAD_COLOR)
#             # resize the images to 1024x1024
#             picture_height, picture_width, _ = picture_image.shape
#             aspect_ratio = picture_width / picture_height
#             new_picture_width = 1024
#             new_picture_height = int(new_picture_width / aspect_ratio)
#             resized_picure_image = cv2.resize(picture_image, (new_picture_width, new_picture_height))
#
#             frame_height, frame_width, _ = img.shape
#             aspect_ratio = frame_width / frame_height
#             new_frame_width = 1024
#             new_frame_height = int(new_frame_width / aspect_ratio)
#             resized_image = cv2.resize(img, (new_frame_width, new_frame_height))
#             # combine the 2 videos one up and one down
#             combined_images = np.concatenate((resized_picure_image, resized_image), axis=0)
#             flipped_combined_images = cv2.flip(combined_images, 1)
#             # made a frame 1024 x 2048 and resize pasted images to fit maintaining the aspect ratio
#             temp_height, _, _ = flipped_combined_images.shape
#             combined_aspect_ratio = 1024 / temp_height
#             if temp_height > 2048:
#                 new_combined_width = int(1024 / combined_aspect_ratio)
#                 new_combined_height = 2048
#             else:
#                 new_combined_width = 1024
#                 new_combined_height = int(2048 * combined_aspect_ratio)
#             resized_combined_images = cv2.resize(flipped_combined_images, (new_combined_width, new_combined_height))
#             # create a black frame 1024 x 2048 and paste the resized images on it in the center
#             black_frame = np.zeros((2048, 1024, 3), np.uint8)
#             black_frame[1024 - new_combined_height // 2:new_combined_height // 2 + 1024, 512 - new_combined_width // 2:new_combined_width // 2 + 512] = resized_combined_images
#
#             # write the frame to the video
#             out.write(black_frame)
#
#     out.release()
#
#     new_video = Video(path=video_path, user_id=user_id)
#     db.session.add(new_video)
#     db.session.commit()
#     print('////////////////////////////////////////////////////', new_video.as_dict())
#     return jsonify(new_video.as_dict())


@app.route("/videos/<id>", methods=["GET"])
def get_video(id):
    video = Video.query.get(int(id))
    return jsonify(video.as_dict())


@app.route("/end", methods=["GET"])
def end():
    try:
        if session.pop("end"):
            id = request.args.get("id")
            player = request.args.get("player")
            return render_template("end.html", id=id, player=player)
    except:
        return redirect(url_for("start"))
    return redirect(url_for("start"))

@socketio.on("connect")
def connect():
    emit("status", {"data": "connection established!"})

@socketio.on("join")
def on_join(room_id, level):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)

    if my_room is None:
        emit("errorRoom", f"room {room_id} doesn't exist")
        return

    if my_room.num_clients == 2:
        my_room.free = False
        emit("error", "sorry, room is full")
        return

    join_room(my_room.id)
    my_room.clients.append(request.sid)
    my_room.num_clients += 1
    emit("room_message", f"Welcome to room {my_room.id}, number of clients connected: {my_room.num_clients}",
         to=my_room.id)

    if my_room.num_clients == 2:
        if level is not None:
            levelModel = Level.query.get(int(level))
            shufflePictures = levelModel.as_dict().get('picture_ids')
            random.shuffle(shufflePictures)
            emit("play", shufflePictures, to=my_room.id)


def on_leave(room_id, retired):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    leave_room(my_room.id)
    my_room.clients.remove(request.sid)
    my_room.num_clients -= 1
    if my_room.num_clients == 0:
        rooms.remove(my_room)
    if retired:
        emit("retired_message", f"Player withdrew from room {my_room.id}")
    else:
        emit("leave_message", f"Player left room {my_room.id}")
    send(f"{my_room.to_string()}")

@socketio.on("sendResults")
def on_sendResults(room_id, results):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    if my_room.results[0] is None:
        my_room.results[0] = results
        emit("results_received", "1")
    else:
        my_room.results[1] = results
        emit("results_received", "2")


@socketio.on("acquireResults")
def on_acquireResults(room_id):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    if my_room.num_clients == 2:
        if my_room.results[0] is not None and my_room.results[1] is not None:
            emit("getResults", my_room.results, to=my_room.id)


@socketio.on("leaveGame")
def on_leaveGame(room_id):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    leave_room(my_room.id)
    my_room.clients.remove(request.sid)
    my_room.num_clients -= 1
    emit("user_retired", to=my_room.id)


@socketio.on("end")
def on_end(room_id):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    if my_room is not None:
        rooms.remove(my_room)
        emit("endGame", "Successfully deleted room", to=my_room.id)
    else:
        send("This room doesn't exsits")

# if __name__ == "__main__":
#     socketio.run(app)