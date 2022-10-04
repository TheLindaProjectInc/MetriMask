import { Theme, makeStyles, createStyles } from '@material-ui/core';

const styles = makeStyles((theme: Theme) =>
  createStyles({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    margin: theme.padding.md,
  },
  fieldContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  passwordField: {
    marginBottom: theme.padding.md,
  },
  loginButton: {
    height: theme.button.lg.height,
    borderRadius: theme.button.lg.radius,
    marginBottom: '16px',
  }
}));

export default styles;