/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { Typography, withStyles, Button, WithStyles } from '@material-ui/core';
import cx from 'classnames';

import styles from './styles';
import { SEND_STATE } from '../../../constants';
import NavBar from '../../components/NavBar';
import AppStore from '../../stores/AppStore';

interface IProps {
  classes: Record<string, string>;
  store: AppStore;
}

@inject('store')
@observer
class SendConfirm extends Component<WithStyles & IProps, {}> {

  public render() {
    const { classes, store: { sendStore } } = this.props;
    const { senderAddress, recipients, token, gasLimit,
    gasPrice, maxTxFee, sendState, errorMessage } = sendStore;
    const { SENDING, SENT } = SEND_STATE;
    const multiple = recipients.length > 1;

    return (
      <div className={classes.root}>
        <NavBar hasBackButton title="Confirm" />
        <div className={classes.contentContainer}>
          <div className={classes.inputContainer}>
            <div className={classes.addressFieldsContainer}>
              <AddressField fieldName={'From'} address={senderAddress} {...this.props} />
              {recipients.map((recipient: any, index: number) => (
                <AddressField
                  key={index}
                  fieldName={multiple ? `To #${index + 1}` : 'To'}
                  address={recipient.address}
                  {...this.props}
                />
              ))}
            </div>
            {recipients.map((recipient: any, index: number) => (
              <CostField
                key={index}
                fieldName={multiple ? `Amount #${index + 1}` : 'Amount'}
                amount={recipient.amount}
                unit={token!.symbol}
                {...this.props}
              />
            ))}
            {this.props.store.sendStore.token && this.props.store.sendStore.token.symbol !== 'MRX' && (
              <div>
                <CostField fieldName={'Gas Limit'} amount={gasLimit} unit={'GAS'} {...this.props} />
                <CostField fieldName={'Gas Price'} amount={gasPrice} unit={'SATOSHI/GAS'} {...this.props} />
                <CostField fieldName={'Max Transaction Fee'} amount={maxTxFee} unit={'MRX'} {...this.props} />
              </div>
            )}
            <NetworkFeeField {...this.props} />
            <TotalField {...this.props} />
          </div>
          {errorMessage && <Typography className={classes.errorMessage}>{errorMessage}</Typography>}
          <Button
            className={classes.sendButton}
            fullWidth
            disabled={[SENDING, SENT].includes(sendState)}
            variant="contained"
            color="primary"
            onClick={sendStore.send}
          >
            {sendState}
          </Button>
        </div>
      </div>
    );
  }
}

const AddressField = ({ classes, fieldName, address }: any) => (
  <div className={cx(classes.fieldContainer, 'marginSmall')}>
    <Typography className={cx(classes.fieldLabel, 'address')}>{fieldName}</Typography>
    <Typography className={classes.addressValue}>{address}</Typography>
  </div>
);

const NetworkFeeField = observer(({ classes, store: { sendStore } }: any) => {
  const { feeSpeed, isCustomFee, customFeeRate, networkFeeLabel, networkFeeUsdLabel } = sendStore;
  const feeSpeedStr = String(feeSpeed);
  const speedLabel = isCustomFee
    ? `Custom, ${customFeeRate} sat/byte`
    : feeSpeedStr.charAt(0).toUpperCase() + feeSpeedStr.slice(1);
  const amount = networkFeeLabel
    ? `${networkFeeLabel}${networkFeeUsdLabel ? ` (${networkFeeUsdLabel})` : ''}`
    : 'Calculating...';

  return <CostField fieldName={`Network Fee (${speedLabel})`} amount={amount} unit={''} classes={classes} />;
});

const TotalField = observer(({ classes, store: { sendStore } }: any) => {
  const { token, totalRecipientsAmount, maxTxFee, networkFee, mrxUsdRate } = sendStore;
  const isMrx = !!token && token.symbol === 'MRX';

  if (networkFee === undefined) {
    return <CostField fieldName={'Total (MRX)'} amount={'Calculating...'} unit={''} classes={classes} />;
  }

  const networkFeeMrx = Number(networkFee) * 1e-8;
  const totalMrx = isMrx ? Number(totalRecipientsAmount || 0) + networkFeeMrx : Number(maxTxFee || 0) + networkFeeMrx;
  const totalUsd = mrxUsdRate ? ` ($${(totalMrx * mrxUsdRate).toFixed(2)})` : '';
  const fieldName = isMrx ? 'Total (Amount + Fee)' : 'Total MRX Cost (Gas + Fee)';
  const totalLabel = `${totalMrx.toFixed(8)} MRX${totalUsd}`;

  return <CostField fieldName={fieldName} amount={totalLabel} unit={''} classes={classes} />;
});

const CostField = ({ classes, fieldName, amount, unit }: any) => (
  <div className={cx(classes.fieldContainer, 'row', 'marginBig')}>
    <div className={classes.labelContainer}>
      <Typography className={cx(classes.fieldLabel, 'cost')}>{fieldName}</Typography>
    </div>
    <div className={classes.amountContainer}>
      <Typography className={classes.fieldValue}>{amount}</Typography>
    </div>
    <div className={classes.unitContainer}>
      <Typography className={classes.fieldUnit}>{unit}</Typography>
    </div>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(SendConfirm);
