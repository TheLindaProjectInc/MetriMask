import React from 'react';
import { Tooltip, withStyles, WithStyles } from '@material-ui/core';
import { InfoOutlined } from '@material-ui/icons';

import styles from './styles';

interface IProps {
  text: string;
}

// Info icons are frequently nested inside clickable rows (e.g. a fee-summary row that opens
// an edit modal) -- stop propagation so hovering/tapping the icon never triggers the parent.
const InfoTooltip: React.FC<WithStyles & IProps> = ({ classes, text }) => (
  <Tooltip title={text} placement="top" enterTouchDelay={0}>
    <InfoOutlined className={classes.icon} onClick={(event) => event.stopPropagation()} />
  </Tooltip>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(InfoTooltip);
