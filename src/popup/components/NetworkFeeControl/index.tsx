import React, { Component } from 'react';
import { Typography, TextField, withStyles, WithStyles } from '@material-ui/core';
import cx from 'classnames';

import styles from './styles';
import InfoTooltip from '../InfoTooltip';

const NETWORK_FEE_INFO = 'Fee paid to relay and include this transaction on the network, based ' +
  'on its size in bytes. This is separate from any gas cost above, and goes to the network, not ' +
  'the recipient.';

export type FeeSpeed = 'slow' | 'normal' | 'fast';

const SPEEDS: FeeSpeed[] = ['slow', 'normal', 'fast'];
const SPEED_LABELS: Record<FeeSpeed, string> = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };

interface IProps {
  feeSpeed: FeeSpeed;
  isCustomFee: boolean;
  customFeeRate?: number;
  feeRateTiers?: { slow: number; normal: number; fast: number };
  networkFeeLabel?: string;
  networkFeeUsdLabel?: string;
  onSelectTier: (speed: FeeSpeed) => void;
  onApplyCustomFee: (rate: number) => void;
}

interface IState {
  customDraft: string;
}

class NetworkFeeControl extends Component<WithStyles & IProps, IState> {
  public state: IState = {
    customDraft: this.props.isCustomFee && this.props.customFeeRate ? String(this.props.customFeeRate) : '',
  };

  public render() {
    const { classes, feeSpeed, isCustomFee, feeRateTiers, networkFeeLabel, networkFeeUsdLabel } = this.props;
    const { customDraft } = this.state;
    const sliderIndex = SPEEDS.indexOf(feeSpeed);

    return (
      <div className={classes.root}>
        <div className={classes.headingRow}>
          <Typography className={classes.heading}>
            Network Fee
            <InfoTooltip text={NETWORK_FEE_INFO} />
          </Typography>
          <div className={classes.amounts}>
            {networkFeeLabel && <Typography className={classes.feeAmount}>{networkFeeLabel}</Typography>}
            {networkFeeUsdLabel && <Typography className={classes.feeUsd}>{networkFeeUsdLabel}</Typography>}
          </div>
        </div>

        <input
          className={cx(classes.slider, isCustomFee && classes.sliderDisabled)}
          type="range"
          min={0}
          max={2}
          step={1}
          disabled={isCustomFee}
          value={sliderIndex === -1 ? 1 : sliderIndex}
          onChange={(event) => this.selectTier(SPEEDS[Number(event.target.value)])}
        />
        <div className={classes.marksRow}>
          {SPEEDS.map((speed) => (
            <div key={speed} className={classes.markColumn}>
              <Typography className={!isCustomFee && feeSpeed === speed ? classes.markActive : classes.mark}>
                {SPEED_LABELS[speed]}
              </Typography>
              {feeRateTiers && (
                <Typography className={classes.markRate}>{feeRateTiers[speed]} sat/byte</Typography>
              )}
            </div>
          ))}
        </div>

        <div className={classes.customRow}>
          <Typography className={classes.customLabel}>Custom rate</Typography>
          <TextField
            className={classes.customInput}
            type="number"
            placeholder="satoshi/byte"
            value={customDraft}
            InputProps={{ className: classes.customInputText, disableUnderline: true }}
            onChange={(event) => this.handleCustomChange(event.target.value)}
          />
        </div>
      </div>
    );
  }

  private selectTier = (speed: FeeSpeed) => {
    this.setState({ customDraft: '' });
    this.props.onSelectTier(speed);
  };

  private handleCustomChange = (value: string) => {
    this.setState({ customDraft: value });

    if (value.trim() === '') {
      this.props.onSelectTier(this.props.feeSpeed);
      return;
    }

    const rate = Math.round(Number(value));
    if (rate > 0) {
      this.props.onApplyCustomFee(rate);
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export default withStyles(styles)(NetworkFeeControl);
