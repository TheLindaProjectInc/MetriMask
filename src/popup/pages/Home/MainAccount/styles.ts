import { Theme, makeStyles, createStyles } from '@material-ui/core';

const styles = makeStyles((theme: Theme) =>
  createStyles({
  card: {
    cursor: 'pointer',
    borderRadius: theme.border.radius,
  },
  cardContent: {
    background: theme.color.gradientPurple,
  },
}));

export default styles;
