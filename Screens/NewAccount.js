
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, TextInput, TouchableHighlight, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import firebase from '../Config';

const auth = firebase.auth();
const database = firebase.database();
const ref_database = database.ref();
const ref_listComptes = ref_database.child("ListComptes");

export default function NewAccount(props) {
  const [email, setemail] = useState('');
  const [password, setpassword] = useState('');
  const [confirmpassword, setconfirmpassword] = useState('');

  return (
    <ImageBackground
      source={require("../assets/back.jpg")}
      style={styles.container}
    >
     
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create New Account</Text>
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
        <TextInput
          onChangeText={(ch) => setconfirmpassword(ch)}
          style={styles.input}
          placeholderTextColor="#888"
          placeholder="Confirm Password"
          value={confirmpassword}
          secureTextEntry
        />
        <View style={styles.buttonContainer}>
          <TouchableHighlight
            onPress={() => {
              if (password === confirmpassword) {
                auth.createUserWithEmailAndPassword(email, password)
                  .then(() => {
                    const currentUserId = auth.currentUser.uid;
                    const ref_uncompte = ref_listComptes.child(currentUserId);
                    ref_uncompte.set({
                      id: currentUserId,
                      connected: true,
                    });
                    props.navigation.replace("Setting", { currentUserId });
                  })
                  .catch((err) => alert(err.message));
              } else {
                alert("Please verify the password");
              }
            }}
            style={styles.actionButton}
            underlayColor="#ab47bc33"
          >
            <Text style={styles.actionButtonText}>Create</Text>
          </TouchableHighlight>
          <TouchableHighlight
            onPress={() => props.navigation.goBack()}
            style={styles.actionButton}
            underlayColor="#ab47bc33"
          >
            <Text style={styles.actionButtonText}>Back</Text>
          </TouchableHighlight>
        </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 20,
  },
  topBarText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
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
});