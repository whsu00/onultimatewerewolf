import React from 'react';
import ReactDOM from 'react-dom';
import { withTracker } from 'meteor/react-meteor-data';
import { GamesCollection } from '../api/games';
import GameCard from './GameCard.jsx';

const defaultRoles = [
  "Werewolf", 
  "Werewolf", 
  "Minion", 
  "Seer", 
  "Robber", 
  "Troublemaker", 
  "Drunk", 
  "Insomniac", 
  "Villager", 
  "Villager", 
  "Villager", 
  "Mason", 
  "Mason", 
  "Hunter", 
  "Tanner", 
  "Doppelganger"
];

const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function getRandomInt(min, max) {
  return Math.floor(min + Math.random() * Math.floor(max - min));
}

function newGame() {
  let room = "";
  for (let i = 0; i < 5; i++) {
    room += alpha[getRandomInt(0, alpha.length)];
  }
  GamesCollection.insert({
    room: room,
    playerCount: 0,
    players: [],
    roles: defaultRoles.map(role => ({value: role, selected: false}))
  });
  return room;
}

function assert(x) {
  if (x != true) {
    console.error("assertion failed");
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    /*
    const tags = [
      {value: "tag 1"},
      {value: "tag 2"},
      {value: "tag 3"},
      {value: "tag 4"},
      {value: "static 1", toggleable: false},
      {value: "static 2", toggleable: false},
      {value: "disabled", disabled: true},
    ];
    */
    // this.props.games
    this.cache = null;
    this.gameId = null;
    this.state = {
      status: 0,
      name: "",
      room: "",
      cardTitle: "Create or Join a Room",
      cardButton: "Play",
      cardButtonDisabled: true
    };
    this.onChange = this.onChange.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onViewAction = this.onViewAction.bind(this);
  }

  onChange(id, value) {
    if (id === "name") {
      this.setState({ name: value.trim(), cardButtonDisabled: value.trim() === "" });
    }
    if (id === "room") {
      this.setState({ room: value.trim().toUpperCase() });
    }
  }

  onClick() {
    if (this.state.status === 0) {
      this.setState(state => {
        let room = state.room;
        if (state.room === "") {
          room = newGame();
        }
        return {
          status: 1,
          room: room,
          cardTitle: "Room " + room,
          cardButton: "Next"
        };
      }, () => {
        this.gameId = GamesCollection.findOne({ room: this.state.room })._id;
        GamesCollection.update(
          { _id: this.gameId },
          {
            $inc: { playerCount: 1 },
            $push: { players: this.state.name }
          }
        );
      });
      // propagate to db
    }
  }

  onViewAction(data) {
    // save to local App cache, do not modify view
    this.cache = data;
  }

  getViewData() {
    let data = {
      players: []
    };
    if (this.state.status === 1) {
      data.players = GamesCollection.findOne({ room: this.state.room }).players.map(name => ({ value: name, toggleable: false }));
    }
    return data;
  }

  render() {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-6">
        <h1 className="font-light text-2xl mb-2">One Night Ultimate Werewolf</h1>
        <GameCard
          status={this.state.status}
          name={this.state.name}
          room={this.state.room}
          cardTitle={this.state.cardTitle} 
          cardButton={this.state.cardButton} 
          cardButtonDisabled={this.state.cardButtonDisabled} 
          onClick={this.onClick}
          onChange={this.onChange}
          viewData={this.getViewData()}
          onViewAction={this.onViewAction} />
      </div>
    );
  }
}

export default withTracker(() => {
  return {
    games: GamesCollection.find({}).fetch(),
  };
})(App);
