import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  card: {
    cursor: 'pointer',
    borderRadius: theme.card.radius,
  },
  cardContent: {
    background: theme.color.gradientPurple,
    borderRadius: theme.card.radius,
  },
});

export default styles;
