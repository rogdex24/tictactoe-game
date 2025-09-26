export const typography = {
  fontFamilyRegular: 'Montserrat-Regular',
  fontFamilyBold: 'Montserrat-Bold',
  fontFamilyExtraBold: 'Montserrat-ExtraBold',
  displayHero: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: 0.5,
  },
  headingPrimary: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0.5,
  },
  bodyPrimary: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  buttonPrimary: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.75,
  },
};

export type TypographyToken = keyof typeof typography;
