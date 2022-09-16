import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { Button, Typography, withStyles, WithStyles } from '@material-ui/core';
import QRCode from 'qrcode.react';

import styles from './styles';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class Receive extends Component<WithStyles & IProps, {}> {
  public render() {
    const { classes } = this.props;
    const { loggedInAccountName, info, metrixBalanceUSD, networkBalAnnotation } = this.props.store.sessionStore;

    if (!loggedInAccountName || !info) {
      return null;
    }

    return info && (
      <div className={classes.root}>
        <NavBar hasBackButton title="Receive" />
        <div className={classes.contentContainer}>
          <Typography className={classes.accountName}>{loggedInAccountName}</Typography>
          <div className={classes.receiveContainer}>
            <Typography className={classes.accountAddress}>{info.addrStr}</Typography>
            <Button className={classes.addrCopyButton}
            id="addrCopyButton"
            onClick={() => {navigator.clipboard.writeText(info.addrStr); }}>
              <img src="images/clipboard-solid.svg" />
            </Button>
          </div>
          <div className={classes.amountContainer}>
            <Typography className={classes.tokenAmount}>{info.balance}</Typography>
            <Typography className={classes.token}>MRX</Typography>
          </div>
          <Typography className={classes.currencyValue}>{`${metrixBalanceUSD} ${networkBalAnnotation}`}</Typography>
          <div className={classes.qrCodeContainer}>
            <QRCode value={info.addrStr} />
          </div>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(Receive);
