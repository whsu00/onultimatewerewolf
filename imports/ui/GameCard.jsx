import React from 'react';
import Form from './Form.jsx';
import Button from './Button.jsx';
import TagList from './TagList.jsx';

export default class GameCard extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const gameUI = [
      (
        <Form name={this.props.name} room={this.props.room} onChange={this.props.onChange} />
      ),
      (
        <TagList tags={this.props.viewData.players} onChange={this.props.onViewAction}/>
      )
    ];
    const body = gameUI[this.props.status];
    return (
      <div className="max-w-sm w-full rounded overflow-hidden bg-white shadow-lg my-2">
        <div className="px-6 py-4 font-bold text-lg h-16 mb-2 text-center">
          {this.props.cardTitle}
        </div>
        <div className="px-6 text-sm h-64 text-gray-700">
          {body}
        </div>
        <div className="px-6 py-4 text-base h-16 mt-2 text-center">
          <Button value={this.props.cardButton} disabled={this.props.cardButtonDisabled} onClick={this.props.onClick} />
        </div>
      </div>
    );
  }
}