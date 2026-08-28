import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  slider: {
    // -webkit-appearance: none disables the browser's own containment of the thumb within
    // the track, so at the 0%/100% ends half the thumb (9px) would otherwise bleed past this
    // element's box -- a fixed pixel overflow independent of container width, hence widening
    // the panel doesn't help. Insetting the track by the thumb's radius keeps its whole
    // travel range inside the original visible bounds.
    width: 'calc(100% - 18px)',
    margin: `${theme.padding.xs} 9px 0`,
    height: 4,
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
