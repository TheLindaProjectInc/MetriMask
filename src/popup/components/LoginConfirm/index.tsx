import React, { Component, FC } from 'react';
import { Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  withStyles,
  WithStyles, } from '@material-ui/core';
import { inject, observer} from 'mobx-react';

import styles from './styles';
import AppStore from '../../stores/AppStore';
// import cx from 'classnames';
import PasswordInput from '../../components/PasswordInput';
// const strings = require('../../localization/locales/en_US.json');

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
class LoginConfirm extends Component<WithStyles & IProps, {}> {

  public render() {
    const { classes, store: { savePrivateKeyStore } } = this.props;
    return (
      <div className={classes.root}>
        <div className={classes.fieldContainer}>
        <PasswordInput
          classNames={classes.passwordField}
          autoFocus={true}
          placeholder="Password"
          onChange={(e: any) => savePrivateKeyStore.password = e.target.value}
          onEnterPress={savePrivateKeyStore.confirmLogin}
        />
        <ConfirmButton {...this.props} />
      </div>
      <ErrorDialog {...this.props} />
      </div>
    );
  }
}

const ConfirmButton: FC<any> = observer(({ classes, store: { savePrivateKeyStore } }: any) => (
  <Button
    className={classes.loginButton}
    fullWidth
    variant="contained"
    color="primary"
    disabled={savePrivateKeyStore.disabled}
    onClick={savePrivateKeyStore.confirmLogin}>
    Login
  </Button>
));

const ErrorDialog: React.FC<any> = observer(({ store: { savePrivateKeyStore }}: any) => (
  <Dialog
    disableBackdropClick
    open={!!savePrivateKeyStore.invalidPassword}
    onClose={() => savePrivateKeyStore.invalidPassword = undefined}
  >
    <DialogTitle>Invalid Password</DialogTitle>
    <DialogContent>
      <DialogContentText>You have entered an invalid password. Please try again.</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => savePrivateKeyStore.invalidPassword = undefined} color="primary">Close</Button>
    </DialogActions>
  </Dialog>
));

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(LoginConfirm);
