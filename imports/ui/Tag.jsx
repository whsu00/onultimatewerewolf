import React from 'react';

export default class Tag extends React.Component {
  static defaultProps = {key: -1, value: "", toggleable: true, selected: false, disabled: false};

  constructor(props) {
    super(props);
    this.state = {selected: this.props.selected};
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    if (!this.props.disabled) {
      this.setState(state => ({
        selected: !state.selected
      }));
      this.props.onToggle(this.props.id);
    }
  }

  render() {
    if (!this.props.toggleable) {
      return (
        <span className="inline-block text-center w-1/2 -mx-1 bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 mb-1 transition duration-300">
          {this.props.value}
        </span>
      );
    } else {
      return (
        <span className={
          this.props.disabled
          ? "inline-block text-center w-1/2 -mx-1 bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-500 mb-1 transition duration-300 cursor-not-allowed opacity-75"
          : this.state.selected
          ? "inline-block text-center w-1/2 -mx-1 bg-gray-700 rounded-full px-3 py-1 text-xs font-semibold text-gray-200 mb-1 transition duration-300 cursor-pointer hover:opacity-75"
          : "inline-block text-center w-1/2 -mx-1 bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 mb-1 transition duration-300 cursor-pointer hover:opacity-75"
          } onClick={this.handleClick}>
            {this.props.value}
        </span>
      );
    }
  }
}