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
import flask_login
import threading
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
# Lock for thread-safe access to the dictionary
clients_lock = threading.Lock()

# Function to add a connected client
def add_connected_client(socket_id, user_id):
    with clients_lock:
        connected_clients[socket_id] = user_id

# Function to remove a disconnected client
def remove_disconnected_client(socket_id):
    with clients_lock:
        if socket_id in connected_clients:
            del connected_clients[socket_id]

# Function to get the user ID associated with a socket ID
def get_user_id(socket_id):
    with clients_lock:
        return connected_clients.get(socket_id)

# Function to check if a user is connected
def is_user_connected(user_id):
    with clients_lock:
        return user_id in connected_clients.values()

@app.route("/", methods=["GET"])
def index():
    session["end"] = False
    return render_template("index.html")

@app.route("/login/<unique_id>", methods=["GET"])
def login(unique_id):
    # Check if the provided unique ID exists in the user profiles
    user_profile = UserProfile.query.filter_by(unique_id=unique_id).first()
    if user_profile:
        # Get the associated user object
        user = user_profile.user
        # Log in the user using Flask-Login
        flask_login.login_user(user)
        return redirect(url_for('protected'))
    else:
        return 'Invalid unique ID'


@app.route("/start", methods=["GET"])
def start():

    user_id = generate_new_user_id()
    print('/////////////////////////////', user_id, '////////////////////////////////////////////////////////////')
    print(session)
    session["end"] = False
    session["game"] = True
    try:
        room_id = session.pop("room_id")
        n_round = session.pop("n_round")
        n_pose = session.pop("n_pose")
    except:
        return render_template("start.html", form=CreateRoomForm(), join_form=JoinRoomForm(), levels=Level.query.all(), user_id=user_id)
    #
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
    # my_room.clients.append(user_id)
    rooms.append(my_room)
    if players_mode == "1":
        # my_room.num_clients = 1
        my_room.free = False
    # session["room_id"] = id
    # session["n_round"] = n_round
    # session["n_pose"] = n_pose
    # session["level"] = level
    json_response = jsonify({"room_id": id})
    socketio.emit("room_created", my_room.to_string())  # Notify all clients
    return json_response

    # return render_template("start.html", form=form, join_form=JoinRoomForm(), levels=Level.query.all(), room=session["room_id"])


@app.route("/room", methods=["POST"])
def room():
    print('IN ROOM ROUTE: ',request.json)
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
        socketio.emit("room_deleted", {"room_id": int(id)})  # Notify all clients
        return jsonify({"message": "Room deleted successfully"}), 200


@app.route("/join/<id>", methods=["GET"])
def join(id):
    user_id = request.args.get("user_id")
    my_room = next((x for x in rooms if x.id == int(id)), None)
    if my_room is None:
        return jsonify("This room doesn't exist"), 400  # Return an error if the room doesn't exist

    print('/////////JOIN////////////', user_id, '///////////////////////////////////////////////////////////')
    print(session)
    if user_id in my_room.clients:
        print('/////////ALREADY IN ROOM///////////', user_id, '////////////////////////////////////////////////////////////')
        return jsonify(my_room.to_string())

    # If the user is not the host, return an error if there is no host in the room
    if len(my_room.clients) == 0:
        return jsonify("There is no host in the room"), 400
    my_room.clients.append(user_id)
    my_room.num_clients += 1
    if len(my_room.clients) == 2:
        my_room.free = False
    else:
        my_room.free = True
    print("**************", my_room.to_string(), "**************")
    socketio.emit("update_rooms")  # Notify all clients
    # socketio.emit("join", my_room.to_string())  # Notify all clients
    return jsonify(my_room.to_string())

@app.route("/logout", methods=["GET"])
def logout():
    user_id = request.args.get("user_id")
    print('/////////LOGOUT///////////', user_id, '//////////////',len(rooms),'//////////////////////////////////////////////')
    print(rooms)
    check_users()
    # for room in rooms:
    #     print('**************', room.to_string(), '**************', user_id)
    #     print(len(rooms))
    #     if user_id in room.clients:
    #
    #         if room.players_mode == "2":
    #             print('************** VERSUS ROOM **************')
    #
    #             remove_user_from_room(room, user_id)
    #         elif room.players_mode == "1":
    #             print('************** SOLO ROOM **************')
    #             # if user_id == room.creator:
    #             len(rooms)
    #             remove_user_from_room(room, user_id)
    #             len(rooms)
    #
    # session["end"] = True

    socketio.emit("update_rooms", user_id)  # Notify all clients
    return redirect(url_for("index"))


# Function to remove a user from a room
def remove_user_from_room(room, user_id):
    if user_id == room.creator:
        print("delete room", room.id)
        rooms.remove(room)
        # socketio.emit("room_deleted", {"room_id": room.id})
    elif user_id in room.clients:
        print("remove user", user_id)
        room.clients.remove(user_id)
        room.num_clients -= 1
        room.free_space = True
        if room.num_clients == 0:
            print("num_clients 0, delete room", room.id)
            rooms.remove(room)

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
@app.route("/game", methods=["GET"])
def game():
    print('/////////GAME///////////', '////////////////////////////////////////////////////////////')
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
    if not os.path.exists('static/videos'):
        os.makedirs('static/videos')
    video_path = f'static/videos/{uuid.uuid4()}.mp4'
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
            return render_template("end.html", id=id, player=player)
    except:
        return redirect(url_for("start"))
    return redirect(url_for("start"))

def check_users_in_rooms():

    while True:
        check_users()
        time.sleep(20)  # Check every 60 seconds
def check_users():
    print(connected_clients)
    rooms_to_remove = []
    # print('///////////////////////////CHECK USERS IN ROOMS///////', len(rooms), '//////////////////////////')
    for room in rooms:
        room_id = room.id
        clients = room.clients
        creator = room.creator
        disconnected_clients = []

        # Check if the creator is still connected
        if creator not in connected_clients.values():
            disconnected_clients.append(creator)
            print('**************CREATOR DISCONNECTED**************', creator, '**************ROOM ID**************',
                  room_id)

        # Check if clients are still connected
        for client in clients:
            if client not in connected_clients.values():
                print('**************CLIENT DISCONNECTED**************', client, '**************ROOM ID**************',
                      room_id)
                disconnected_clients.append(client)

        unique_list = list(set(disconnected_clients))
        print('**************DISCONNECTED CLIENTS**************', unique_list, '**************ROOM ID**************',
              room_id)
        # Remove disconnected users from the room
        for user in unique_list:
            if user in room.clients:
                room.clients.remove(user)

        # If all users are disconnected, delete the room
        if not room.clients:
            rooms_to_remove.append(room)
    clean_rooms_to_remove = list(set(rooms_to_remove))
    for room_to_remove in clean_rooms_to_remove:
        rooms.remove(room_to_remove)
    socketio.emit("update_rooms")  # Notify all clients
# Start the user-checking thread
user_checking_thread = threading.Thread(target=check_users_in_rooms)
user_checking_thread.daemon = True
user_checking_thread.start()

@socketio.on("connect")
def connect():
    emit("status", {"data": "connection established!"})
    emit("update_rooms", [room.to_string() for room in rooms])

@socketio.on('user_connected')
def handle_user_connected(uniqueId):
    user_id = uniqueId  # Use the unique socket ID as the user ID
    add_connected_client(request.sid, user_id)
    print('Client connected: ', user_id, request.sid, '///////////////////////////////')
    emit('update_users', list(connected_clients.values()))

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected ************************/////////////////')
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
@socketio.on('disconnect_user')
def handle_disconnect(isStartingGame):
    print("is starting game: ", isStartingGame, "///////////////////////////////")
    user_id = get_user_id(request.sid)
    print(user_id, '///////////////////////////////')
    if user_id is not None and not isStartingGame:
        remove_disconnected_client(request.sid)
        print(f'Client disconnected: {user_id}')
        print(connected_clients)
        emit('update_users', list(connected_clients.values()))


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
            print("********IN LEAVE ROOM remove empty room**********", my_room.id)
            rooms.remove(my_room)
            socketio.emit("room_deleted", {"room_id": my_room.id})  # Notify all clients
# @socketio.on("leave_room")
# def user_leave_room(data):
#     print('*********************************ON LEAVE', data)
#     room_id = data["room_id"]
#     user_id = data["user_id"]
#     retired = data.get("retired", False)
#     creator = data["creator"]
#     players_mode = data["players_mode"]
#     print('*********************************ON LEAVE', user_id, room_id, retired)
#     # user = user_id
#     my_room = next((x for x in rooms if x.id == int(room_id)), None)
#     if my_room is not None:
#         if players_mode == "2":
#             if user_id == creator:
#                 # If the leaving user is the room's creator, delete the room
#                 rooms.remove(my_room)
#                 # emit("room_deleted", {"room_id": my_room.id}, room=room_id)
#             else:
#                 if user_id in my_room.clients:
#                     my_room.clients.remove(user_id)
#                     my_room.num_clients -= 1
#                     my_room.free = True
#         elif players_mode == "1":
#             if user_id == creator:
#                 # If the leaving user is the room's creator, delete the room
#                 rooms.remove(my_room)
#                 # emit("room_deleted", {"room_id": my_room.id}, room=room_id)
#
#         if retired:
#             emit("room_leave_message", f"{user_id} from room {my_room.id} withdrew")
#         else:
#             emit("room_leave_message", f"Bye {user_id} from room {my_room.id}")
#         send(f"{my_room.to_string()}", room=my_room.id)
#         emit("update_room", {"room": my_room.to_string()}, room=room_id)

# @socketio.on("play")
# def play(room_id, level):
#     print('PLAY', room_id, level, '888888888888888888888888888888888888888888888888')
#     my_room = next((x for x in rooms if x.id == int(room_id)), None)
#     if my_room is not None:
#         levelModel = Level.query.get(int(level))
#         shufflePictures = levelModel.as_dict().get('picture_ids')
#         emit("play", shufflePictures, to=my_room.id)
#

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
            socketio.emit("start_game", {"room": room_id})


@socketio.on("start_game_player2")
def handle_start_game_player2(room_id):
    # Perform any necessary actions when player 2 is ready to start the game
    # For example, you can emit a message or perform other logic here
    print("Received 'start_game_player2' from player 1 in room:", room_id)

    # If needed, you can emit a message to player 1 or perform other actions
    socketio.emit("start_player2", {"room": room_id})
@socketio.on("sendResults")
def on_sendResults(room_id, results):
    print(rooms)
    my_room = next((x for x in rooms if x.id == int(room_id)), None)
    print("***********MY ROOM in results***********", my_room.id, my_room.results)
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

def generate_new_user_id():
    # Generate a random user ID consisting of alphanumeric characters
    user_id_length = 10  # You can adjust the length as needed
    characters = string.ascii_letters + string.digits
    user_id = ''.join(random.choice(characters) for _ in range(user_id_length))
    return user_id
