import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  icon: {
    fontSize: theme.font.md,
    color: theme.palette.text.secondary,
    marginLeft: theme.padding.halfUnit,
    verticalAlign: 'text-bottom',
    cursor: 'help',
  },
});

export default styles;
