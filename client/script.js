IP = 'localhost'
PORT = 50500
PROTOCOL = 'ws' //ws or wss PROTOCOL


var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var form = document.querySelector("form");
const loginBtn =  document.querySelector('#login_btn');
const logregText =  document.querySelector('#logreg_text');
const logregBtn =  document.querySelector('#logreg_btn');
const loginAlert =  document.querySelector('#login_alert');
const codeInput =  document.querySelector('#code_input');
var joinBtns = document.getElementsByClassName('join_game');
var blocks = document.getElementsByClassName('block');

var pingSnd = new Audio("sounds/ping.ogg");


const field_startX = 30;
const field_startY = 70;
const field_size = 300;
const field_canvas = 1.5;
var active_startX;
var active_startY;

var board;
var board_hits;
var opp_board;
var code;
var nick;
var opp_nick;
var players_top;
var ships_count = [0, 0, 0, 0];

var state = 0;
var turn;
var errors;
var alert_text = "";
var ended = false;
registr = false;

socket = new WebSocket(PROTOCOL+'://'+IP+':'+PORT);


canvas.addEventListener('click', click);
socket.onmessage = receive;

for (let i = 0; i < joinBtns.length; i++) {
    joinBtns[i].addEventListener('click', function (event) {
      if (i == 1) {
        var sendobj = {
            type: "join",
            data: i,
            code: codeInput.value
          }; 
      } else {
        var sendobj = {
            type: "join",
            data: i,
        };
      }
      socket.send(JSON.stringify(sendobj));
    });
  }


loginBtn.addEventListener('click', function (event) {
    let lgn = form.login.value;
    let pswgd = form.password.value;
    var letterNumber = /^[0-9a-zA-Z_-]+$/;
    
    if (pswgd.length > 5 && lgn.length > 3 && pswgd.length <= 50 && lgn.length <= 20) {
        if (lgn.match(letterNumber)) {
            if (registr) {
                socket.send(JSON.stringify({type: "authorization", method: "register", login: lgn, password: pswgd}));
            } else {
                socket.send(JSON.stringify({type: "authorization", method: "login", login: lgn, password: pswgd}));
            }
        } else {
        loginAlert.innerHTML = "Please use only A-Z 0-9 characters";
        }
    } else {
        loginAlert.innerHTML = "Login must be 4-20 characters long, password - 6-50";
    }
});


logregBtn.addEventListener('click', function (event) {
    if (registr) {
        loginBtn.innerHTML = 'Login';
        logregBtn.innerHTML = 'Register';
        logregText.innerHTML = 'Already have an account? ';
        registr = false;
    } else {
        loginBtn.innerHTML = 'Sign up';
        logregBtn.innerHTML = 'Login';
        logregText.innerHTML = 'Don\'t have an account? ';
        registr = true;
    }
});


redraw();

function click(event) {
    let x = event.layerX;
    let y = event.layerY;
    if (x>active_startX & x<active_startX + field_size & y>active_startY & y<active_startY + field_size) {
        let fldX = x - active_startX;
        let fldY = y - active_startY;
        let cellSize = field_size/10;
        let Ycell = Math.floor(fldY/cellSize);
        let Xcell = Math.floor(fldX/cellSize);
        let cell_state = 1;
        if (board) {
            if (board[Ycell][Xcell] != 0) {
                cell_state = 0;
            }
        }
        let num = Ycell*10 + Xcell;
        let sendobj;
        if (state == 1) {
            sendobj = {
            type: "place",
            num: num,
            state: cell_state
          };
          socket.send(JSON.stringify(sendobj));
        } else if (state == 3 && turn == 1) {
            sendobj = {
            type: "shot",
            num: num
            };
            socket.send(JSON.stringify(sendobj));
        }
        
    } else if (state == 1 & x > field_startX + field_size + 10 & x < field_startX + field_size + 130 &
                            y > field_startY + field_size - 30 & y < field_startY + field_size) {
            let sendobj = {
                type: "start"
              };
            socket.send(JSON.stringify(sendobj));
    } else if (state == 1 & x > field_startX + field_size + 10 & x < field_startX + field_size + 130 &
                            y > field_startY & y < field_startY + 30) {
            let sendobj = {
                type: "auto_place"
              };
            socket.send(JSON.stringify(sendobj));
    } else if (ended & x > field_startX + field_size + 25-60 & x < field_startX + field_size + 25+60 &
                       y > field_startY + field_size + 30-15 & y < field_startY + field_size + 30+15) {
            let sendobj = {
                type: "restart"
                };
            socket.send(JSON.stringify(sendobj));
        }
    if (code && state == 0) {
        const el = document.createElement('textarea');
        el.value = code;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }
  }


function receive(event) {
    console.log(event.data);
    let rc = JSON.parse(event.data);
    switch (rc.type) {
        case "board":
            if (state != 3) {
                board = rc.data;
            } else if (rc.my == 0) {
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
                    alert_text = "Wait for player";
                    state = 0;
                    break;
                case 1:
                    blocks[1].classList.add("hide");
                    alert_text = "Place ur ships";
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
            if (turn == 1) {
                alert_text = "Shot ur shot";
            } else {
                alert_text = "Wait for ur turn";
            }
            break;
        case "end":
            switch (rc.data) {
                case 0:
                    alert_text = "You lose";
                    ended = true;
                    break;
                case 1:
                    alert_text = "You win!";
                    ended = true;
                    break;
                case 4:
                    alert_text = "Opponent left";
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
                    loginAlert.innerHTML = "Wrong login or password";
                    break;
                case 1:
                    loginAlert.innerHTML = "Account with this login already exist";
                    break;
                case 2:
                    nick = form.login.value;
                    break;
                case 3:
                    loginAlert.innerHTML = "This account is already online";
                    break;
            }
            break;
        case "token":
            localStorage.setItem('skrepka.battleships.token.login', rc.data);
            break;
        case "top": players_top = rc.data; break;
        case "op_nick": opp_nick = rc.data; break;
        case "code": code = rc.data; break;
        }
        redraw();
}


function redraw() {
    ctx.clearRect(0, 0, 850, 420);
    draw_alert();
    if (ended) {
        draw_button(field_startX + field_size + 25, field_startY + field_size + 30, "Restart", "#990000");
    }
    if (board) {
        draw_ships(field_startX,field_startY,field_size, board, false);
    }
    switch (state) {
        case -1:
            draw_top(field_startX+190, field_startY-20);
            break;
        case 1:
            draw_field(field_startX, field_startY);
            draw_ships_count();
            draw_button(field_startX + field_size + 70, field_startY + 15, "Auto", "#FFD500");
            draw_nick();
            break;
        case 2:
            draw_field(field_startX, field_startY);
            draw_top(active_startX+field_size+160, active_startY+40);
            draw_nick();
            break;
        case 3:
            draw_field(field_startX, field_startY);
            draw_field(active_startX, active_startY);
            draw_top(active_startX+field_size+160, active_startY+40);
            draw_nick();
            if (opp_board) {
                draw_ships(active_startX,active_startY, field_size, opp_board, true);
            }
            if (board_hits) {
                draw_ships(field_startX,field_startY, field_size, board_hits, true);
            }
            break;
    }
}


  function draw_field(stX, stY) {
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 11; i++) {
        ctx.fillRect(stX + i*field_size/10, stY, field_canvas, field_size + field_canvas);
    }
    for (let i = 0; i < 11; i++) {
        ctx.fillRect(stX, stY + i*field_size/10, field_size, field_canvas);
    }
}


function draw_ships(stX, stY, size, brd, is_shot) {
    errors = 0;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            let val = brd[y][x];
            if (!is_shot) {
                switch (val) {
                    case 0:
                        ctx.fillStyle = "#FFFFFF";
                        break;
                    case 1:
                        ctx.fillStyle = "#555555";
                        break;
                    case 3:
                        errors++;
                        ctx.fillStyle = "#FF0000";
                        break;
                    case 4:
                        errors++;
                        ctx.fillStyle = "#FF00FF";
                        break;
                    case 5:
                        errors++;
                        ctx.fillStyle = "#000000";
                        break;
                }
                ctx.fillRect(stX + x*size/10 + field_canvas, stY + y*size/10 + field_canvas, size/10-field_canvas, size/10-field_canvas);
            } else {
                if (val == 4) {
                    ctx.fillStyle = "#999999";
                    ctx.beginPath();
                    ctx.arc(stX + (x+0.5)*size/10 + field_canvas, stY + (y+0.5)*size/10 + field_canvas, 3, 0, 2 * Math.PI, false);
                    ctx.fill();
                } else if (val != 0) {
                    if (val == 3) {
                        ctx.fillStyle = "#555555";
                        ctx.fillRect(stX + x*size/10 + field_canvas, stY + y*size/10 + field_canvas, size/10-field_canvas, size/10-field_canvas);
                    }
                    ctx.strokeStyle = "#FF0000";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(stX + (x+0.2)*size/10, stY + (y+0.2)*size/10);
                    ctx.lineTo(stX + (x+0.8)*size/10, stY + (y+0.8)*size/10);
                    ctx.moveTo(stX + (x+0.8)*size/10, stY + (y+0.2)*size/10);
                    ctx.lineTo(stX + (x+0.2)*size/10, stY + (y+0.8)*size/10);
                    ctx.stroke();
                }
            }
        }
    }
}

function draw_ships_count() {
    ctx.font = "12px Tahoma";
    ctx.textAlign = "right";
    let correct_ships = 0;
    for (let i = 0; i < 4; i++) {
        if (ships_count[i] < 4-i) {
            ctx.fillStyle = "#333333";
        } else if (ships_count[i] == 4-i) {
            correct_ships++;
            ctx.fillStyle = "#00FF00";
        } else {
            ctx.fillStyle = "#FF0000";
        }
        ctx.fillText(`${ships_count[i]}/${4-i} ships`, field_startX + field_size + 82, field_startY + field_size/2 + i*50-50);
        ctx.fillRect(field_startX + field_size + 82 -18*(i+1), field_startY + field_size/2 + i*50-30+18-50, 18*(i+1), -18/(4-i)*ships_count[i]);
        ctx.strokeStyle = "#000000";
        for (let j = 0; j < i+1; j++) {
            ctx.strokeRect(field_startX + field_size + 82 -18*j, field_startY + field_size/2 + i*50-30-50, -18, 18);
        }
    }
    if (correct_ships == 4 && errors == 0) {
        draw_button(field_startX + field_size + 70, field_startY + field_size - 15, "Start!", "#009900");
    }
}


function draw_alert() {
    ctx.font = "30px Tahoma";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    if (state == 3) {
        ctx.fillText(alert_text, field_startX + field_size + 25, field_startY - 30);
    } else if (code && state == 0) {
        ctx.font = "25px Tahoma";
        ctx.fillText("Your connection", field_startX + field_size/2, field_startY - 30);
        ctx.fillText(`code: ${code}`, field_startX + field_size/2, field_startY - 5);
        ctx.font = "15px Tahoma";
        ctx.fillText("(click to copy)", field_startX + field_size/2, field_startY + 15);
    } else ctx.fillText(alert_text, field_startX + field_size/2, field_startY - 30);
}

function draw_nick() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    if (state != 3) {
        ctx.font = "20px Tahoma";
        ctx.fillText(`You play against ${opp_nick}`, field_startX + field_size/2, field_startY + field_size + 30);
    } else {
        ctx.font = "30px Tahoma";
        ctx.fillText(nick, field_startX + field_size/2, field_startY + field_size + 30);
        ctx.fillText(opp_nick, active_startX + field_size/2, active_startY + field_size + 30);
    }
}


function draw_top(x,y) {
    if (players_top) {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000000";
        ctx.font = "25px Tahoma";
        ctx.fillText("Top players:", x,y);
        for (let i = 0; i < players_top.length; i++) {
            ctx.font = "15px Tahoma";
            ctx.fillStyle = "#F00";
            ctx.fillText(players_top[i][2], x,y+30+20*i);
            let offset = Math.floor(players_top[i][2]/10)*7;
            ctx.fillStyle = "#0F0";
            ctx.fillText(players_top[i][1], x-13-offset,y+30+20*i);
            offset += Math.floor(players_top[i][1]/10)*7;
            ctx.fillStyle = "#000";
            ctx.fillText(players_top[i][0], x-30-offset,y+30+20*i);
        }
    }
}


function draw_button(bt_X, bt_Y, text, color) {
ctx.font = "20px Tahoma";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeRect(bt_X-60, bt_Y-15, 120, 30);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(bt_X-60, bt_Y-15, 120, 30);
    ctx.globalAlpha = 1.0;
    ctx.fillText(text, bt_X, bt_Y);
}

socket.onopen = function() {
    console.log("Connected.");
    token = localStorage.getItem('skrepka.battleships.token.login');
    if (token) {
        socket.send(JSON.stringify({type: "authorization", method: "token", token: token}));
    } else {
        blocks[0].classList.remove("hide");
        alert_text = "";
        state = -2;
    }
};

socket.onclose = function(event) {
if (event.wasClean) {
    console.log('Close connection');
    } else {
    console.log('Connection fail');
    alert_text = "Fail to connect to server";
    redraw();
    }
console.log('Code: ' + event.code + ' reason: ' + event.reason);
    };

socket.onerror = function(error) {
    console.log("Error " + error.message);
  };