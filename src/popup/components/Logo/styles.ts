import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.padding.lg,
  },
  logo: {
    width: 112,
    height: 112,
  },
  logoText: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.palette.primary.main,
    alignSelf: 'center',
  },
  version: {
    fontSize: theme.font.sm,
    color: theme.palette.text.secondary,
  },
});

export default styles;
