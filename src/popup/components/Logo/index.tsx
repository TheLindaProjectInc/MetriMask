import React from 'react';
import { Typography, withStyles } from '@material-ui/core';

import styles from './styles';

const Logo: React.FC<any> = ({ classes }: any) => (
  <div className={classes.logoContainer}>
    <img className={classes.logo} src={chrome.runtime.getURL('images/logo.png')} alt={'Logo'} />
    <Typography className={classes.logoText}>MetriMask</Typography>
    <Typography className={classes.version}>version {chrome.runtime.getManifest().version}</Typography>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(Logo);
