import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  root: {
    padding: theme.padding.md,
  },
  acctName: {
    fontSize: theme.font.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.secondary.main,
    marginBottom: theme.padding.sm,
  },
  detailRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
  },
  detailField: {
    flex: 1,
    marginBottom: theme.padding.sm,
  },
  detailLabel: {
    fontSize: theme.font.xs,
    color: theme.palette.secondary.main,
    opacity: 0.6,
    marginBottom: theme.padding.halfUnit,
  },
  detailValue: {
    fontSize: theme.font.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.secondary.main,
    wordBreak: 'break-all',
  },
  amountContainer: {
    width: '100%',
    flexDirection: 'row',
    display: 'inline-flex',
    alignItems: 'center',
  },
  tokenAmount: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.secondary.main,
    marginRight: theme.padding.xs,
  },
  rightArrow: {
    fontSize: 22,
    color: theme.palette.secondary.main,
    alignSelf: 'center',
  },
  balanceUSD: {
    fontSize: theme.font.sm,
    color: theme.palette.secondary.main,
    marginBottom: theme.padding.sm,
  },
  actionButtonsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: `${theme.padding.unit} ${theme.padding.sm}`,
    marginRight: theme.padding.xs,
    fontSize: theme.font.sm,
  },
});

export default styles;
