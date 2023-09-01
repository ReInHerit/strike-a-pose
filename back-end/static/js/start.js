import { setRoomAttr, getRoom } from "./scripts/fetchUtils.js";
import { Config } from "./scripts/config.js";
// import { Config } from "./scripts/config";

let socket = undefined;
let roomId;

window.play = function (attrs) {
    const level = attrs[1];
    const n = attrs[2];

    $(() => {
        const roomId = $("#room-id").val();
        if (roomId != "Room ID: ") {
            host(attrs);
        } else {
            window.location = `/game?id=${level.toString()}&mode=solo`;
        }
    });
}

async function host(attrs) {
    roomId = attrs[0];
    const level = attrs[1];
    const n = attrs[2];

    const data = await setRoomAttr(roomId, level, n);
    console.log(data)

    //const data = await Room(roomId);
    const nRound = data.n_round;
    const nPose = data.n_pose;
    if (nPose > n) {
        alert("The number of poses selected must be lower than the number of artworks in the mode you have chosen");
        return;
    }

    $("#fade").addClass("fade-me");
    $("#fade").show();

    const serverUrl = Config.SERVER_URL // `${window.location.protocol}//${window.location.hostname}`;
    socket = io.connect(serverUrl);

    socket.on("status", (status) => {
        console.log("status: " + status.data);
    });

    socket.emit("join", roomId, level);

    socket.on("room_message", (msg) => {
        console.log("message from room: " + msg);
    });

    socket.on("message", (msg) => {
        console.log("message from server: " + msg);
    });

    socket.on("disconnect", () => {
        console.log("disconnect");
    });

    socket.on("play", (pictures) => {
        $("#fade").hide();
        console.log("PLAY!");
        localStorage.setItem("picturesArray",JSON.stringify(pictures));
        play2(nPose, nRound);
    });
}

window.playButtons = function(attr) {
    $("button.play").attr("disabled", attr);
}

window.join = async function() {
    roomId = $("#room-join-id").val();
    const errorJoin = $("#error");

    try {
        const resp = await getRoom(roomId);
        console.log(resp);

        const serverUrl = Config.SERVER_URL // `${window.location.protocol}//${window.location.hostname}`;
        socket = io.connect(serverUrl);

        socket.on("status", (status) => {
            console.log("status: " + status.data);
        });
    
        socket.emit("join", roomId, resp.level);
    
        socket.on("room_message", (msg) => {
            console.log("message from room: " + msg);
        });

        socket.on("error", (msg) => {
            errorJoin.text(msg); 
        });

        socket.on("errorRoom", (msg) => {
            errorJoin.text(msg); 
        });
    
        socket.on("message", (msg) => {
            console.log("message from server: " + msg);
    
        });
    
        socket.on("play", (pictures) => {
            localStorage.setItem("picturesArray",JSON.stringify(pictures));
            play2(resp.n_pose, resp.n_round);
        });

    } catch(error) {
        errorJoin.text(error);
    }
}

function play2(nPose, nRound) {
    localStorage.setItem("roomId",roomId);
    socket.emit("leave", roomId, false);

    socket.on("leave_message", (msg) => {
        console.log("message from room: " + msg);
        window.location = `/game?nPose=${nPose.toString()}&nRound=${nRound.toString()}&mode=versus`;
    });
}

window.logout = function() {
    if(socket !== undefined) {
        socket.emit("leave", roomId, false);

        socket.on("leave_message", (msg) => {
            console.log("message from room: " + msg);
        });
    }
    Cookies.remove("containerHost", { path: '' })
    Cookies.remove("containerJoin", { path: '' })
    Cookies.remove("formHost", { path: '' })
    Cookies.remove("formJoin", { path: '' })
    Cookies.remove("checkbox", { path: '' })
    window.location = "/logout";
}

window.onbeforeunload = function () {
    if(socket !== undefined){
        socket.emit("leave", roomId, false);
        console.log("Disconnect from room");
        delay(1000);
    }
}

function delay(ms) {
    var start = +new Date;
    while ((+new Date - start) < ms);
}
