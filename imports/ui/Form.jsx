import React from 'react';

export default class Form extends React.Component {
  constructor(props) {
    super(props);
    
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.props.onChange(e.target.id, e.target.value);
  }

  render() {
    return (
      <form>
        <label className="block text-gray-700 text-sm font-bold my-2" htmlFor="name">
          Name
        </label>
        <input className="shadow appearance-none border rounded w-full mb-2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="name" type="text" placeholder="Name" value={this.props.name} onChange={this.handleChange} autoComplete="off" />
        <label className="block text-gray-700 text-sm font-bold my-2" htmlFor="room">
          Room
        </label>
        <input className="shadow appearance-none border rounded w-full mb-2 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="room" type="text" placeholder="Room" value={this.props.room} onChange={this.handleChange} autoComplete="off" />
        <p className="text-xs mt-2">Leave "Room" blank to create a room.</p>
      </form>
    );
  }
}