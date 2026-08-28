import React, { Component } from 'react';
import { Select, MenuItem, Typography, Button, withStyles, WithStyles } from '@material-ui/core';
import { inject, observer } from 'mobx-react';

import styles from './styles';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';
import Account from '../../../models/Account';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class AccountLogin extends Component<WithStyles & IProps, {}> {

  public componentDidMount() {
    this.props.store.accountLoginStore.getAccounts(true);
  }

  public render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <NavBar hasNetworkSelector title="Account Login" />
        <div className={classes.contentContainer}>
          <div className={classes.fieldsContainer}>
            <AccountSection {...this.props} />
          </div>
          <LoginSection {...this.props} />
        </div>
      </div>
    );
  }
}

const AccountSection = observer(({ classes, store: { accountLoginStore } }: any) => (
  <div className={classes.card}>
    <Typography className={classes.cardHeading}>Select Account</Typography>
    <div className={classes.selectContainer}>
      <Select
        disableUnderline
        className={classes.accountSelect}
        name="accounts"
        value={accountLoginStore.selectedWalletName}
        onChange={(e) => accountLoginStore.selectedWalletName = e.target.value}
      >
        {accountLoginStore.accounts.map((acct: Account, index: number) =>
          <MenuItem key={index} value={acct.name}>{acct.name}</MenuItem>)
        }
      </Select>
    </div>
    <div className={classes.createAccountContainer}>
      <Typography className={classes.orText}>or</Typography>
      <Button className={classes.createAccountButton} color="primary" onClick={accountLoginStore.routeToCreateWallet}>
        Create New Wallet
      </Button>
    </div>
  </div>
));

const LoginSection = observer(({ classes, store: { accountLoginStore } }: any) => (
  <div className={classes.loginContainer}>
    <Button
      className={classes.loginButton}
      fullWidth
      variant="contained"
      color="primary"
      onClick={accountLoginStore.loginAccount}
    >
      Login
    </Button>
  </div>
));

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(AccountLogin);
