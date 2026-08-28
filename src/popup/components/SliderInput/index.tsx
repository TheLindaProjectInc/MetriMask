import React from 'react';
import { withStyles, WithStyles } from '@material-ui/core';

import styles from './styles';

interface IProps {
  min: number;
  max: number;
  value: number | string;
  onChange: (value: number) => void;
}

// Extends the visual range to include the current value rather than clamping it, so a
// value from outside the recommended range (e.g. a dApp-suggested gasLimit) is never
// silently misrepresented or overridden by the slider.
const SliderInput: React.FC<WithStyles & IProps> = ({ classes, min, max, value, onChange }) => {
  const numericValue = Number(value) || 0;
  const effectiveMin = Math.min(min, numericValue);
  const effectiveMax = Math.max(max, numericValue);

  return (
    <input
      className={classes.slider}
      type="range"
      min={effectiveMin}
      max={effectiveMax}
      step={1}
      value={numericValue}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(SliderInput);
