import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  root: {
    marginBottom: theme.padding.sm,
  },
  summaryRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.padding.sm,
    background: theme.card.background,
    border: theme.card.border,
    borderRadius: theme.card.radius,
    cursor: 'pointer',
  },
  heading: {
    flex: 1,
    fontSize: theme.font.sm,
    fontWeight: 'bold',
  },
  summaryValues: {
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
  editButton: {
    marginLeft: theme.padding.xs,
    padding: theme.padding.halfUnit,
  },
  editIcon: {
    fontSize: theme.font.lg,
    color: theme.palette.primary.main,
  },
  tierRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.padding.sm,
    marginBottom: theme.padding.xs,
    borderRadius: theme.card.radius,
    border: '1px solid transparent',
    cursor: 'pointer',
  },
  tierRowActive: {
    border: `1px solid ${theme.palette.primary.main}`,
    background: theme.card.background,
  },
  advancedRow: {
    cursor: 'default',
  },
  tierLabel: {
    fontSize: theme.font.sm,
    fontWeight: theme.fontWeight.bold,
  },
  tierRate: {
    fontSize: theme.font.xs,
    color: theme.palette.text.secondary,
  },
  customInput: {
    width: '50%',
  },
  customInputText: {
    fontSize: theme.font.sm,
    textAlign: 'right',
  },
});

export default styles;
