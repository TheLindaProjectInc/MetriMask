/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React from 'react';
import { Typography, withStyles, CircularProgress } from '@material-ui/core';
import cx from 'classnames';

import styles from './styles';

const Loading: React.FC<any> = ({ classes }: any) => (
  <div className={cx(classes.root, 'loading')}>
    <div className={classes.container}>
      <Typography className={classes.text}>Loading...</Typography>
      {/* <div className={classes.anim9}></div> */}
      <CircularProgress disableShrink={true} />
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(Loading);
