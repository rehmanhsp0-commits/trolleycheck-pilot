import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../constants/theme';

type Props = {
  fullScreen?: boolean;
  color?: string;
};

export function LoadingSpinner({ fullScreen = false, color = theme.primary }: Props) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }
  return <ActivityIndicator size="small" color={color} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
});
