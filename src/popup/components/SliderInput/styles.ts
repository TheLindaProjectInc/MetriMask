import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  slider: {
    width: '100%',
    height: 4,
    marginTop: theme.padding.xs,
    WebkitAppearance: 'none',
    background: theme.card.background,
    borderRadius: theme.card.radius,
    outline: 'none',
    cursor: 'pointer',
    '&::-webkit-slider-thumb': {
      WebkitAppearance: 'none',
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: theme.palette.primary.main,
      cursor: 'pointer',
    },
    '&::-moz-range-thumb': {
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: theme.palette.primary.main,
      cursor: 'pointer',
      border: 'none',
    },
  },
});

export default styles;
