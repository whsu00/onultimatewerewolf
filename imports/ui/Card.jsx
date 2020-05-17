import React from 'react';

export default class Card extends React.Component {
  constructor(props) {
    super(props);
    this.state = {title: props.title, body: props.body, footer: props.footer};
  }

  render() {
    return (
      <div className="max-w-sm w-full rounded overflow-hidden bg-white shadow-lg my-2">
        <div className="px-6 py-4 font-bold text-lg h-16 mb-2 text-center">
          {this.state.title}
        </div>
        <div className="px-6 text-sm h-64 text-gray-700">
          {this.state.body}
        </div>
        <div className="px-6 py-4 text-base h-16 mt-2 text-center">
          {this.state.footer}
        </div>
      </div>
    );
  }
}