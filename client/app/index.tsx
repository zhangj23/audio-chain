import { Redirect } from 'expo-router';

export default function Index() {
  const skip = String(process.env.EXPO_PUBLIC_SKIP_AUTH || '').toLowerCase() === 'true';
  return <Redirect href={skip ? '/(tabs)' : '/auth'} />;
}


