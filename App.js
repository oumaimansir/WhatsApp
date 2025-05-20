import { View, Text } from 'react-native'
import React from 'react'
import Auth from './Screens/Auth';
import NewAccount from './Screens/NewAccount';
import { NavigationContainer } from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Home from './Screens/Home';
import Chat from './Screens/Chat';
import Setting from './Screens/Home/Setting';
import Forums from './Screens/Home/Forums';
import SendSms from './Screens/SendSms';
const Stack = createNativeStackNavigator();
export default function App() {
  return <NavigationContainer>
    <Stack.Navigator screenOptions={{headerShown: false }}>
      <Stack.Screen name="Auth" component={Auth}></Stack.Screen>
      <Stack.Screen
      options={{headerShown: true, headerTitle:"back to Auth"}} name="NewAccount" component={NewAccount}></Stack.Screen>
      <Stack.Screen name="Home" component={Home}></Stack.Screen>
      <Stack.Screen name="Chat" component={Chat}></Stack.Screen>
      <Stack.Screen name="Setting" component={Setting}></Stack.Screen>
      <Stack.Screen name="Forums" component={Forums} options={{ title: 'Group Chat' }}></Stack.Screen>
      <Stack.Screen name="SendSms" component={SendSms}></Stack.Screen>
    </Stack.Navigator>
  </NavigationContainer>;

  
}