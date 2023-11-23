import random
import string
import time
import cv2
import numpy as np
import uuid
import os
from random import randrange
from flask import jsonify, request, render_template, redirect, url_for, session, g, make_response
from flask_socketio import join_room, leave_room, send, emit
from app import app, socketio, db
from models import *
from forms import *
import smtplib
from email_validator import validate_email, EmailNotValidError
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
connected_clients = {}
players_ready_to_start = {}
room_states = {}
rooms = []
rooms_to_delete = []
video_directory = 'static/videos'
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
    try:
        room_id = session.pop("room_id")
        n_round = session.pop("n_round")
        n_pose = session.pop("n_pose")
    except:
        return render_template("start.html", form=CreateRoomForm(), join_form=JoinRoomForm(), levels=Level.query.all(), user_id=user_id)
    form = CreateRoomForm()
    form.n_round.default = n_round
    form.n_pose.default = n_pose
    form.process()

    return render_template("start.html", form=form, join_form=JoinRoomForm(), levels=Level.query.all(), room=room_id, user_id=user_id) #

@app.route("/create_room", methods=["POST"])
def start_post():
    user_id = request.form.get("userId")
    n_round = request.form.get("n_round")
    n_pose = request.form.get("n_pose")
    level = request.form.get("level")
    players_mode = request.form.get("playersMode")

    print('////////HOST////////////', user_id, '////////////////////////////////////////////////////////////')
    print(session)

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
    print('/////////DELETE///////////', id, '////////////////////////////////////////////////////////////')
    my_room = next((x for x in rooms if x.id == int(id)), None)
    if my_room is None:
        return jsonify("This room doesn't exists"), 400
    if my_room is not None:
        rooms.remove(my_room)
        return jsonify({"message": "Room deleted successfully"}), 200


@app.route("/join/<id>", methods=["GET"])
def join(id):
    user_id = request.args.get("user_id")
    my_room = next((x for x in rooms if x.id == int(id)), None)
    if my_room is None:
        return jsonify("This room doesn't exist"), 400  # Return an error if the room doesn't exist

    if user_id in my_room.clients:
        return jsonify(my_room.to_string())

    if len(my_room.clients) == 0:
        return jsonify("There is no host in the room"), 400
    my_room.clients.append(user_id)
    my_room.num_clients += 1
    if len(my_room.clients) == 2:
        my_room.free = False
    else:
        my_room.free = True
    socketio.emit("join", {"room_data":my_room.to_string(), "joiner": user_id})  # Notify all clients
    return jsonify(my_room.to_string())


@app.route("/logout", methods=["GET"])
def logout():
    user_id = request.args.get("user_id")
    for room in rooms:
        if user_id in room.clients:
            remove_user_from_room(room, user_id)
    for room in rooms_to_delete:
        rooms.remove(room)
    session["end"] = True
    return redirect(url_for("index"))


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
            "players_mode": room.players_mode
        }
        rooms_data.append(room_dict)

    return jsonify({"rooms": rooms_data})

# @app.route("/game", methods=["GET"])
# def game():
#     print('/////////GAME///////////', '///////////////////////////////////////////////////////////')
#     session["end"] = True
#     try:
#         print('/////////GAME///////////', session["game"], '///////////////////////////////////////////////////////////')
#         if session.pop("game"):
#             print("//////////Session game = True//////////")
#             # session["game"] = False
#             id = request.args.get("id")
#             print("ID:", id)
#             mode = request.args.get("mode")
#             # Log the values of id and mode for debugging
#
#             print("Mode:", mode)
#             return render_template("game.html", id=id, mode=mode)
#     except Exception as e:
#         # Log the exception details for debugging
#         print("Exception:", str(e))
#     return redirect(url_for("start"))
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
    user_id = request.form.get("user_id")
    # user_id = request.json.get("user_id", None)
    print('/////////POST VIDEO///////////', user_id, '////////////////////////////////////////////////////////////')
    if not os.path.exists(video_directory):
        os.makedirs(video_directory)
    video_path = f'{video_directory}/{uuid.uuid4()}.mp4'
    print('Video path:', video_path)
    out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), 14.0, (1024, 2048))

    picture_height = 1118
    center_row_height = 10
    frame_height = 672
    bottom_row_height = 51
    video_width = 1024
    # Load and resize the logo image
    title_section = cv2.imread('static/assets/video_logo.png')
    title_section_flipped = cv2.flip(title_section, 1)
    center_row = np.zeros((center_row_height, video_width, 3), np.uint8)
    center_row[5:10, :] = (52, 87, 255)
    bottom_row = np.zeros((bottom_row_height, video_width, 3), np.uint8)
    bottom_row[:] = 206

    for picture_id in request.form.getlist('picture_ids[]'):
        picture = Picture.query.get(int(picture_id))
        picture_image = cv2.imread(picture.path)
        print('picture_shape: ', picture_image.shape,' picture_path: ', picture.path, ' picture_id: ', picture_id)
        picture_aspect_ratio = picture_image.shape[1] / picture_image.shape[0]
        print('picture_aspect_ratio: ', picture_aspect_ratio)

        if picture_aspect_ratio > 1:
            print('Landscape (horizontal) picture')
            # Landscape (horizontal) picture
            new_picture_width = video_width
            new_picture_height = int(new_picture_width / picture_aspect_ratio)
            if new_picture_height > picture_height:
                new_picture_height = picture_height
                new_picture_width = int(new_picture_height * picture_aspect_ratio)
        else:
            print('Portrait (vertical) picture')
            # Portrait (vertical) picture
            new_picture_height = picture_height
            new_picture_width = int(new_picture_height * picture_aspect_ratio)
            if new_picture_width > video_width:
                new_picture_width = video_width
                new_picture_height = int(new_picture_width / picture_aspect_ratio)
        print('new_picture_width: ', new_picture_width, ' new_picture_height: ', new_picture_height)
        resized_picture_image = cv2.resize(picture_image, (new_picture_width, new_picture_height))
        picture_section = np.zeros((picture_height, video_width, 3), np.uint8)
        picture_section[:] = (25, 25, 25)  # Black background
        # center resized picture image
        centered_height = (picture_height - new_picture_height) // 2
        centered_width = (video_width - new_picture_width) // 2
        print('centered_height: ', centered_height, ' centered_width: ', centered_width)
        print('picture_section_shape: ', picture_section.shape, ' resized_picture_image_shape: ', resized_picture_image.shape)
        picture_section[centered_height:centered_height + new_picture_height, centered_width:centered_width + new_picture_width] = resized_picture_image

        for file in request.files.getlist(f'frames_{picture_id}[]'):
            img = cv2.imdecode(np.fromstring(file.read(), np.uint8), cv2.IMREAD_COLOR)
            resized_frame_image = cv2.resize(img, (video_width, frame_height))
            # combine the 2 videos one up and one down
            combined_images = np.concatenate((title_section_flipped, resized_frame_image,center_row, picture_section, bottom_row), axis=0)
            flipped_combined_images = cv2.flip(combined_images, 1)
            out.write(flipped_combined_images)

    out.release()
    new_video = Video(path=video_path, user_id=user_id)
    db.session.add(new_video)
    db.session.commit()
    return jsonify(new_video.as_dict())


@app.route("/videos/<id>", methods=["GET"])
def get_video(id):
    video = Video.query.get(int(id))
    return jsonify(video.as_dict())


@app.route('/send-video', methods=['POST'])
def send_video():
    try:
        # Get the user's email from the form
        user_email = request.form.get('email')
        # Attach the video file
        video = request.files['video']
        video_data = video.read()
        # Define your email server and credentials
        smtp_server = 'smtp.gmail.com'
        smtp_port = 587
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        # Create a message object
        msg = MIMEMultipart()
        msg['From'] = os.getenv('SMTP_USERNAME')
        msg['To'] = user_email
        msg['Subject'] = 'Your Strike-a-pose Video'
        # Add a body to the email (optional)
        body = 'Here is your video!'
        msg.attach(MIMEText(body, 'plain'))
        # Attach the video file
        video_attachment = MIMEApplication(video_data, Name='video.mp4')  # Set the desired filename
        video_attachment['Content-Disposition'] = 'attachment; filename="strike-a-pose-video.mp4"'
        msg.attach(video_attachment)
        # Create an SMTP session
        smtp = smtplib.SMTP(smtp_server, smtp_port)
        smtp.starttls()
        smtp.set_debuglevel(1)
        smtp.login(smtp_username, smtp_password)

        # Send the email
        smtp.sendmail(msg['From'], user_email, msg.as_string())

        # Close the SMTP session
        smtp.quit()

        return jsonify({'message': 'Video sent successfully!'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/delete-video', methods=['DELETE'])
def delete_video():
    print('/////////DELETE VIDEO///////////', '////////////////////////////////////////////////////////////')
    data = request.get_json()
    print(data)

    video_id = data.get('videoId')
    print('Video ID:', video_id)
    if not video_id:
        return jsonify({'error': 'Video ID is missing in the request.'}), 400

    video = Video.query.get(int(video_id))
    print('Video:', video)
    if video:
        # Delete the video file based on the path in the database record
        video_file_path = video.path
        # print('Video path:', video_path)
        # video_file_path = os.path.join(video_directory, video_path)
        print('Video file path:', video_file_path)
        if os.path.exists(video_file_path):
            try:
                print(" Delete the video file")
                os.remove(video_file_path)
                return jsonify({'message': 'Video deleted successfully.'}), 200

            except Exception as e:
                print('Error deleting video:', str(e))
                return jsonify({'error': 'An error occurred while deleting the video.'}), 500

    else:
        # video_path = None
        return jsonify({'error': 'Video not found.'}), 404

def is_valid_email(email):
    try:
        # Validate the email address
        valid = validate_email(email)
        # If valid, return True
        return True

    except EmailNotValidError:
        # If not valid, return False
        return False


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

# def check_users_in_rooms():
#
#     while True:
#         check_users()
#         time.sleep(20)  # Check every 60 seconds
# def check_users():
#     print(connected_clients)
#     rooms_to_remove = []
#     # print('///////////////////////////CHECK USERS IN ROOMS///////', len(rooms), '//////////////////////////')
#     for room in rooms:
#         room_id = room.id
#         clients = room.clients
#         creator = room.creator
#         disconnected_clients = []
#
#         # Check if the creator is still connected
#         if creator not in connected_clients.values():
#             disconnected_clients.append(creator)
#             print('**************CREATOR DISCONNECTED**************', creator, '**************ROOM ID**************',
#                   room_id)
#
#         # Check if clients are still connected
#         for client in clients:
#             if client not in connected_clients.values():
#                 print('**************CLIENT DISCONNECTED**************', client, '**************ROOM ID**************',
#                       room_id)
#                 disconnected_clients.append(client)
#
#         unique_list = list(set(disconnected_clients))
#         print('**************DISCONNECTED CLIENTS**************', unique_list, '**************ROOM ID**************',
#               room_id)
#         # Remove disconnected users from the room
#         for user in unique_list:
#             if user in room.clients:
#                 room.clients.remove(user)
#
#         # If all users are disconnected, delete the room
#         if not room.clients:
#             rooms_to_remove.append(room)
#     clean_rooms_to_remove = list(set(rooms_to_remove))
#     for room_to_remove in clean_rooms_to_remove:
#         rooms.remove(room_to_remove)
#     socketio.emit("update_rooms")  # Notify all clients
# # Start the user-checking thread
# user_checking_thread = threading.Thread(target=check_users_in_rooms)
# user_checking_thread.daemon = True
# user_checking_thread.start()

@socketio.on("connect")
def connect():
    emit("status", {"data": "connection established!"})
    emit("update_rooms", [room.to_string() for room in rooms])

@socketio.on("join_room")
def handle_join_room(room_id):
    join_room(room_id)
# @socketio.on('user_connected')
# def handle_user_connected(uniqueId):
#     user_id = uniqueId  # Use the unique socket ID as the user ID
#     add_connected_client(request.sid, user_id)
#     print('Client connected: ', user_id, request.sid, '///////////////////////////////')
#     emit('update_users', list(connected_clients.values()))

# @socketio.on('disconnect')
# def handle_disconnect():
#     print('Client disconnected ************************/////////////////')
    # user_id = get_user_id(request.sid)
    #
    # if user_id is not None and not is_in_game:
    #     remove_disconnected_client(request.sid)
    #     print(f'Client disconnected: {user_id}')
# @socketio.on("join")
# def on_join(room_id, level, user_id):
#     my_room = next((x for x in rooms if x.id == int(room_id)), None)
#     print('in JOIN: ', user_id, level, my_room, my_room.id)
#     if my_room is None:
#         emit("errorRoom", f"room {room_id} doesn't exist")
#         return
#
#     if my_room.num_clients == 2:
#         my_room.free = False
#         emit("error", "sorry, room is full")
#         return
#
#     join_room(my_room.id)
#     my_room.clients.append(user_id)
#     my_room.num_clients += 1
#     # emit("player_joined", {"user_id": user_id}, room=my_room.id)
#     emit("room_message", f"Welcome {user_id} to room {my_room.id}, number of clients connected: {my_room.num_clients}",
#          to=my_room.id)
#     print('LEVEL: ', level, '3333333333333333333333333333333333333333333333333333333333333333333333333333')
#     socketio.emit("update_rooms", [my_room.to_dict()])
#     if my_room.num_clients == 2:
#         print('2 clients')
#         if level is not None:
#             print('LEVEL IS NOT NONE')
#             levelModel = Level.query.get(int(level))
#             shufflePictures = levelModel.as_dict().get('picture_ids')
#             random.shuffle(shufflePictures)
#             emit("play", shufflePictures, to=my_room.id)


# @socketio.on("player_joined")
# def player_joined(data):
#     # Broadcast the player joined event to all clients
#     emit("player_joined", data, broadcast=True)
# @socketio.on('disconnect_user')
# def handle_disconnect(isStartingGame):
#     print("is starting game: ", isStartingGame, "///////////////////////////////")
#     user_id = get_user_id(request.sid)
#     print(user_id, '///////////////////////////////')
#     if user_id is not None and not isStartingGame:
#         remove_disconnected_client(request.sid)
#         print(f'Client disconnected: {user_id}')
#         print(connected_clients)
#         emit('update_users', list(connected_clients.values()))

@socketio.on("player_leave")
def handle_player_leave(room_id, user_id):
    # Get the room the player is leaving from
    # room_id = get_player_room_id(request.sid)

    # Leave the room
    leave_room(room_id)

    # Optionally, notify other players in the room about the departure
    emit("player_left", {"player_id": user_id}, room=room_id)


@socketio.on('leave_room')
def handle_leave_room(data):
    room_id = data.get('room_id')  # Get the room ID from the data object
    user_id = data.get('user_id')  # Get the uniqueId from the data object

    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    if my_room is not None:
        if user_id in my_room.clients:
            my_room.clients.remove(user_id)

        # If all users are disconnected, delete the room
        if not my_room.clients:
            rooms.remove(my_room)
            socketio.emit("room_deleted", {"room_id": my_room.id})  # Notify all clients


@socketio.on("ready_to_start_game")
def handle_start_game_request(data):
    room_id = data["room_id"]
    user_id = data["user_id"]
    print("Room ID:", room_id)
    print("User ID:", user_id)

    # Check if the room exists and initialize the players_ready_to_start list if needed
    if room_id not in room_states:
        room_states[room_id] = {
            'player1': None,
            'player2_ready': False
        }

    # Assign the first player to join as player1
    if room_states[room_id]['player1'] is None:
        room_states[room_id]['player1'] = user_id
        print("Player 1:", user_id)
    else:
        # Assign the second player to join as player2
        room_states[room_id]['player2_ready'] = True
        print("Player 2:", user_id)

        # Check if both players are ready to start
        if room_states[room_id]['player1'] is not None and room_states[room_id]['player2_ready']:
            # Both players are ready, emit a "start_game" event to both clients in the room
            socketio.emit("start_game", {"id": room_id})


@socketio.on("start_game_player2")
def handle_start_game_player2(room_id):
    print("Received 'start_game_player2' from player 1 in room:", room_id)
    socketio.emit("start_player2", {"room": room_id})


@socketio.on("sendResults")
def on_sendResults(room_id, results):
    print(rooms)
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    print("***********MY ROOM in results***********", my_room.id, my_room.results)
    if my_room.results[0] is None:
        my_room.results[0] = results
        print("*********results1", my_room.results[0], "*********")
        emit("results_received", {"player": "1"})
    else:
        my_room.results[1] = results
        print("*********results2", my_room.results[1], "*********")
        emit("results_received", {"player": "2"})


@socketio.on("acquireResults")
def on_acquireResults(room_id):
    try:
        my_room = next((x for x in rooms if x.id == int(room_id)), None)
        if my_room.num_clients == 2:
            if my_room.results[0] is not None and my_room.results[1] is not None:
                emit("getResults", my_room.results)
    except Exception as e:
        print("Error in on_acquireResults:", str(e))


@socketio.on("leaveGame")
def on_leaveGame(room_id):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    leave_room(my_room.id)
    my_room.clients.remove(request.sid)
    my_room.num_clients -= 1
    emit("user_retired", to=my_room.id)


@socketio.on("sendDataToP1")
def send_data_to_player1(room_id, data):
    print("***********sendDataToP1***********",room_id, data)
    emit("receiveDataFromP2", data, to=room_id)

@socketio.on("sendWinnerToP1")
def send_winner_to_player1(data):
    print("***********sendWinnerToP1***********", data)
    room_id = data["roomId"]
    data = {"p1_text": data["p1_text"], "p1_ImgSrc": data["p1_ImgSrc"]}
    print("***********sendWinnerToP1***********", data)
    emit("receiveWinnerFromP2", data, to=room_id)


@socketio.on("end")
def on_end(room_id, player, winner):
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    if my_room is not None:
        rooms.remove(my_room)
        emit("endGame", "Successfully deleted room", to=my_room.id)
    else:
        send("This room doesn't exsits")


def generate_new_user_id():
    # Generate a random user ID consisting of alphanumeric characters
    user_id_length = 10  # You can adjust the length as needed
    characters = string.ascii_letters + string.digits
    user_id = ''.join(random.choice(characters) for _ in range(user_id_length))
    return user_id
