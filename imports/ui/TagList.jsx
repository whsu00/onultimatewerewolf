import React from 'react';
import Tag from './Tag.jsx';

export default class TagList extends React.Component {
  constructor(props) {
    super(props);
    this.selected = this.props.tags.filter(tag => tag.selected).map(tag => tag.id);
    this.onToggle = this.onToggle.bind(this);
  }

  onToggle(id) {
    const i = this.selected.indexOf(id);
    console.log(i);
    if (i == -1) {
      this.selected.push(id);
    } else {
      this.selected.splice(i, 1);
    }
    this.props.onChange(this.selected);
  }

  render() {
    return (
      <div className="flex justify-between flex-wrap">
          {this.props.tags.map((tag) => (
              <Tag id={tag._id} key={tag._id} value={tag.value} toggleable={tag.toggleable} selected={tag.selected} disabled={tag.disabled} onToggle={this.onToggle} />
          ))}
      </div>
    );
  }
}