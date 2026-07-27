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
  },
  fieldsContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  fieldHeading: {
    marginBottom: theme.padding.halfUnit,
    fontSize: theme.font.sm,
    fontWeight: 'bold',
  },
  fieldContainer: {
    marginBottom: theme.padding.sm,
  },
  fieldContentContainer: {
    padding: `${theme.padding.unit} ${theme.padding.md}`,
    border: `2px solid ${theme.palette.primary.main}`,
    borderRadius: theme.button.lg.radius,
  },
  fieldTextContainer: {
    padding: theme.padding.xs,
    background: theme.card.background,
    borderRadius: theme.card.radius,
  },
  fromCard: {
    padding: theme.padding.md,
    marginBottom: theme.padding.sm,
    background: theme.card.background,
    border: theme.card.border,
    borderRadius: theme.card.radius,
  },
  fromCardName: {
    fontSize: theme.font.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.text.primary,
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
    color: theme.palette.text.secondary,
    marginBottom: theme.padding.halfUnit,
  },
  detailValue: {
    fontSize: theme.font.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.text.primary,
  },
  errorText: {
    fontSize: theme.font.xs,
    color: theme.color.red,
    marginTop: theme.padding.unit,
  },
  fieldTextOrInput: {
    fontSize: theme.font.sm,
  },
  fieldInput: {
    padding: 0,
  },
  selectOrTextField: {
    width: '100%',
    height: 17,
    fontSize: theme.font.sm,
  },
  buttonFieldHeadingContainer: {
    width: '100%',
    flexDirection: 'row',
    display: 'inline-flex',
    alignItems: 'center',
  },
  buttonFieldHeadingTextContainer: {
    flex: 1,
  },
  fieldButtonText: {
    fontSize: theme.font.sm,
  },
  fieldButton: {
    minWidth: 0,
    minHeight: 0,
    padding: '0 4px',
    fontSize: 11,
  },
  fieldTextAdornment: {
    fontSize: theme.font.sm,
    fontWeight: 'bold',
    marginLeft: theme.padding.sm,
    display: 'flex',
    alignItems: 'center',
  },
  sendButton: {
    height: theme.button.lg.height,
    borderRadius: theme.button.lg.radius,
  },
  qrScanButton: {
    padding: theme.padding.unit,
    width: theme.icon.size,
    height: theme.icon.size,
  },
  qrScanIcon: {
    fontSize: theme.font.lg,
    color: theme.palette.primary.main,
  },
  qrScanSpinner: {
    color: theme.palette.primary.main,
  },
});

export default styles;
