import { Theme, makeStyles, createStyles } from '@material-ui/core';

const styles = makeStyles((theme: Theme) =>
  createStyles({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  textField: {
    flex: 1,
    padding: theme.padding.sm,
    fontSize: theme.font.sm,
    border: theme.border.root,
    borderRadius: theme.border.radius,
  },
  input: {
    fontSize: theme.font.sm,
  },
  errorText: {
    fontSize: theme.font.xs,
    color: theme.color.red,
    marginTop: theme.padding.unit,
  },
}));

export default styles;
