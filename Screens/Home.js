import { View, Text } from 'react-native'
import React from 'react'
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs'
import ListUsers from './Home/ListUsers';
import Setting from './Home/Setting';
import Forums from './Home/Forums';
const Tab=createMaterialBottomTabNavigator();
export default function Home(props) {
  const currentUserId = props.route.params.currentUserId;
  return (
    <Tab.Navigator>
        <Tab.Screen name="Users" component={ListUsers} initialParams={{ currentUserId }}></Tab.Screen>
        <Tab.Screen name="Setting" component={Setting} initialParams={{ currentUserId }}></Tab.Screen>
    </Tab.Navigator>
  )
}