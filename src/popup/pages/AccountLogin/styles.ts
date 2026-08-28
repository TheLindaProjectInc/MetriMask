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
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    padding: theme.padding.md,
    marginBottom: theme.padding.lg,
    background: theme.card.background,
    border: theme.card.border,
    borderRadius: theme.card.radius,
  },
  cardHeading: {
    fontSize: theme.font.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.text.primary,
    marginBottom: theme.padding.sm,
  },
  selectContainer: {
    padding: theme.padding.xs,
    background: theme.palette.background.default,
    borderRadius: theme.border.radius,
    marginBottom: theme.padding.sm,
  },
  accountSelect: {
    width: '100%',
    padding: theme.padding.sm,
    fontSize: theme.font.md,
  },
  createAccountContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  orText: {
    fontSize: theme.font.sm,
    color: theme.palette.text.secondary,
  },
  createAccountButton: {
    minHeight: 0,
    padding: `0 ${theme.padding.unit}`,
    fontSize: theme.font.sm,
    fontWeight: theme.fontWeight.bold,
  },
  loginContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  loginButton: {
    height: theme.button.lg.height,
    borderRadius: theme.button.lg.radius,
  },
});

export default styles;
