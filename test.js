
var lock = {
  value: -1,
  verify: (val) => {
    return val == value;
  },
  set: (val) => {
    value = val;
    return true;
  }
};

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

var roles = ["Werewolf", "Werewolf", "Minion", "Seer", "Robber", "Troublemaker", "Drunk", "Insomniac", "Villager", "Villager", "Villager", "Mason", "Mason", "Hunter", "Tanner", "Doppelganger"];

var game = {
  "stage": -1,
  "players": [],
  "roles": [],
};

lock.set(10);

var onConnection = function(socket) {
  // ========== INIT ==========
  socket.on("init:request", (name, group) => {
    //
    socket.emit("init:request-ok", true, id, code, players);
  });

}






// ========== WAITING ==========
socket.on("waiting:next", (id) => {});
$(".Next").click((e) => {
  if (lock.verify(12)) {
    lock.set(13);
    //EVENT FIRE "waiting:next"
    socket.emit("waiting:next", myId);
  }
});
$(".Quit").click((e) => {
  //EVENT FIRE "waiting:quit"
  socket.emit("waiting:quit", myId);
  $("#Waiting").slideUp();
  $("#Init").slideDown();
});
"waiting:update"; (ok, players) => {
  if (ok) {
    //UI UPDATE FOR WAITING
    $(".PlayerList").html("");
    players.forEach((player) => {
      $(".PlayerList").append("<li class=\"list-group-item d-flex justify-content-between align-items-center\"><span>" + player.name + "</span><a href=\"#\" class=\"text-muted no-u x\"></a></li>");
    });
    $(".Number").html(players.length);
  }
}
"waiting:next-ok"; (ok) => {
  if (ok) {
    lock.set(14);

    //UI SETUP FOR SELECTING
    $(".Role").removeClass("badge-primary").addClass("badge-secondary");

    $("#Waiting").slideUp();
    $("#Selecting").slideDown();
  }
  else {
    lock.set(12);
    //SHOULD NOT FAIL
  }
}

// ========== SELECTING ==========
$(".Role").click((e) => {
  if (lock.verify(14)) {
    //EVENT FIRE "selecting:select"
    socket.emit("selecting:select", myId, $(this).attr("id"));
  }
});
$(".Start").click((e) => {
  if (lock.verify(14)) {
    lock.set(15);
    //EVENT FIRE "selecting:start"
    socket.emit("selecting:start", myId);
  }
});
$(".Exit").click((e) => {
  //EVENT FIRE "exit"
  socket.emit("exit", myId); //server should response with init:request-ok
});
"selecting:update"; (ok, roles) => {
  if (ok) {
    //UI UPDATE FOR SELECTING
    $(".Role").addClass("badge-secondary").removeClass("badge-primary");
    roles.forEach((id) => {
      $("#r" + id).addClass("badge-primary").removeClass("badge-secondary");
    });
  }
} 
"selecting:start-ok"; (ok, you, center, players) => {
  if (ok) {
    lock.set(16);

    //UI SETUP FOR NIGHT/TURN
    selection = [];
    $(".You").html(you);
    $(".CenterCards").html("");
    center.forEach((role) => {
      $(".CenterCards").append("<a href=\"#\" name=\"c" + ($(".CenterCards").children().length) + "\" class=\"badge badge-secondary m-1 p-1 Center\">Card " + ($(".CenterCards").children().length + 1) + "</a>");
    });
    $(".CenterCards .Center").click((e) => {
      if (selectionType == "Center" || selectionType == "Seer") {
        if ($(this).hasClass("badge-primary")) {
          selection = selection.splice(selection.indexOf($(this).attr("name")), 1);
          $(this).addClass("badge-secondary").removeClass("badge-primary");
        }
        else {
          if ((selectionType == "Center" && selection.length < selectionNum)
            || (selectionType == "Seer" && (selection.length == 0 || (selection.length == 1 && selection[0][0] == "c")))) {
            selection.push($(this).attr("name"));
            $(this).addClass("badge-primary").removeClass("badge-secondary");
          }
        }
      }
    });
    $(".PlayerCards").html("");
    players.forEach((player) => {
      $(".PlayerCards").append("<a href=\"#\" name=\"p" + player.id + "\" class=\"badge badge-secondary m-1 p-1 Player\">" + player.name + "</a>");
    });
    $(".PlayerCards .Player").click((e) => {
      if (selectionType == "Player" || selectionType == "Seer") {
        if ($(this).hasClass("badge-primary")) {
          selection = selection.splice(selection.indexOf($(this).attr("name")), 1);
          $(this).addClass("badge-secondary").removeClass("badge-primary");
        }
        else {
          if ((selectionType == "Player" && selection.length < selectionNum)
            || (selectionType == "Seer" && selection.length == 0)) {
            selection.push($(this).attr("name"));
            $(this).addClass("badge-primary").removeClass("badge-secondary");
          }
        }
      }
    });

    $("#Selecting").slideUp();
    $("#Night").slideDown();
  }
  else {
    lock.set(14);
    //TODO: FAIL
    alert("error: probably not enough roles");
  }
}

// ========== NIGHT ==========
"night:to-turn"; (ok, desc type, num) => {
  if (ok) {
    lock.set(18);

    //UI SETUP FOR TURN
    $(".Description").html(desc);
    //modify vars for CenterCards, PlayerCards that are already set up
    selectionType = type;
    selectionNum = num;

    $("#Night").slideUp();
    $("#Turn").slideDown();
  }
  else {
    lock.set(16);
    //SHOULD NOT FAIL
  }
}
"night:to-day"; (ok, roles, players) => {
  if (ok) {
    lock.set(20);

    //UI SETUP FOR DAY
    $(".DisplayRoles").html("");
    roles.forEach((role) => {
      $(".DisplayRoles").append("<a href=\"#\" class=\"badge badge-secondary m-1 p-1 DisplayRole\">" + role + "</a>");
    })
    $(".DisplayRoles .DisplayRole").click((e) => {
      if ($(this).hasClass("badge-secondary")) {
        $(this).addClass("badge-primary").removeClass("badge-secondary");
      }
      else {
        $(this).addClass("badge-secondary").removeClass("badge-primary");
      }
    });
    $(".DisplayPlayers").html("");
    players.forEach((player) => {
      $(".DisplayPlayers").append("<a href=\"#\" class=\"badge badge-secondary m-1 p-1 DisplayPlayer\">" + player.name + "</a>");
    });
    $(".DisplayPlayers .DisplayPlayer").click((e) => {
      if ($(this).hasClass("badge-secondary")) {
        $(this).addClass("badge-primary").removeClass("badge-secondary");
      }
      else {
        $(this).addClass("badge-secondary").removeClass("badge-primary");
      }
    });

    $("#Night").slideUp();
    $("#Day").slideDown();
  }
  else {
    lock.set(16);
    //SHOULD NOT FAIL
  }
}

// ========== TURN ==========
$(".EndTurn").click((e) => {
  if (lock.verify(18)) {
    lock.set(19);
    //EVENT FIRE "turn:action"
    socket.emit("turn:action", myId, selection);
  }
});
"turn:action-ok"; (ok, you) => {
  if (ok) {
    lock.set(16);

    //UI RESETUP FOR NIGHT
    $(".You").html(you);

    $("#Turn").slideUp();
    $("#Night").slideDown();
  }
  else {
    lock.set(18);
    alert("error: you're doing something wrong");
  }
}

// ========== DAY ==========
$(".VoteNow").click((e) => {
  if (lock.verify(20)) {
    lock.set(21);
    //EVENT FIRE "day:votenow"
    socket.emit("day:votenow", myId);
  }
});
"time"; (ok, time) => {
  if (ok) {
    //UI UPDATE FOR DAY & VOTING
    $(".Time").html(time);
  }
}
"day:votenow-ok"; (ok, players) => {
  if (ok) {
    lock.set(22);
    
    //UI SETUP FOR VOTING
    $(".VotingCards").html("");
    players.forEach((player) => {
      $(".VotingCards").append("<a href=\"#\" name=\"p" + player.id + "\" class=\"badge badge-secondary m-1 p-1 Player\">" + player.name + "</a>");
    });
    $(".VotingCards .Player").click((e) => {
      socket.emit("voting:vote", myId, $(this).attr("name"));
      $(this).addClass("badge-primary").removeClass("badge-secondary").siblings().addClass("badge-secondary").removeClass("badge-primary");
    });
    
    $("#Day").slideUp();
    $("#Voting").slideDown();
  }
  else {
    lock.set(20);
    //SHOULD NOT FAIL
  }
}

// ========== VOTING ==========
"voting:to-results"; (ok, outcome, execution, players) => {
  if (ok) {
    lock.set(24);
    
    //UI SETUP FOR RESULTS
    $(".Outcome").html(outcome);
    $(".Execution").html(execution);
    $(".Results").html("");
    players.forEach((player) => {
      var history = "";
      player.history.forEach((role) => {
        history += " &rarr; " + role;
      });
      history = history.substring(8);
      $(".Results").append("<li class=\"list-group-item d-flex\"><span>" + player.name + "</span><span>: " + history + "</span></li>");
    });

    $("#Voting").slideUp();
    $("#Results").slideDown();
  }
  else {
    lock.set(22);
    //SHOULD NOT FAIL
  }
}

// ========== RESULTS ==========
$(".PlayAgain").click((e) => {
  if (lock.verify(24)) {
    lock.set(12);
    //NO UI SETUP FOR WAITING NEEDED
    $("#Results").slideUp();
    $("#Waiting").slideDown();
  }