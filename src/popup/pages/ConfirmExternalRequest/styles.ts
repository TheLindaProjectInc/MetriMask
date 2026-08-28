import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    margin: theme.padding.md,
    overflowY: 'auto',
  },
  card: {
    padding: theme.padding.md,
    marginBottom: theme.padding.sm,
    background: theme.card.background,
    border: theme.card.border,
    borderRadius: theme.card.radius,
  },
  detailField: {
    marginBottom: theme.padding.sm,
  },
  detailLabel: {
    fontSize: theme.font.xs,
    color: theme.palette.text.secondary,
    marginBottom: theme.padding.halfUnit,
  },
  detailValue: {
    fontSize: theme.font.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.text.primary,
    wordBreak: 'break-all',
  },
  fieldContainer: {
    marginBottom: theme.padding.sm,
  },
  fieldHeadingRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldHeading: {
    flex: 1,
    marginBottom: theme.padding.halfUnit,
    fontSize: theme.font.sm,
    fontWeight: 'bold',
  },
  fieldUnit: {
    fontSize: theme.font.xs,
    color: theme.palette.text.secondary,
  },
  fieldTextContainer: {
    padding: theme.padding.xs,
    background: theme.card.background,
    borderRadius: theme.card.radius,
  },
  selectOrTextField: {
    width: '100%',
    fontSize: theme.font.sm,
  },
  fieldTextOrInput: {
    fontSize: theme.font.sm,
  },
  rawTransaction: {
    fontSize: theme.font.xs,
    color: theme.palette.text.secondary,
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: theme.font.xs,
    color: theme.color.red,
    marginTop: theme.padding.unit,
  },
  buttonRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    marginTop: theme.padding.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: theme.padding.xs,
    height: theme.button.lg.height,
    borderRadius: theme.button.lg.radius,
  },
  confirmButton: {
    flex: 1,
    marginLeft: theme.padding.xs,
    height: theme.button.lg.height,
    borderRadius: theme.button.lg.radius,
  },
});

export default styles;
