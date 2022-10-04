import { Theme, makeStyles, createStyles } from '@material-ui/core';

const styles = makeStyles((theme: Theme) =>
  createStyles({
  menuButton: {
    height: 24,
    minWidth: 0,
    minHeight: 0,
    padding: `0 ${theme.padding.sm}`,
    color: theme.palette.text.primary,
    textTransform: 'none',
  },
}));

export default styles;
