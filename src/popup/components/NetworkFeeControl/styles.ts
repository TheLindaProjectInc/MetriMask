import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  root: {
    marginBottom: theme.padding.sm,
    padding: theme.padding.sm,
    background: theme.card.background,
    border: theme.card.border,
    borderRadius: theme.card.radius,
  },
  headingRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.padding.xs,
  },
  heading: {
    flex: 1,
    fontSize: theme.font.sm,
    fontWeight: 'bold',
  },
  amounts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  feeAmount: {
    fontSize: theme.font.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.text.primary,
  },
  feeUsd: {
    fontSize: theme.font.xs,
    color: theme.palette.text.secondary,
  },
  slider: {
    // See the matching comment in SliderInput/styles.ts -- -webkit-appearance: none means the
    // thumb is no longer auto-contained within the track, so it's inset by its own radius here.
    width: 'calc(100% - 18px)',
    margin: '0 9px',
    height: 4,
    WebkitAppearance: 'none',
    background: theme.palette.background.default,
    borderRadius: theme.card.radius,
    outline: 'none',
    cursor: 'pointer',
    '&::-webkit-slider-thumb': {
      WebkitAppearance: 'none',
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: theme.palette.primary.main,
      cursor: 'pointer',
    },
    '&::-moz-range-thumb': {
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: theme.palette.primary.main,
      cursor: 'pointer',
      border: 'none',
    },
  },
  sliderDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    '&::-webkit-slider-thumb': {
      cursor: 'not-allowed',
    },
    '&::-moz-range-thumb': {
      cursor: 'not-allowed',
    },
  },
  marksRow: {
    width: 'calc(100% - 18px)',
    margin: `${theme.padding.halfUnit} 9px ${theme.padding.sm}`,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  markColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  mark: {
    fontSize: theme.font.xs,
    color: theme.palette.text.secondary,
  },
  markActive: {
    fontSize: theme.font.xs,
    color: theme.palette.primary.main,
    fontWeight: 'bold',
  },
  markRate: {
    fontSize: 9,
    color: theme.palette.text.secondary,
  },
  customRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.padding.sm,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  customLabel: {
    fontSize: theme.font.sm,
    color: theme.palette.text.secondary,
  },
  customInput: {
    width: '45%',
  },
  customInputText: {
    fontSize: theme.font.sm,
    textAlign: 'right',
  },
});

export default styles;
