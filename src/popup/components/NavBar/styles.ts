import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  root: {
    margin: theme.padding.md,
    paddingBottom: theme.padding.sm,
    flexDirection: 'row',
    display: 'flex',
    borderBottom: `2px solid ${theme.palette.divider}`,
  },
  leftButtonsContainer: {
    marginRight: theme.padding.unit,
    cursor: 'pointer',
  },
  backIconButton: {
    width: theme.icon.size,
    height: theme.icon.size,
  },
  backButton: {
    fontSize: theme.font.md,
    '&.white': {
      color: theme.palette.secondary.main,
    },
  },
  settingsIconButton: {
    width: theme.icon.size,
    height: theme.icon.size,
  },
  settingsButton: {
    fontSize: 18,
    '&.white': {
      color: theme.palette.secondary.main,
    },
  },
  locationContainer: {
    height: theme.icon.size,
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: theme.font.md,
    fontWeight: 'bold',
    '&.white': {
      color: theme.palette.secondary.main,
    },
  },
  rightButtonsContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleIconButton: {
    width: theme.icon.size,
    height: theme.icon.size,
  },
  themeToggleButton: {
    fontSize: 18,
    '&.white': {
      color: theme.palette.secondary.main,
    },
  },
});

export default styles;
