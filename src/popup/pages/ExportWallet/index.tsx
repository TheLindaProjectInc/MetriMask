/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { Component, FC } from 'react';
import { Typography,
  Button,
  withStyles,
  WithStyles, } from '@material-ui/core';
import { inject, observer } from 'mobx-react';

import styles from './styles';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';
import cx from 'classnames';
import LoginConfirm from '../../components/LoginConfirm';
const strings = require('../../localization/locales/en_US.json');

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class ExportWallet extends Component<WithStyles & IProps, {}> {
  public componentDidMount() {
    this.props.store.savePrivateKeyStore.init();
  }

  public componentWillUnmount() {
    this.props.store.savePrivateKeyStore.deinit();
  }

  public render() {
    const { classes, store: { savePrivateKeyStore } } = this.props;
    const { privateKey } = savePrivateKeyStore;
    const title = privateKey ? 'Export Private Key' : 'Private Key';

    return (
      <div className={classes.root}>
        <NavBar hasBackButton title={title} />
        {privateKey ? <ExportKey {...this.props} /> : <LoginConfirm {...this.props} />}
      </div>
    );
  }
}

const ExportKey: FC<any> = observer(({ classes, store: { savePrivateKeyStore, routerStore } }: any) => (
    <div className={classes.contentContainer}>
    <div className={classes.topContainer}>
      <Typography className={classes.exportWalletHeader}>{strings['savePrivateKey.walletCreated']}</Typography>
      <Typography className={classes.privateKeyText}>{savePrivateKeyStore.privateKey}</Typography>
      <Typography className={classes.warningText}>{strings['savePrivateKey.warningText']}</Typography>
    </div>
    <Button
      className={cx(classes.actionButton, 'marginBottom')}
      fullWidth
      variant="contained"
      color="primary"
      onClick={() => {
        savePrivateKeyStore.reset();
        routerStore.push('/home');
      }}>
      I Copied It Somewhere Safe
    </Button>
    <Button
      className={classes.actionButton}
      fullWidth
      variant="contained"
      color="primary"
      onClick={() => {
        savePrivateKeyStore.savePrivateKey();
        savePrivateKeyStore.reset();
        routerStore.push('/home');
      }}>
      Save To File
    </Button>
  </div>
));

export default withStyles(styles)(ExportWallet);