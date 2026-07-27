/* eslint-disable no-unused-vars */
import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import {
  FontWeightProperty,
  ColorProperty,
  FontFamilyProperty,
  BorderColorProperty,
  BorderProperty,
  BorderRadiusProperty,
  HeightProperty,
  WidthProperty,
  FontSizeProperty,
  LineHeightProperty,
  PaddingProperty,
  MarginProperty,
} from 'csstype';

const px = (value: number): string => value.toString().concat('px');

/* Shared colors (identical across themes) */
const colorWhite: ColorProperty = '#FFFFFF';
const colorGray: ColorProperty = '#747474';
const colorOrange: ColorProperty = '#F5A623';
const colorRed: ColorProperty = '#D0021B';

/* Padding */
const spacingMultiplier = 4;
const spacingHalfUnit: PaddingProperty<string> | MarginProperty<string> = px(spacingMultiplier * 0.5); // 2
const spacingUnit: PaddingProperty<string> | MarginProperty<string> = px(spacingMultiplier * 1); // 4
const spacingXs: PaddingProperty<string> | MarginProperty<string> = px(spacingMultiplier * 2); // 8
const spacingSm: PaddingProperty<string> | MarginProperty<string> = px(spacingMultiplier * 3); // 12
const spacingMd: PaddingProperty<string> | MarginProperty<string> = px(spacingMultiplier * 4); // 16
const spacingLg: PaddingProperty<string> | MarginProperty<string> = px(spacingMultiplier * 5); // 20
const spacingXl: PaddingProperty<string> | MarginProperty<string> = px(spacingMultiplier * 6); // 24

/* Fonts */
const fontMontserrat: FontFamilyProperty = 'Montserrat, sans-serif';
const fontSizeXs: FontSizeProperty<string> = px(10);
const fontSizeSm: FontSizeProperty<string> = px(12);
const fontSizeMd: FontSizeProperty<string> = px(14);
const fontSizeLg: FontSizeProperty<string> = px(16);
const fontSizeXl: FontSizeProperty<string> = px(18);

const fontWeightBold: FontWeightProperty = 'bold';

const lineHeightXs: LineHeightProperty<string> = px(12);
const lineHeightSm: LineHeightProperty<string> = px(16);
const lineHeightMd: LineHeightProperty<string> = px(20);
const lineHeightLg: LineHeightProperty<string> = px(24);
const lineHeightXl: LineHeightProperty<string> = px(32);

/* Border */
const borderSize: BorderProperty<string> = px(1);
const borderRadius: BorderRadiusProperty<string> = px(4);

/* Card */
const cardRadius: BorderRadiusProperty<string> = px(20);

/* Icons */
const iconSize: WidthProperty<string> | HeightProperty<string> = px(24);

/* Button */
const buttonRadiusSm: BorderRadiusProperty<string> = px(16);
const buttonRadiusLg: BorderRadiusProperty<string> = px(24);

const buttonHeightSm: HeightProperty<string> = px(32);
const buttonHeightLg: HeightProperty<string> = px(48);

declare module '@material-ui/core/styles/createMuiTheme' {
  // tslint:disable-next-line:interface-name
  interface Theme {
    color: {
      gray: ColorProperty;
      orange: ColorProperty;
      red: ColorProperty;
      gradientPurple: ColorProperty;
    };
    padding: {
      halfUnit: PaddingProperty<string> | MarginProperty<string>;
      unit: PaddingProperty<string> | MarginProperty<string>;
      xs: PaddingProperty<string> | MarginProperty<string>;
      sm: PaddingProperty<string> | MarginProperty<string>;
      md: PaddingProperty<string> | MarginProperty<string>;
      lg: PaddingProperty<string> | MarginProperty<string>;
      xl: PaddingProperty<string> | MarginProperty<string>;
      custom(multiplier: number): PaddingProperty<string> | MarginProperty<string>;
    };
    font: {
      xs: FontSizeProperty<string>;
      sm: FontSizeProperty<string>;
      md: FontSizeProperty<string>;
      lg: FontSizeProperty<string>;
      xl: FontSizeProperty<string>;
    };
    fontWeight: {
      bold: FontWeightProperty;
    };
    lineHeight: {
      xs: LineHeightProperty<string>;
      sm: LineHeightProperty<string>;
      md: LineHeightProperty<string>;
      lg: LineHeightProperty<string>;
      xl: LineHeightProperty<string>;
    };
    border: {
      root: BorderProperty<string>;
      radius: BorderRadiusProperty<string>;
    };
    card: {
      radius: BorderRadiusProperty<string>;
      background: ColorProperty;
      border: BorderProperty<string>;
    };
    icon: {
      size: WidthProperty<string> | HeightProperty<string>;
    };
    button: {
      sm: {
        height: HeightProperty<string>;
        radius: BorderRadiusProperty<string>;
      };
      lg: {
        height: HeightProperty<string>;
        radius: BorderRadiusProperty<string>;
      };
    };
  }
  // allow configuration using `createMuiTheme`
  // tslint:disable-next-line:interface-name
  interface ThemeOptions {
    color?: {
      gray?: ColorProperty;
      orange?: ColorProperty;
      red?: ColorProperty;
      gradientPurple?: ColorProperty;
    };
    padding?: {
      halfUnit?: PaddingProperty<string> | MarginProperty<string>;
      unit?: PaddingProperty<string> | MarginProperty<string>;
      xs?: PaddingProperty<string> | MarginProperty<string>;
      sm?: PaddingProperty<string> | MarginProperty<string>;
      md?: PaddingProperty<string> | MarginProperty<string>;
      lg?: PaddingProperty<string> | MarginProperty<string>;
      xl?: PaddingProperty<string> | MarginProperty<string>;
      custom?(multiplier: number): PaddingProperty<string> | MarginProperty<string>;
    };
    font?: {
      xs?: FontSizeProperty<string>;
      sm?: FontSizeProperty<string>;
      md?: FontSizeProperty<string>;
      lg?: FontSizeProperty<string>;
      xl?: FontSizeProperty<string>;
    };
    fontWeight?: {
      bold?: FontWeightProperty;
    };
    lineHeight?: {
      xs?: LineHeightProperty<string>;
      sm?: LineHeightProperty<string>;
      md?: LineHeightProperty<string>;
      lg?: LineHeightProperty<string>;
      xl?: LineHeightProperty<string>;
    };
    border?: {
      root?: BorderProperty<string>;
      radius?: BorderRadiusProperty<string>;
    };
    card?: {
      radius?: BorderRadiusProperty<string>;
      background?: ColorProperty;
      border?: BorderProperty<string>;
    };
    icon?: {
      size?: WidthProperty<string> | HeightProperty<string>;
    };
    button?: {
      sm?: {
        height?: HeightProperty<string>;
        radius?: BorderRadiusProperty<string>;
      };
      lg?: {
        height?: HeightProperty<string>;
        radius?: BorderRadiusProperty<string>;
      };
    };
  }
}

interface IModeColors {
  primaryColor: ColorProperty;
  primaryColorDark: ColorProperty;
  primaryColorLight: ColorProperty;
  secondaryColor: ColorProperty;
  secondaryColorLight: ColorProperty;
  secondaryColorDark: ColorProperty;
  secondaryContrastText: ColorProperty;
  backgroundDefault: ColorProperty;
  textColorPrimary: ColorProperty;
  textColorSecondary: ColorProperty;
  borderColor: BorderColorProperty;
  dividerColor: ColorProperty;
  cardBackground: ColorProperty;
  cardBorder: BorderProperty<string>;
  gradientPurple: ColorProperty;
}

const lightColors: IModeColors = {
  primaryColor: '#4D154D',
  primaryColorDark: '#4D154D',
  primaryColorLight: '#82307F',
  secondaryColor: colorWhite,
  secondaryColorLight: colorWhite,
  secondaryColorDark: colorWhite,
  secondaryContrastText: '#4D154D',
  backgroundDefault: colorWhite,
  textColorPrimary: 'rgba(0, 0, 0, 0.8)',
  textColorSecondary: 'rgba(0, 0, 0, 0.5)',
  borderColor: '#CCCCCC',
  dividerColor: '#CCCCCC',
  cardBackground: '#F5F1F8',
  cardBorder: '1px solid #E4DCEA',
  gradientPurple: 'linear-gradient(300.29deg, #82307F -9.7%, #4D154D 85.28%)',
};

const darkColors: IModeColors = {
  primaryColor: '#A569D4',
  primaryColorDark: '#7B3FA8',
  primaryColorLight: '#C08FE0',
  secondaryColor: '#A569D4',
  secondaryColorLight: '#C08FE0',
  secondaryColorDark: '#7B3FA8',
  secondaryContrastText: colorWhite,
  backgroundDefault: '#0D0D0D',
  textColorPrimary: colorWhite,
  textColorSecondary: '#9E9E9E',
  borderColor: '#A569D4',
  dividerColor: '#A569D4',
  cardBackground: '#241726',
  cardBorder: '1px solid transparent',
  gradientPurple: 'linear-gradient(300.29deg, #4a2350 -9.7%, #241726 85.28%)',
};

const buildTheme = (mode: 'light' | 'dark') => {
  const colors = mode === 'dark' ? darkColors : lightColors;

  return createMuiTheme({
    /* Material color overrides */
    palette: {
      type: mode,
      primary: {
        light: colors.primaryColorLight,
        main: colors.primaryColor,
        dark: colors.primaryColorDark,
        contrastText: colorWhite,
      },
      secondary: {
        light: colors.secondaryColorLight,
        main: colors.secondaryColor,
        dark: colors.secondaryColorDark,
        contrastText: colors.secondaryContrastText,
      },
      background: {
        default: colors.backgroundDefault,
      },
      text: {
        primary: colors.textColorPrimary,
        secondary: colors.textColorSecondary,
        hint: colors.textColorSecondary,
      },
      divider: colors.dividerColor,
    },

    /* Material font overrides */
    typography: {
      fontFamily: fontMontserrat,
      fontSize: 14,
    },

    /* Material component overrides */
    overrides: {
      MuiCardContent: {
        root: {
          padding: '0px !important',
        },
      },
      MuiButton: {
        root: {
          padding: spacingXs,
          fontWeight: fontWeightBold,
          borderRadius: buttonRadiusSm,
        },
      },
      MuiInput: {
        root: {
          fontFamily: fontMontserrat,
          fontSize: fontSizeMd,
        },
      },
      MuiSelect: {
        select: {
          padding: 0,
        },
      },
      MuiTab: {
        root: {
          padding: 0,
        },
      },
    },

    /* User-defined variables */
    color: {
      gray: colorGray,
      orange: colorOrange,
      red: colorRed,
      gradientPurple: colors.gradientPurple,
    },
    padding: {
      halfUnit: spacingHalfUnit,
      unit: spacingUnit,
      xs: spacingXs,
      sm: spacingSm,
      md: spacingMd,
      lg: spacingLg,
      xl: spacingXl,
      custom: (multiplier: number) => px(spacingMultiplier * multiplier),
    },
    font: {
      xs: fontSizeXs,
      sm: fontSizeSm,
      md: fontSizeMd,
      lg: fontSizeLg,
      xl: fontSizeXl,
    },
    fontWeight: {
      bold: fontWeightBold,
    },
    lineHeight: {
      xs: lineHeightXs,
      sm: lineHeightSm,
      md: lineHeightMd,
      lg: lineHeightLg,
      xl: lineHeightXl,
    },
    border: {
      root: `${colors.borderColor} solid ${borderSize}`,
      radius: borderRadius,
    },
    card: {
      radius: cardRadius,
      background: colors.cardBackground,
      border: colors.cardBorder,
    },
    icon: {
      size: iconSize,
    },
    button: {
      sm: {
        height: buttonHeightSm,
        radius: buttonRadiusSm,
      },
      lg: {
        height: buttonHeightLg,
        radius: buttonRadiusLg,
      },
    },
  });
};

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
