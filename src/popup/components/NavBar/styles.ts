import { Theme, makeStyles, createStyles } from '@material-ui/core';

const styles = makeStyles((theme: Theme) =>
  createStyles({
  root: {
    margin: theme.padding.md,
    flexDirection: 'row',
    display: 'flex',
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
  fullScreenIconButton: {
    width: theme.icon.size,
    height: theme.icon.size,
  },
  fullScreenButton: {
    fontSize: theme.font.md,
    '&.white': {
      color: theme.palette.secondary.main,
    },
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
}));

export default styles;
