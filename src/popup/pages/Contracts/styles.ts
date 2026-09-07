import { StyleRulesCallback, Theme } from '@material-ui/core';

const styles: StyleRulesCallback = (theme: Theme) => ({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    margin: theme.padding.md,
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.padding.md,
    marginBottom: theme.padding.sm,
    background: theme.card.background,
    border: theme.card.border,
    borderRadius: theme.card.radius,
    cursor: 'pointer',
  },
  actionIcon: {
    fontSize: theme.font.lg,
    color: theme.palette.primary.main,
    marginRight: theme.padding.sm,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: theme.font.sm,
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  actionSubtitle: {
    fontSize: theme.font.xs,
    color: theme.palette.text.secondary,
    marginTop: theme.padding.halfUnit,
  },
});

export default styles;
