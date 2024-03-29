/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React from 'react';
import { TextField, Typography, withStyles } from '@material-ui/core';
import cx from 'classnames';

import styles from './styles';
import { handleEnterPress } from '../../../utils';

const PasswordTextField: React.FC<any> = ({
  classes,
  classNames,
  autoFocus,
  placeholder,
  helperText,
  error,
  errorText,
  onChange,
  onEnterPress,
}: any) => (
  <div className={cx(classes.container, classNames)}>
    <TextField
      className={classes.textField}
      required
      autoFocus={autoFocus}
      type="password"
      placeholder={placeholder}
      helperText={helperText}
      error={error}
      InputProps={{
        disableUnderline: true,
        classes: { input: classes.input },
      }}
      onChange={onChange}
      onKeyPress={(e) => handleEnterPress(e, onEnterPress)}
    />
    {error && errorText && (
      <Typography className={classes.errorText}>{errorText}</Typography>
    )}
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(PasswordTextField);
