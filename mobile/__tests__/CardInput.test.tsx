import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CardInput } from '../src/components/CardInput';

describe('CardInput', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    placeholder: 'Card number',
    label: 'Card Number',
    error: undefined as string | undefined,
  };

  it('renders label and input field', () => {
    const { getByText, getByPlaceholderText } = render(
      <CardInput {...defaultProps} />,
    );
    expect(getByText('Card Number')).toBeTruthy();
    expect(getByPlaceholderText('Card number')).toBeTruthy();
  });

  it('displays error message when provided', () => {
    const { getByText } = render(
      <CardInput {...defaultProps} error="Invalid card" />,
    );
    expect(getByText('Invalid card')).toBeTruthy();
  });

  it('calls onChangeText when input changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <CardInput {...defaultProps} onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByPlaceholderText('Card number'), '4111');
    expect(onChangeText).toHaveBeenCalledWith('4111');
  });
});
