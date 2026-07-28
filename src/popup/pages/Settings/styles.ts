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
  fieldsContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  fieldHeading: {
    marginBottom: theme.padding.unit,
    fontSize: theme.font.sm,
    fontWeight: 'bold',
  },
  fieldContainer: {
    marginBottom: theme.padding.md,
  },
  fieldContentContainer: {
    padding: `${theme.padding.unit} ${theme.padding.md}`,
    border: `2px solid ${theme.palette.primary.main}`,
    borderRadius: theme.button.lg.radius,
  },
  fieldTextContainer: {
    flex: 1,
    padding: theme.padding.xs,
    background: theme.card.background,
    borderRadius: theme.card.radius,
  },
  selectOrTextField: {
    width: '100%',
    fontSize: theme.font.sm,
  },
  fieldTextOrInput: {
    fontSize: theme.font.sm,
  },
  buttonFieldHeadingContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldButton: {
    marginLeft: theme.padding.xs,
    minWidth: 0,
    minHeight: 0,
    padding: `${theme.padding.unit} ${theme.padding.sm}`,
    fontSize: theme.font.xs,
  },
  errorText: {
    fontSize: theme.font.xs,
    color: theme.color.red,
    marginTop: theme.padding.unit,
  },
  successText: {
    fontSize: theme.font.xs,
    color: '#4CAF50',
    marginTop: theme.padding.unit,
  },
  switchRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  select: {
    width: '100%',
  },
  selectTypography: {
    fontSize: theme.font.md,
    fontWeight: 'bold',
  },
});

export default styles;
