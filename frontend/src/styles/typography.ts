export const typography = {
  fontFamilyRegular: 'Montserrat-Regular',
  fontFamilyBold: 'Montserrat-Bold',
  fontFamilyExtraBold: 'Montserrat-ExtraBold',
  headingXXL: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 64,
    letterSpacing: -1.5,
    lineHeight: 68,
  },
  headingSubtitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    lineHeight: 26,
  },
  bodyLarge: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
};

export type TypographyToken = keyof typeof typography;
