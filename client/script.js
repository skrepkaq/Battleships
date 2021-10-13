const IP = "localhost";
const PORT = 50500;
const PROTOCOL = "ws"; //ws or wss PROTOCOL

var canvas = document.querySelector("canvas"),
    ctx = canvas.getContext("2d"),
    form = document.querySelector("form"),
    loginBtn = document.querySelector("#login_btn"),
    logregText = document.querySelector("#logreg_text"),
    logregBtn = document.querySelector("#logreg_btn"),
    loginAlert = document.querySelector("#login_alert"),
    codeInput = document.querySelector("#code_input"),
    joinBtns = document.getElementsByClassName("join_game"),
    joinCode = document.getElementById("join_code"),
    blocks = document.getElementsByClassName("block"),
    pingSnd = new Audio("sounds/ping.ogg"),
    field_startX = 30,
    field_startY = 70,
    field_size = 300,
    field_canvas = 1.5;

let active_startX,
    active_startY,
    board,
    board_hits,
    opp_board,
    code,
    room_code,
    nick,
    opp_nick,
    players_top,
    ships_count = [0, 0, 0, 0],
    state = 0,
    turn,
    errors,
    alert_text = "",
    ended = false,
    registr = false;

const socket = new WebSocket(PROTOCOL + "://" + IP + ":" + PORT);

canvas.addEventListener("click", event => {
    const x = event.layerX;
    const y = event.layerY;
    if (
        x > active_startX &&
        x < active_startX + field_size &&
        y > active_startY &&
        y < active_startY + field_size
    ) {
        //click on active board
        const fldX = x - active_startX;
        const fldY = y - active_startY;
        const cellSize = field_size/10;
        const Ycell = Math.floor(fldY / cellSize);
        const Xcell = Math.floor(fldX / cellSize);
        let cell_state = 1;
        if (board && board[Ycell][Xcell] !== 0) cell_state = 0;

        const num = Ycell*10 + Xcell;
        if (state === 1) {
            socket.send(
                JSON.stringify({
                    type: "place",
                    num: num,
                    state: cell_state
                })
            );
        } else if (state === 3 && turn === 1) {
            socket.send(
                JSON.stringify({
                    type: "shot",
                    num: num
                })
            );
        }
    } else if (
        (state === 1) & (x > field_startX + field_size + 10) &&
        x < field_startX + field_size + 130 &&
        y > field_startY + field_size - 30 &&
        y < field_startY + field_size
    ) {
        //click start button
        socket.send(
            JSON.stringify({
                type: "start"
            })
        );
    } else if (
        state === 1 &&
        x > field_startX + field_size + 10 &&
        x < field_startX + field_size + 130 &&
        y > field_startY &&
        y < field_startY + 30
    ) {
        //click auto place button
        socket.send(
            JSON.stringify({
                type: "auto_place"
            })
        );
    } else if (
        ended & (x > field_startX + field_size - 35) &&
        x < field_startX + field_size + 85 &&
        y > field_startY + field_size + 15 &&
        y < field_startY + field_size + 45
    ) {
        //click restart button
        socket.send(
            JSON.stringify({
                type: "restart"
            })
        );
    }
    if (code && state === 0) navigator.clipboard.writeText(code);
});

socket.onmessage = event => {
    console.log(event.data);
    const rc = JSON.parse(event.data);
    switch (rc.type) {
        case "board":
            if (state !== 3) {
                board = rc.data;
            } else if (rc.my === 0) {
                opp_board = rc.data;
            } else {
                board_hits = rc.data;
            }
            break;
        case "state":
            switch (rc.data) {
                case 4:
                    blocks[0].classList.remove("hide");
                    alert_text = "";
                    state = -2;
                    break;
                case -1:
                    blocks[0].classList.add("hide");
                    blocks[1].classList.remove("hide");
                    state = -1;
                    break;
                case 0:
                    blocks[1].classList.add("hide");
                    alert_text = "Wait for the opponent";
                    state = 0;
                    break;
                case 1:
                    blocks[1].classList.add("hide");
                    alert_text = "Place your ships";
                    state = 1;
                    ended = false;
                    board = null;
                    board_hits = null;
                    opp_board = null;
                    ships_count = [0, 0, 0, 0];
                    active_startX = field_startX;
                    active_startY = field_startY;
                    pingSnd.play();
                    break;
                case 2:
                    alert_text = "Wait... again...";
                    state = 2;
                    break;
                case 3:
                    state = 3;
                    active_startX = field_startX + field_size + 50;
                    break;
            }
            break;
        case "ships":
            ships_count = rc.data;
            break;
        case "turn":
            turn = rc.data;
            if (turn === 1) {
                alert_text = "You walk";
            } else {
                alert_text = "The opponent walks";
            }
            break;
        case "end":
            switch (rc.data) {
                case 0:
                    alert_text = "You've lost!";
                    ended = true;
                    break;
                case 1:
                    alert_text = "You have won!";
                    ended = true;
                    break;
                case 4:
                    alert_text = "The opponent is out!";
                    socket.close();
                    ended = false;
                    break;
            }
            break;
        case "login_result":
            blocks[0].classList.remove("hide");
            alert_text = "";
            switch (rc.data) {
                case 0:
                    loginAlert.textContent = "Invalid username or password!";
                    break;
                case 1:
                    loginAlert.textContent = "This login already exists!";
                    break;
                case 2:
                    nick = form.login.value;
                    break;
                case 3:
                    loginAlert.textContent = "The account is already online!";
                    break;
                case 5:
                    loginAlert.textContent = "STOP CREATING ACCOUNTS!";
                    break;
            }
            break;
        case "token":
            localStorage.setItem("skrepka.battleships.token.login", rc.data);
            break;
        case "top":
            players_top = rc.data;
            break;
        case "op_nick":
            opp_nick = rc.data;
            break;
        case "code":
            code = rc.data;
            break;
    }
    redraw();
};

const draw_field = (stX, stY) => {
    ctx.fillStyle = "#FFFFFF";
    for (let i = 0; i < 11; i++)
        ctx.fillRect(stX + (i*field_size)/10, stY, field_canvas, field_size + field_canvas);
    for (let i = 0; i < 11; i++)
        ctx.fillRect(stX, stY+(i*field_size)/10, field_size, field_canvas);
};

const draw_ships = (stX, stY, size, brd, is_shot) => {
    errors = 0;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const val = brd[y][x];
            if (!is_shot) {
                switch (val) {
                    case 0:
                        ctx.fillStyle = "#FFFFFF";
                        break;
                    case 1:
                        ctx.fillStyle = "#555555";
                        break;
                    case 2:
                        errors++;
                        ctx.fillStyle = "#FF0000";
                        break;
                    case 4:
                        errors++;
                        ctx.fillStyle = "#FF00FF";
                        break;
                    case 5:
                        errors++;
                        ctx.fillStyle = "#FFFFFF";
                        break;
                }
                ctx.fillRect(
                    stX + (x*size)/10 + field_canvas,
                    stY + (y*size)/10 + field_canvas,
                    size/10 - field_canvas,
                    size/10 - field_canvas
                );
            } else {
                if (val === 4) {
                    ctx.fillStyle = "#999999";
                    ctx.beginPath();
                    ctx.arc(
                        stX + (x+0.5)*size/10 + field_canvas,
                        stY + (y+0.5)*size/10 + field_canvas,
                        3, 0, 2 * Math.PI, false
                    );
                    ctx.fill();
                } else if (val !== 0) {
                    if (val === 3) {
                        ctx.fillStyle = "#555555";
                        ctx.fillRect(
                            stX + x*size/10 + field_canvas,
                            stY + y*size/10 + field_canvas,
                            size/10 - field_canvas,
                            size/10 - field_canvas
                        );
                    }
                    ctx.strokeStyle = "#FF0000";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(stX + (x+0.2)*size/10, stY+(y+0.2)*size / 10);
                    ctx.lineTo(stX + (x+0.8)*size/10, stY+(y+0.8)*size / 10);
                    ctx.moveTo(stX + (x+0.8)*size/10, stY+(y+0.2)*size / 10);
                    ctx.lineTo(stX + (x+0.2)*size/10, stY+(y+0.8)*size / 10);
                    ctx.stroke();
                }
            }
        }
    }
};

const draw_ships_count = () => {
    ctx.font = "12px Tahoma";
    ctx.textAlign = "right";
    let correct_ships = 0;
    for (let i = 0; i < 4; i++) {
        if (ships_count[i] < 4 - i) ctx.fillStyle = "#333333";
        else if (ships_count[i] === 4 - i) {
            correct_ships++;
            ctx.fillStyle = "#00FF00";
        } else ctx.fillStyle = "#FF0000";

        ctx.fillText(
            `${ships_count[i]}/${4 - i} ships`,
            field_startX + field_size + 82,
            field_startY + field_size/2 + i*50 - 50
        );
        ctx.fillRect(
            field_startX + field_size - 18*(i+1) + 82,
            field_startY + field_size/2 + i*50 - 62,
            18*(i+1),
            (-18/(4-i))*ships_count[i]
        );
        ctx.strokeStyle = "#FFFFFF";
        for (let j = 0; j < i + 1; j++) {
            ctx.strokeRect(
                field_startX + field_size + 82 - 18*j,
                field_startY + field_size/2 + i*50 - 80,
                -18, 18
            );
        }
    }
    if (correct_ships === 4 && errors === 0) {
        draw_button(
            field_startX + field_size + 70,
            field_startY + field_size - 15,
            "Start!",
            "#009900"
        );
    }
};

const draw_alert = () => {
    ctx.font = "30px Tahoma";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    if (state === 3)
        ctx.fillText(alert_text, field_startX + field_size + 25, field_startY - 30);
    else if (state === 0) {
        if (code) {
        ctx.font = "25px Tahoma";
        ctx.fillText("To connect to you, use", field_startX + field_size + 90, field_startY + field_size/2 - 35);
        ctx.fillText(`this code: ${code}`, field_startX + field_size + 90, field_startY + field_size/2 - 10);
        ctx.font = "15px Tahoma";
        ctx.fillText("(click to copy)", field_startX + field_size + 90, field_startY + field_size/2 + 10);
        } else
            ctx.fillText(alert_text, field_startX + field_size + 90, field_startY + field_size/2 - 10);
    } else
    ctx.fillText(alert_text, field_startX + field_size/2, field_startY - 30);
};

const draw_nick = () => {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    if (state === 3) {
        ctx.font = "30px Tahoma";
        ctx.fillText(nick, field_startX + field_size/2, field_startY + field_size + 30);
        ctx.fillText(opp_nick, active_startX + field_size/2, active_startY + field_size + 30);
    } else {
        ctx.font = "20px Tahoma";
        ctx.fillText(
            `You play against ${opp_nick}`,
            field_startX + field_size/2,
            field_startY + field_size + 30
        );
    }
};

const draw_top = (x, y) => {
    if (players_top) {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "25px Tahoma";
        for (let i = 0; i < players_top.length; i++) {
            ctx.font = "15px Tahoma";
            ctx.fillStyle = "#F00";
            ctx.fillText(players_top[i][2], x, y + 20*i + 30);
            let offset = Math.floor(players_top[i][2]/10)*7;
            ctx.fillStyle = "#0F0";
            ctx.fillText(players_top[i][1], x - offset - 13, y + 20*i + 30);
            offset += Math.floor(players_top[i][1]/10)*7;
            ctx.fillStyle = "#FFF";
            ctx.fillText(players_top[i][0], x - offset - 30, y + 20*i + 30);
        }
    }
};

const draw_button = (bt_X, bt_Y, text, color) => {
    ctx.font = "20px Tahoma";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeRect(bt_X - 60, bt_Y - 15, 120, 30);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(bt_X - 60, bt_Y - 15, 120, 30);
    ctx.globalAlpha = 1.0;
    ctx.fillText(text, bt_X, bt_Y);
};

const redraw = () => {
    ctx.clearRect(0, 0, 850, 420);
    draw_alert();
    if (ended) {
        draw_button(
            field_startX + field_size + 25,
            field_startY + field_size + 30,
            "Restart",
            "#990000"
        );
    }
    if (board) draw_ships(field_startX, field_startY, field_size, board, false);
    switch (state) {
        case -1:
            draw_top(field_startX + 190, field_startY + 70);
            break;
        case 1:
            draw_field(field_startX, field_startY);
            draw_ships_count();
            draw_button(field_startX + field_size + 70, field_startY + 15, "Auto", "#FFD500");
            draw_nick();
            break;
        case 2:
            draw_field(field_startX, field_startY);
            draw_top(active_startX + field_size + 160, active_startY + 40);
            draw_nick();
            break;
        case 3:
            draw_field(field_startX, field_startY);
            draw_field(active_startX, active_startY);
            draw_top(active_startX + field_size + 160, active_startY + 40);
            draw_nick();
            if (opp_board) draw_ships(active_startX, active_startY, field_size, opp_board, true);
            if (board_hits) draw_ships(field_startX, field_startY, field_size, board_hits, true);
            break;
    }
};

joinCode.addEventListener("click", () => {
    room_code = prompt("Enter room code","");
    socket.send(
        JSON.stringify(
        {
                type: "join",
                data: 1,
                code: room_code
            }
        )
    );
});

for (let i = 0; i < joinBtns.length; i++) {
    joinBtns[i].addEventListener("click", () => {
        socket.send(
            JSON.stringify(
                i === 1
                    ? {
                          type: "join",
                          data: i,
                          code: room_code
                      }
                    : {
                          type: "join",
                          data: i
                      }
            )
        );
    });
}


form.addEventListener("submit", e => {
    e.preventDefault();
    const lgn = form.login.value;
    const pswgd = form.password.value;

    if (pswgd.length > 5 && lgn.length > 3 && pswgd.length <= 50 && lgn.length <= 20) {
        if (lgn.match(/^[0-9a-zA-Z_-]+$/)) {
            if (registr) {
                socket.send(
                    JSON.stringify({
                        type: "authorization",
                        method: "register",
                        login: lgn,
                        password: pswgd
                    })
                );
                document.querySelector("#login_btn").innerHTML = 'Log in'
                logregText.innerHTML = 'Don\'t have an account yet?'
                logregBtn.innerHTML = 'Sing up'
                document.body.style.backgroundColor = '#003366';
                document.querySelector(".block").style.backgroundColor = '#006699';
                document.querySelector("#login_btn").style.width = '100px';
                document.querySelector("#login_btn").style.backgroundColor = '#0099CC';
            } else {
                socket.send(
                    JSON.stringify({
                        type: "authorization",
                        method: "login",
                        login: lgn,
                        password: pswgd
                    })
                );
                document.querySelector("#login_btn").innerHTML = 'Log in'
                logregText.innerHTML = 'Don\'t have an account yet?'
                logregBtn.innerHTML = 'Sing up'
                document.body.style.backgroundColor = '#003366';
                document.querySelector(".block").style.backgroundColor = '#006699';
                document.querySelector("#login_btn").style.width = '100px';
                document.querySelector("#login_btn").style.backgroundColor = '#0099CC';

            }
        } else {
            loginAlert.innerHTML = "Please use only Latin letters and numbers.";
        }
    } else {
        loginAlert.innerHTML = "The login must be in the range from 3 to 20 characters. The password must be in the range from 6 to 50 characters.";
    }
});

logregBtn.addEventListener("click", () => {
    if (!registr) {
        document.querySelector("#login_btn").innerHTML = 'Sing up'
        logregText.innerHTML = 'Already have an account?'
        logregBtn.innerHTML = 'Log in'
        document.body.style.backgroundColor = '#003300';
        document.querySelector(".block").style.backgroundColor = '#006600';
        document.querySelector("#login_btn").style.width = '120px';
        document.querySelector("#login_btn").style.backgroundColor = '#339900';
    }
    else{
        document.querySelector("#login_btn").innerHTML = 'Log in'
        logregText.innerHTML = 'Don\'t have an account yet?'
        logregBtn.innerHTML = 'Sing up'
        document.body.style.backgroundColor = '#003366';
        document.querySelector(".block").style.backgroundColor = '#006699';
        document.querySelector("#login_btn").style.width = '100px';
        document.querySelector("#login_btn").style.backgroundColor = '#0099CC';

    }
    registr = !registr
});

redraw();

socket.onopen = () => {
    console.log("Connected.");
    const token = localStorage.getItem("skrepka.battleships.token.login");
    if (token) {
        socket.send(JSON.stringify({type: "authorization", method: "token", token}));
    } else {
        blocks[0].classList.remove("hide");
        alert_text = "";
        state = -2;
    }
};

socket.onclose = event => {
    console.log(`Code: ${event.code} reason: ${event.reason}`);
    if (event.wasClean) {
        console.log("The server is closed");
    } else {
        console.log("Connection error");
        alert_text = "Server connection error";
        redraw();
    }
};

socket.onerror = error => console.error(`Error ${error.message}`);
