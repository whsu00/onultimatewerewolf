import React from 'react';

export default class Button extends React.Component {
  static defaultProps = {value: "", disabled: false, onClick: () => {}};

  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    if (!this.props.disabled) {
      this.props.onClick();
    }
  }

  render() {
    return (
        <button className={
            this.props.disabled
            ? "inline-block bg-gray-300 text-gray-600 font-semibold px-4 py-2 rounded transition duration-300 opacity-75 cursor-not-allowed"
            : "inline-block bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 rounded transition duration-300"
        } onClick={this.handleClick}>{this.props.value}</button>
    );
  }
}