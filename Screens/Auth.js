
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { BackHandler, ImageBackground, StyleSheet, Text, TextInput, TouchableHighlight, View } from 'react-native';
import firebase from '../Config';

const auth = firebase.auth();
const database = firebase.database();
const ref_database = database.ref();
const ref_listComptes = ref_database.child("ListComptes");

export default function Auth(props) {
  const [email, setemail] = useState('');
  const [password, setpassword] = useState('');

  return (
    <ImageBackground
      source={require("../assets/back.jpg")}
      style={styles.container}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <TextInput
          onChangeText={(ch) => setemail(ch)}
          style={styles.input}
          placeholderTextColor="#888"
          placeholder="email@gmail.com"
          value={email}
          keyboardType="email-address"
        />
        <TextInput
          onChangeText={(ch) => setpassword(ch)}
          style={styles.input}
          placeholderTextColor="#888"
          placeholder="Password"
          value={password}
          secureTextEntry
        />
        <View style={styles.buttonContainer}>
          <TouchableHighlight
            onPress={() => {
              auth
                .signInWithEmailAndPassword(email, password)
                .then(() => {
                  const currentUserId = auth.currentUser.uid;
                  const ref_uncompte = ref_listComptes.child(currentUserId);
                  ref_uncompte.update({
                    id: currentUserId,
                    connected: true,
                  });
                  props.navigation.replace("Home", { currentUserId });
                })
                .catch((err) => alert(err.message));
            }}
            style={styles.actionButton}
            underlayColor="#ab47bc33"
          >
            <Text style={styles.actionButtonText}>Connect</Text>
          </TouchableHighlight>
          <TouchableHighlight
            onPress={() => BackHandler.exitApp()}
            style={styles.actionButton}
            underlayColor="#ab47bc33"
          >
            <Text style={styles.actionButtonText}>Exit</Text>
          </TouchableHighlight>
        </View>
        <Text
          onPress={() => props.navigation.navigate("NewAccount")}
          style={styles.linkText}
        >
          Don't have an account?
        </Text>
      </View>
      <StatusBar style="light" />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    width: '98%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0004',
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#0004',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: '#8e24aa',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#8e24aa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    width: '100%',
    fontStyle: 'italic',
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 15,
    color: '#8e24aa',
    fontSize: 16,
  },
});