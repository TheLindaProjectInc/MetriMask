/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { Typography, TextField, Button, withStyles, WithStyles } from '@material-ui/core';

import styles from './styles';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class ConfirmExternalRequest extends Component<WithStyles & IProps, {}> {
  public componentDidMount() {
    this.props.store.externalRequestStore.init();
  }

  public render() {
    const { classes } = this.props;
    const { pendingRequest } = this.props.store.externalRequestStore;

    const kind = pendingRequest && pendingRequest.kind;
    const title = kind === 'signMessage' ? 'Signature Request' : 'Confirm Transaction';

    return (
      <div className={classes.root}>
        <NavBar title={title} />
        <div className={classes.contentContainer}>
          {kind === 'sendToContract' && <ConfirmSendToContract {...this.props} />}
          {kind === 'signMessage' && <ConfirmSignMessage {...this.props} />}
        </div>
      </div>
    );
  }
}

const DetailField: React.FC<any> = ({ classes, label, value }: any) => (
  <div className={classes.detailField}>
    <Typography className={classes.detailLabel}>{label}:</Typography>
    <Typography className={classes.detailValue}>{value}</Typography>
  </div>
);

const NumberField: React.FC<any> = observer(({ classes, name, unit, value, onChange }: any) => (
  <div className={classes.fieldContainer}>
    <div className={classes.fieldHeadingRow}>
      <Typography className={classes.fieldHeading}>{name}</Typography>
    </div>
    <div className={classes.fieldTextContainer}>
      <TextField
        className={classes.selectOrTextField}
        fullWidth
        type="number"
        InputProps={{
          className: classes.fieldTextOrInput,
          endAdornment: <Typography className={classes.fieldUnit}>{unit}</Typography>,
          disableUnderline: true,
        }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  </div>
));

const ConfirmSendToContract: React.FC<any> = observer(({ classes, store: { externalRequestStore } }: any) => (
  <React.Fragment>
    <div className={classes.card}>
      <DetailField classes={classes} label="From" value={externalRequestStore.pendingRequest.account.address} />
      <DetailField classes={classes} label="To" value={externalRequestStore.contractAddress} />
    </div>

    <NumberField
      classes={classes}
      name="Amount"
      unit="MRX"
      value={externalRequestStore.amount}
      onChange={externalRequestStore.changeAmount}
    />
    <NumberField
      classes={classes}
      name="Gas Limit"
      unit="GAS"
      value={externalRequestStore.gasLimit}
      onChange={externalRequestStore.changeGasLimit}
    />
    <NumberField
      classes={classes}
      name="Gas Price"
      unit="SATOSHI/GAS"
      value={externalRequestStore.gasPrice}
      onChange={externalRequestStore.changeGasPrice}
    />

    <div className={classes.card}>
      <DetailField
        classes={classes}
        label="Max Transaction Fee"
        value={`${externalRequestStore.maxTxFee} MRX`}
      />
      <div className={classes.detailField}>
        <Typography className={classes.detailLabel}>Raw Transaction:</Typography>
        <Typography className={classes.rawTransaction}>{externalRequestStore.rawTransaction}</Typography>
      </div>
    </div>

    <ConfirmCancelButtons classes={classes} externalRequestStore={externalRequestStore} confirmLabel="Confirm" />
  </React.Fragment>
));

const ConfirmSignMessage: React.FC<any> = observer(({ classes, store: { externalRequestStore } }: any) => (
  <React.Fragment>
    <div className={classes.card}>
      <DetailField classes={classes} label="Account" value={externalRequestStore.pendingRequest.account.name} />
      <DetailField classes={classes} label="Address" value={externalRequestStore.pendingRequest.account.address} />
      <DetailField classes={classes} label="Origin" value={externalRequestStore.origin} />
    </div>
    <div className={classes.card}>
      <DetailField classes={classes} label="Message" value={externalRequestStore.message} />
    </div>

    <ConfirmCancelButtons classes={classes} externalRequestStore={externalRequestStore} confirmLabel="Sign" />
  </React.Fragment>
));

const ConfirmCancelButtons: React.FC<any> = ({ classes, externalRequestStore, confirmLabel }: any) => (
  <div className={classes.buttonRow}>
    <Button
      className={classes.cancelButton}
      variant="outlined"
      color="primary"
      onClick={externalRequestStore.cancel}
    >
      Cancel
    </Button>
    <Button
      className={classes.confirmButton}
      variant="contained"
      color="primary"
      onClick={externalRequestStore.confirm}
    >
      {confirmLabel}
    </Button>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(ConfirmExternalRequest);
