var app = require('express')();
var http = require('http').Server(app);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/design.html');
});

var io = require('socket.io')(http);

var games = {};
var sockets = {};

var roles = ["Werewolf", "Werewolf", "Minion", "Seer", "Robber", "Troublemaker", "Drunk", "Insomniac", "Villager", "Villager", "Villager", "Mason", "Mason", "Hunter", "Tanner", "Doppelganger"];

var order = ["Doppelganger", "Doppelganger-Seer", "Doppelganger-Robber", "Doppelganger-Troublemaker", "Doppelganger-Drunk", "Doppelganger-Minion", "Doppelganger-Werewolf", "Werewolf", "Minion", "Mason", "Seer", "Robber", "Troublemaker", "Drunk", "Insomniac", "Doppelganger-Insomniac"];
var descriptions = [
  "Doppelganger, wake up. You may look at another player's card and also gain that role.",
  "Doppelganger-Seer, wake up. You may look at another player's card or two of the center cards.",
  "Doppelganger-Robber, wake up. You may exchange your card with another player's card, and then view your new card.",
  "Doppelganger-Troublemaker, wake up. You may exchange cards between two other players.",
  "Doppelganger-Drunk, wake up. Exchange your card with a card from the center.",
  "Doppelganger-Minion, wake up. ",
  "Doppelganger-Werewolf, go back to sleep. You will wake up with the other werewolves.",
  "Werewolves, wake up. ",
  "Minion, wake up. ",
  "Masons, wake up. ",
  "Seer, wake up. You may look at another player's card or two of the center cards.",
  "Robber, wake up. You may exchange your card with another player's card, and then view your new card.",
  "Troublemaker, wake up. You may exchange cards between two other players.",
  "Drunk, wake up. Exchange your card with a card from the center.",
  "Insomniac, wake up. ",
  "Doppelganger-Insomniac, wake up. "
];

var timer = 0;

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

function sanitize(str) {
  if (str.indexOf("Doppelganger-") != -1)
    return "Doppelganger";
  return str;
}

function secFormat(totSec) {
  var min = Math.floor(totSec/60);
  var sec = totSec % 60;
  if (sec < 10) {
    sec = "0" + sec;
  }
  return min + ":" + sec;
}

/*
game {
  state : int
  players[] : player
  roles[] : str
}

player {
  socket : socketid
  id : int
  name : str
  role : str
  history[] : str
}
*/

/* Lock values:
10 - On INIT
11 - Waiting for INIT RESPONSE/OK
12 - On WAITING
13 - Waiting for WAITING RESPONSE/OK
14 - On SELECTING
15 - Waiting for SELECTING RESPONSE/OK
16 - On NIGHT
17 - N/A
18 - On TURN
19 - Waiting for TURN RESPONSE/OK
20 - On DAY
21 - Waiting for DAY (VOTECLICK) RESPONSE/OK
22 - On VOTING
23 - N/A
24 - On RESULTS
*/

io.on("connection", (socket) => {
  console.log(socket.id + " connected");
  sockets[socket.id] = socket;
  // console.log(socket);
  socket.on("disconnect", () => {
    console.log(socket.id + " disconnected");
    Object.keys(games).forEach((code) => {
      for (var i = 0; i < games[code].players.length; i++) {
        if (games[code].players[i].id == socket.id) {
          //TODO: ERROR HANDLING
          console.log("\t" + socket.id + " removed from game " + code);
          games[code].players.splice(i, 1);
          i--;

          games[code].state = 12;
          games[code].roles = [];
          games[code].players.forEach((player) => {
            player.role = "";
            player.history = [];
            player.turn = false;
            player.vote = "";
            sockets[player.id].emit("init:request-ok", true, player.id, code, games[code].players);
          });
        }
      }
    });
  });

  socket.on("init:request", (name, group) => {
    console.log("init:request by " + name + " to join " + group);
    if (!group) {
      do {
        group = Math.floor(Math.random()*8999+1000);
      }
      while (games[group]);
      games[group] = {
        "state": -1,
        "roleTurn": -1,
        "time": 0,
        "players": [],
        "roles": []
      };
      console.log("\tcreated group " + group);
    }
    if (!games[group]) {
      //TODO: ERROR HANDLING
      console.error("\tcould not find group " + group);
      socket.emit("init:request-ok", false, null, null, null, null);
      return false;
    }
    if (games[group].state > 12) {
      console.error("\tgame in progress " + group);
      socket.emit("init:request-ok", false, null, null, null, null);
      return false;
    }
    var tempFix = false;
    games[group].players.forEach((player) => {
      if (player.name == name) {
        //ERROR HANDLING
        console.error("\tname already taken");
        socket.emit("init:request-ok", false, null, null, null, null);
        tempFix = true;
        return false;
      }
    });
    if (tempFix) return false;
    games[group].players.push({
      "id": socket.id, //maybe shouldn't use this but oh well
      "name": name,
      "role": "",
      "history": [],
      "turn": false,
      "vote": ""
    });
    console.log("\tadded player " + name + " to " + group);
    games[group].state = 12;
    socket.emit("init:request-ok", true, socket.id, group, games[group].players);
    games[group].players.forEach((player) => {
      sockets[player.id].emit("waiting:update", true, games[group].players);
    });
  });

  socket.on("waiting:quit", (sid, code) => {
    console.log("waiting:quit by " + sid + " in " + code);
    if (games[code].state == 12) {
      for (var i = 0; i < games[code].players.length; i++) {
        if (games[code].players[i].id == sid) {
          //TODO: ERROR HANDLING
          console.log("\t" + sid + " quit game " + code);
          games[code].players.splice(i, 1);
          i--;
          games[code].players.forEach((player) => {
            sockets[player.id].emit("waiting:update", true, games[code].players);
          });
        }
      }
    }
  });

  socket.on("waiting:next", (sid, code) => {
    console.log("waiting:next by " + sid + " in " + code);
    if (games[code].state == 12) {
      games[code].state = 14;
      games[code].players.forEach((player) => {
        sockets[player.id].emit("waiting:next-ok", true);
      });
    }
  });

  socket.on("exit", (sid, code) => {
    console.log("exit by " + sid + " in " + code);
    games[code].state = 12;
    games[code].roles = [];
    games[code].players.forEach((player) => {
      player.role = "";
      player.history = [];
      player.turn = false;
      player.vote = "";
    });
    games[code].players.forEach((player) => {
      sockets[player.id].emit("init:request-ok", true, player.id, code, games[code].players);
    });
  });

  socket.on("selecting:select", (sid, code, select) => {
    console.log("selecting:select of " + select + " by " + sid + " in " + code);
    if (games[code].state == 14) {
      if (games[code].roles.indexOf(select) != -1)
        games[code].roles.splice(games[code].roles.indexOf(select), 1);
      else
        games[code].roles.push(select);

      games[code].players.forEach((player) => {
        sockets[player.id].emit("selecting:update", true, games[code].roles);
      });
    }
  });

  socket.on("selecting:start", (sid, code) => {
    console.log("selecting:start by " + sid + " in " + code);
    if (games[code].state == 14) {
      if (games[code].roles.length < games[code].players.length + 3) {
        //TODO: ERROR HANDLING
        sockets[sid].emit("selecting:start-ok", false, null, null, null);
        return false;
      }
      games[code].state = 16;

      for (var i = 0; i < games[code].roles.length; i++) {
        games[code].roles[i] = roles[Number(games[code].roles[i].substring(1))-1];
      }
      shuffle(games[code].roles);
      //TODO: COUNT WOLVES
      for (var i = 0; i < games[code].players.length; i++) {
        games[code].players[i].role = games[code].roles[i];
        games[code].players[i].history.push(games[code].roles[i]);
      }
      games[code].players.forEach((player) => {
        sockets[player.id].emit("selecting:start-ok", true, player.history[0], games[code].roles.slice(games[code].players.length), games[code].players);
      });

      games[code].roleTurn = -1;
      preRoleTurn(code);
    }
  });

  function preRoleTurn(code) {
    console.log("preRoleTurn on " + code);
    
    var rolesInPlay = games[code].roles.slice(0,games[code].players.length);
    games[code].players.forEach((player) => {
      if (rolesInPlay.indexOf("Doppelganger") != -1 && player.history[0] == "Doppelganger" && player.history.length > 1) {
        rolesInPlay[rolesInPlay.indexOf("Doppelganger")] = player.history[1]; //TODO: THIS BREAKS THINGS
      }
    });

    do {
      games[code].roleTurn++;
      if (games[code].roleTurn == 16) {
        games[code].players.forEach((player) => {
          //player turn should be false
          sockets[player.id].emit("night:to-day", true, games[code].roles, games[code].players);
        });
        games[code].time = Date.now();
        games[code].state = 20;
        break;
      }
    }
    while (rolesInPlay.indexOf(order[games[code].roleTurn]) == -1);

    console.log("\trole " + games[code].roleTurn + ": " + order[games[code].roleTurn]);
    
    switch (games[code].roleTurn) {
      case 0: //Doppelganger
        games[code].players.forEach((player) => {
          if (player.history[0] == "Doppelganger") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[0], "Player", 1);
          }
        });
        break;
      case 1: //Doppelganger-Seer
        games[code].players.forEach((player) => {
          if (player.history[1] == "Doppelganger-Seer") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[1], "Seer", -1);
          }
        });
        break;
      case 2: //Doppelganger-Robber
        games[code].players.forEach((player) => {
          if (player.history[1] == "Doppelganger-Robber") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[2], "Player", 1);
          }
        });
        break;
      case 3: //Doppelganger-Troublemaker
        games[code].players.forEach((player) => {
          if (player.history[1] == "Doppelganger-Troublemaker") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[3], "Player", 2);
          }
        });
        break;
      case 4: //Doppelganger-Drunk
        games[code].players.forEach((player) => {
          if (player.history[1] == "Doppelganger-Drunk") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[4], "Center", 1);
          }
        });
        break;
      case 5: //Doppelganger-Minion
        var arr = [];
        var names = "";
        games[code].players.forEach((player) => {
          if (player.role == "Werewolf" || player.role == "Doppelganger-Werewolf") {
            arr.push(player);
            names += ", " + player.name;
          }
        });

        games[code].players.forEach((player) => {
          if (player.history[1] == "Doppelganger-Minion") {
            player.turn = true;
            if (arr.length == 0) {
              sockets[player.id].emit("night:to-turn", true, descriptions[5] + "There are no werewolves. This should not happen.", "N/A", 0);
            }
            else if (arr.length == 1) {
              sockets[player.id].emit("night:to-turn", true, descriptions[5] + "There is one werewolf: " + names.substring(2) + ".", "N/A", 0);
            }
            else {
              sockets[player.id].emit("night:to-turn", true, descriptions[5] + "There are " + arr.length + " werewolves: " + names.substring(2) + ".", "N/A", 0);
            }
          }
        });
        break;
      case 6: //Doppelganger-Werewolf
        games[code].players.forEach((player) => {
          if (player.history[1] == "Doppelganger-Werewolf") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[6], "N/A", 0);
          }
        });
        break;
      case 7: //Werewolf
        var arr = [];
        var names = "";
        games[code].players.forEach((player) => {
          if (player.role == "Werewolf" || player.role == "Doppelganger-Werewolf") {
            arr.push(player);
            names += ", " + player.name;
          }
        });

        games[code].players.forEach((player) => {
          if (player.history[0] == "Werewolf" || player.history[1] == "Doppelganger-Werewolf") {
            player.turn = true;
            if (arr.length == 1) {
              sockets[player.id].emit("night:to-turn", true, descriptions[7] + "You are the lone wolf. You may look at a card from the center.", "Center", 1);
            }
            else {
              sockets[player.id].emit("night:to-turn", true, descriptions[7] + "There are " + arr.length + " werewolves: " + names.substring(2) + ".", "N/A", 0);
            }
          }
        });
        break;
      case 8: //Minion
        var arr = [];
        var names = "";
        games[code].players.forEach((player) => {
          if (player.role == "Werewolf" || player.role == "Doppelganger-Werewolf") {
            arr.push(player);
            names += ", " + player.name;
          }
        });

        games[code].players.forEach((player) => {
          if (player.history[0] == "Minion") {
            player.turn = true;
            if (arr.length == 0) {
              sockets[player.id].emit("night:to-turn", true, descriptions[8] + "There are no werewolves. This should not happen.", "N/A", 0);
            }
            else if (arr.length == 1) {
              sockets[player.id].emit("night:to-turn", true, descriptions[8] + "There is one werewolf: " + names.substring(2) + ".", "N/A", 0);
            }
            else {
              sockets[player.id].emit("night:to-turn", true, descriptions[8] + "There are " + arr.length + " werewolves: " + names.substring(2) + ".", "N/A", 0);
            }
          }
        });
        break;
      case 9: //Mason
        var arr = [];
        var names = "";
        games[code].players.forEach((player) => {
          if (player.role == "Mason" || player.role == "Doppelganger-Mason") {
            arr.push(player);
            names += ", " + player.name;
          }
        });

        games[code].players.forEach((player) => {
          if (player.history[0] == "Mason" || player.history[1] == "Doppelganger-Mason") {
            player.turn = true;
            if (arr.length == 1) {
              sockets[player.id].emit("night:to-turn", true, descriptions[9] + "You are the lone mason.", "N/A", 0);
            }
            else {
              sockets[player.id].emit("night:to-turn", true, descriptions[9] + "There are " + arr.length + " masons: " + names.substring(2) + ".", "N/A", 0);
            }
          }
        });
        break;
      case 10: //Seer
        games[code].players.forEach((player) => {
          if (player.history[0] == "Seer") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[10], "Seer", -1);
          }
        });
        break;
      case 11: //Robber
        games[code].players.forEach((player) => {
          if (player.history[0] == "Robber") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[11], "Player", 1);
          }
        });
        break;
      case 12: //Troublemaker
        games[code].players.forEach((player) => {
          if (player.history[0] == "Troublemaker") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[12], "Player", 2);
          }
        });
        break;
      case 13: //Drunk
        games[code].players.forEach((player) => {
          if (player.history[0] == "Drunk") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[13], "Center", 1);
          }
        });
        break;
      case 14: //Insomniac
        games[code].players.forEach((player) => {
          if (player.history[0] == "Insomniac") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[14] + "Your role now is " + sanitize(player.role) + ".", "N/A", 0);
          }
        });
        break;
      case 15: //Doppelganger-Insomniac
        games[code].players.forEach((player) => {
          if (player.history[1] == "Doppelganger-Insomniac") {
            player.turn = true;
            sockets[player.id].emit("night:to-turn", true, descriptions[15] + "Your role now is " + player.role + ".", "N/A", 0);
          }
        });
        break;
    }
  }

  socket.on("turn:action", (sid, code, selection) => {
    console.log("turn:action " + selection + " by " + sid + " in " + code);
    //assuming selection matches TODO ERROR CHECKING i did a little on client side
    if (games[code].state == 16) {
      switch (games[code].roleTurn) {
        case 0: //Doppelganger
          games[code].players.forEach((player) => {
            if (player.id == sid) {
              if (selection.length == 1) {
                player.turn = false;
                var choice = "";
                for (var i = 0; i < games[code].players.length; i++) {
                  if (games[code].players[i].id == selection[0]) {
                    choice = games[code].players[i];
                  }
                }
                player.role = "Doppelganger-" + choice.role;
                player.history.push("Doppelganger-" + choice.role);

                player.turn = true;
                sockets[player.id].emit("turn:action-ok", true, player.role);
                sockets[player.id].emit("night:to-turn", true, "You selected " + choice.name + ". Your role now is " + player.role + ".", "N/A", 0);
              }
              else if (selection.length == 0) {
                player.turn = false;
                sockets[player.id].emit("turn:action-ok", true, player.role);
              }
            }
          });
          break;
        case 1: //Doppelganger-Seer
        case 10: //Seer
          games[code].players.forEach((player) => {
            if (player.id == sid) {
              if (selection.length == 1) {
                player.turn = false;
                var choice = "";
                for (var i = 0; i < games[code].players.length; i++) {
                  if (games[code].players[i].id == selection[0]) {
                    choice = games[code].players[i];
                  }
                }

                player.turn = true;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
                sockets[player.id].emit("night:to-turn", true, choice.name + " is " + sanitize(choice.role) + ".", "N/A", 0);
              }
              else if (selection.length == 2) {
                player.turn = false;
                var choices = "";
                for (var i = 0; i < selection.length; i++) {
                  var n = Number(selection[i]);
                  choices += "Card " + (n+1) + " is " + sanitize(games[code].roles[games[code].players.length + n]) + ". ";
                }
                player.turn = true;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
                sockets[player.id].emit("night:to-turn", true, choices, "N/A", 0);
              }
              else if (selection.length == 0) {
                player.turn = false;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
              }
            }
          });
          break;
        case 2: //Doppelganger-Robber
        case 11: //Robber
          games[code].players.forEach((player) => {
            if (player.id == sid) {
              if (selection.length == 1) {
                player.turn = false;
                var choice = -1;
                for (var i = 0; i < games[code].players.length; i++) {
                  if (games[code].players[i].id == selection[0]) {
                    choice = i;
                  }
                }
                var temp = player.role;
                player.role = games[code].players[choice].role;
                player.history.push(games[code].players[choice].role);
                games[code].players[choice].role = temp;
                games[code].players[choice].history.push(temp);

                player.turn = true;
                sockets[player.id].emit("turn:action-ok", true, sanitize(player.role));
                sockets[player.id].emit("night:to-turn", true, "You swapped with " + games[code].players[choice].name + ", and your role now is " + sanitize(player.role) + ".", "N/A", 0);
              }
              else if (selection.length == 0) {
                player.turn = false;
                sockets[player.id].emit("turn:action-ok", true, player.role);
              }
            }
          });
          break;
          break;
        case 3: //Doppelganger-Troublemaker
        case 12: //Troublemaker
          games[code].players.forEach((player) => {
            if (player.id == sid) {
              if (selection.length == 2) {
                player.turn = false;
                var choices = [];
                selection.forEach((s) => {
                  for (var i = 0; i < games[code].players.length; i++) {
                    if (games[code].players[i].id == s) {
                      choices.push(i);
                    }
                  }
                });

                var temp = games[code].players[choices[0]].role;
                games[code].players[choices[0]].role = games[code].players[choices[1]].role;
                games[code].players[choices[0]].history.push(games[code].players[choices[1]].role);
                games[code].players[choices[1]].role = temp;
                games[code].players[choices[1]].history.push(temp);

                player.turn = true;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
                sockets[player.id].emit("night:to-turn", true, "You swapped " + games[code].players[choices[0]].name + " and " + games[code].players[choices[1]].name + ".", "N/A", 0);
              }
              else if (selection.length == 0) {
                player.turn = false;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
              }
            }
          });
          break;
        case 4: //Doppelganger-Drunk
        case 13: //Drunk
          games[code].players.forEach((player) => {
            if (player.id == sid) {
              if (selection.length == 1) {
                player.turn = false;
                var choice = Number(selection[0]);
                var temp = player.role;
                player.role = games[code].roles[games[code].players.length + choice];
                player.history.push(games[code].roles[games[code].players.length + choice]);
                games[code].roles[games[code].players.length + choice] = temp;
                
                player.turn = true;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
                sockets[player.id].emit("night:to-turn", true, "You swapped with Card " + (choice+1) + ".", "N/A", 0);
              }
              else if (selection.length == 0) {
                player.turn = false;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
              }
            }
          });
          break;
        case 5: //Doppelganger-Minion
        case 6: //Doppelganger-Werewolf
        case 8: //Minion
        case 9: //Mason
        case 14: //Insomniac
        case 15: //Doppelganger-Insomniac
          games[code].players.forEach((player) => {
            if (player.id == sid) {
              player.turn = false;
              sockets[player.id].emit("turn:action-ok", true, player.history[0]);
            }
          });
          break;
        case 7: //Werewolf
          games[code].players.forEach((player) => {
            // console.log(player);
            if (player.id == sid) {
              if (selection.length == 1) {
                player.turn = false;
                var choice = Number(selection[0]);
                
                player.turn = true;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
                sockets[player.id].emit("night:to-turn", true, "Card " + (choice+1) + " is " + sanitize(games[code].roles[games[code].players.length + choice]) + ".", "N/A", 0);
              }
              else if (selection.length == 0) {
                player.turn = false;
                sockets[player.id].emit("turn:action-ok", true, player.history[0]);
              }
            }
          });
          break;
      }
      var canProceed = true;
      games[code].players.forEach((player) => { if (player.turn) { canProceed = false; } });
      if (!canProceed) {
        console.log("\tstill waiting");
        //console.log(canProceed, games[code]);
      }
      if (canProceed) preRoleTurn(code);
    }
  });

  socket.on("day:votenow", (sid, code) => {
    console.log("day:votenow by " + sid + " in " + code);
    if (games[code].state == 20) {
      games[code].state = 22;
      games[code].time = Date.now();
      games[code].players.forEach((player) => {
        sockets[player.id].emit("day:votenow-ok", true, games[code].players);
      });
    }
  });

  socket.on("voting:vote", (sid, code, vote) => {
    console.log("voting:vote for " + vote + " by " + sid + " in " + code);
    if (games[code].state == 22) {
      games[code].players.forEach((player) => {
        if (player.id == sid) {
          player.vote = vote;
        }
      });
    }
  });

  timer = setInterval(() => {
    Object.keys(games).forEach((code) => {
      var elapsed = Math.floor((Date.now() - games[code].time)/1000);
      if (games[code].state == 20) {
        var secLeft = 300 - elapsed;
        games[code].players.forEach((player) => {
          sockets[player.id].emit("time", true, secFormat(secLeft));
        });
        if (secLeft < 0) {
          games[code].state = 22;
          games[code].time = Date.now();
          games[code].players.forEach((player) => {
            sockets[player.id].emit("day:votenow-ok", true, games[code].players);
          });
        }
      }
      if (games[code].state == 22) {
        var secLeft = 10 - elapsed;
        games[code].players.forEach((player) => {
          sockets[player.id].emit("time", true, secFormat(secLeft));
        });
        if (secLeft < 0) {
          
          //Final Calculations
          var outcome = "Werewolves win!";
          var count = {};
          var executed = [];
          var executedText = "";
          var max = -1;
          games[code].players.forEach((player) => {
            if (player.vote) {
              count[player.vote] = count[player.vote] ? count[player.vote]+1 : 1;
            }
          });
          Object.keys(count).forEach((pid) => {
            if (count[pid] > max)
              max = count[pid];
          });
          if (max == 1) {
            executedText = "None";
          }
          else {
            Object.keys(count).forEach((pid) => {
              if (count[pid] == max)
                executed.push(pid);
            });
            executed.forEach((pid) => {
              games[code].players.forEach((player) => {
                if (player.id == pid) {
                  if (player.history[0] == "Hunter" || player.history[1] == "Doppelganger-Hunter") {
                    if (executed.indexOf(player.vote) == -1) {
                      executed.push(player.vote);
                    }
                  }
                }
              });
            });
            executed.forEach((pid) => {
              games[code].players.forEach((player) => {
                if (player.id == pid) {
                  if (player.role == "Werewolf" || player.role == "Doppelganger-Werewolf") {
                    outcome = "Villagers wins!";
                  }
                }
              });
            });
            executed.forEach((pid) => {
              games[code].players.forEach((player) => {
                if (player.id == pid) {
                  if (player.role == "Tanner" || player.role == "Doppelganger-Tanner") {
                    outcome = "Tanner wins!";
                  }
                }
              });
            });
            executed.forEach((pid) => {
              games[code].players.forEach((player) => {
                if (player.id == pid) {
                  executedText += ", " + player.name + " (" + player.role + ")";
                }
              });
            });
            executedText = executedText.substring(2);
          }

          games[code].players.forEach((player) => {
            sockets[player.id].emit("voting:to-results", true, outcome, executedText, games[code].players);
          });

          games[code].state = 12;
          games[code].roles = [];
          games[code].players.forEach((player) => {
            player.role = "";
            player.history = [];
            player.turn = false;
            player.vote = "";
          });
        }
      }
    });
  }, 1000);

});

http.listen(process.env.PORT || 5000, function(){
  console.log('server up');
});