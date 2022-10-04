import { Theme, makeStyles, createStyles } from '@material-ui/core';

const styles = makeStyles((theme: Theme) =>
  createStyles({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  loginContainer: {
    display: 'flex',
    flexDirection: 'column',
    margin: theme.padding.md
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    margin: theme.padding.md
  },
  recoveryKeyHeader: {
    fontSize: 20,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.padding.sm
  },
  topContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    marginBottom: theme.padding.xl
  },
  privateKeyText: {
    padding: theme.padding.md,
    marginBottom: theme.padding.xs,
    fontSize: theme.font.lg,
    fontFamily: 'Roboto Mono, monospace',
    color: theme.palette.text.primary,
    border: theme.border.root,
    borderRadius: theme.border.radius,
    wordBreak: 'break-all'
  },
  warningTextContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  warningText: {
    fontSize: theme.font.md,
    lineHeight: theme.lineHeight.md,
    color: theme.palette.text.secondary
  },
  actionButton: {
    height: theme.button.lg.height,
    borderRadius: theme.button.lg.radius,
    '&.marginBottom': {
        marginBottom: theme.padding.sm
    }
  },
  passwordField: {
    marginBottom: theme.padding.md,
  },
  loginButton: {
    height: theme.button.lg.height,
    borderRadius: theme.button.lg.radius,
    marginBottom: '16px',
  },
}));

export default styles;