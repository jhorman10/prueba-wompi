import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Backdrop } from '../src/components/Backdrop';

describe('Backdrop', () => {
  it('renders children and title when visible', () => {
    const { getByText } = render(
      <Backdrop visible onClose={jest.fn()} title="Enter card">
        <Text>Card form</Text>
      </Backdrop>,
    );
    expect(getByText('Card form')).toBeTruthy();
    expect(getByText('Enter card')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText, queryByTestId } = render(
      <Backdrop visible={false} onClose={jest.fn()} title="Enter card">
        <Text>Card form</Text>
      </Backdrop>,
    );
    expect(queryByText('Card form')).toBeNull();
    expect(queryByTestId('backdrop-scrim')).toBeNull();
    expect(queryByTestId('backdrop-close')).toBeNull();
  });

  it('calls onClose when the scrim is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <Backdrop visible onClose={onClose}>
        <Text>Body</Text>
      </Backdrop>,
    );
    fireEvent.press(getByTestId('backdrop-scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <Backdrop visible onClose={onClose}>
        <Text>Body</Text>
      </Backdrop>,
    );
    fireEvent.press(getByTestId('backdrop-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders without a title', () => {
    const { getByTestId, queryByText } = render(
      <Backdrop visible onClose={jest.fn()}>
        <Text>Body</Text>
      </Backdrop>,
    );
    expect(getByTestId('backdrop-close')).toBeTruthy();
    expect(queryByText('Enter card')).toBeNull();
  });
});
