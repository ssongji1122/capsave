import React, { forwardRef } from 'react';
import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';

/** Use the bundled UI family while retaining platform text scaling and accessibility. */
export const Text = forwardRef<NativeText, TextProps>(function ScraveText({ style, ...props }, ref) {
  const weight = Number(StyleSheet.flatten(style)?.fontWeight ?? 400);
  const fontFamily = weight >= 600 ? 'SUIT-SemiBold' : weight >= 500 ? 'SUIT-Medium' : 'SUIT-Regular';
  return <NativeText ref={ref} {...props} style={[{ fontFamily }, style]} />;
});
