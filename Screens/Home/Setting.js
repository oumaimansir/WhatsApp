import React, { useState, useEffect } from "react";
import {
  Button,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  View,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import firebase from '../../Config';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../Config';
import { Ionicons } from "@expo/vector-icons";

const auth = firebase.auth();
const database = firebase.database();
const ref_database = database.ref();
const ref_listComptes = ref_database.child("ListComptes");

export default function Setting(props) {
  const currentUserId = props.route.params.currentUserId;
  const ref_uncompte = ref_listComptes.child(currentUserId);
  const [pseudo, setPseudo] = useState("");
  const [numero, setNumero] = useState("");
  const [email, setEmail] = useState("");
  const [uriImage, seturiImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch personal data
  useEffect(() => {
    const onValueChange = ref_uncompte.on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPseudo(data.pseudo || "");
        setEmail(data.email || "");
        setNumero(data.numero || "");
        seturiImage(data.urlimage || null);
        setImageHistory(data.images || []);
      }
    });

    return () => {
      ref_uncompte.off("value", onValueChange);
    };
  }, []);

  //  permission
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need gallery permissions to make this work!');
      }
    })();
  }, []);

  async function uploadImage(file) {
    if (!file || !file.startsWith('file://')) {
      console.log('Invalid or no file provided for upload:', file);
      return null;
    }

    setLoadingImage(true);
    try {
      console.log('Uploading image:', file);
      const fileExt = file.split(".").pop().toLowerCase();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `image/${fileName}`;

      const fileInfo = await FileSystem.readAsStringAsync(file, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('File read as Base64, length:', fileInfo.length);

      const arrayBuffer = decode(fileInfo);
      console.log('ArrayBuffer size:', arrayBuffer.byteLength);

      const { error: uploadError } = await supabase.storage
        .from("image")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError.message);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData, error: publicUrlError } = supabase.storage
        .from("image")
        .getPublicUrl(filePath);

      if (publicUrlError) {
        console.error('Public URL error:', publicUrlError.message);
        throw new Error(`Failed to get public URL: ${publicUrlError.message}`);
      }

      const imageUrl = publicUrlData.publicUrl;
      console.log('Uploaded image URL:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Upload error:', error.message);
      throw error;
    } finally {
      setLoadingImage(false);
    }
  }

  const pickImage = async () => {
    setLoadingImage(true);
    try {
      console.log('ImagePicker MediaTypeOptions:', ImagePicker.MediaTypeOptions);
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      console.log('ImagePicker result:', result);

      if (!result.canceled) {
        seturiImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('ImagePicker error:', error.message);
    } finally {
      setLoadingImage(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/back.jpg")}
      style={styles.container}
    >
    
      <TouchableHighlight
        onPress={pickImage}
        style={styles.imageContainer}
        underlayColor="#ab47bc33"
      >
        {loadingImage ? (
          <ActivityIndicator size="large" color="#8e24aa" />
        ) : (
          <Image
            source={
              uriImage ? { uri: uriImage } : require("../../assets/profile.png")
            }
            style={styles.profileImage}
          />
        )}
      </TouchableHighlight>

      <TouchableHighlight
        onPress={() => setModalVisible(true)}
        style={styles.myImagesButton}
        underlayColor="#ab47bc33"
      >
        <Text style={styles.myImagesButtonText}>My Images</Text>
      </TouchableHighlight>

      <TextInput
        onChangeText={(ch) => setPseudo(ch)}
        style={styles.input}
        placeholderTextColor="#888"
        placeholder="Enter pseudo"
        value={pseudo}
      />
      <TextInput
        onChangeText={(ch) => setEmail(ch)}
        style={styles.input}
        placeholderTextColor="#888"
        placeholder="Enter email"
        value={email}
      />
      <TextInput
        onChangeText={(ch) => setNumero(ch)}
        style={styles.input}
        placeholderTextColor="#888"
        placeholder="Enter phone number"
        value={numero}
        keyboardType="phone-pad"
      />

      <View style={styles.buttonContainer}>
        <TouchableHighlight
          onPress={() => {
            auth.signOut().then(() => {
              ref_uncompte.update({ connected: false });
              props.navigation.replace("Auth");
            });
          }}
          style={styles.actionButton}
          underlayColor="#ab47bc33"
        >
          <Text style={styles.actionButtonText}>Disconnect</Text>
        </TouchableHighlight>
        <TouchableHighlight
          onPress={async () => {
            try {
              let linkimage = null;
              if (uriImage) {
                linkimage = await uploadImage(uriImage);
                if (!linkimage) {
                  throw new Error('Image upload failed');
                }
              }
              if (pseudo.length()>3){
              const updateData = {
                id: currentUserId,
                pseudo,
                email,
                numero,
              };
              alert("Données sauvegarder");

              }else{
                alert("Données non sauvegarder ");
              }
              if (linkimage) {
                updateData.urlimage = linkimage;
                ref_uncompte.once("value", (snapshot) => {
                  const currentData = snapshot.val() || {};
                  const previousImages = currentData.images || [];
                  updateData.images = [...previousImages, linkimage];
                  ref_uncompte.update(updateData);
                });
              } else {
                ref_uncompte.update(updateData);
              }
              alert("Done");
            } catch (error) {
              console.error('Submit error:', error.message);
              alert(`Error: ${error.message}`);
            }
          }}
          style={styles.actionButton}
          underlayColor="#ab47bc33"
        >
          <Text style={styles.actionButtonText}>Submit</Text>
        </TouchableHighlight>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📷 My Images</Text>
            <TouchableHighlight
              onPress={() => setModalVisible(false)}
              underlayColor="#ab47bc33"
            >
              <Ionicons name="close" size={28} color="#8e24aa" />
            </TouchableHighlight>
          </View>
          <FlatList
            data={imageHistory}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            columnWrapperStyle={styles.imageRow}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableHighlight
                style={styles.imageThumbnailContainer}
                underlayColor="#ab47bc33"
              >
                <Image
                  source={{ uri: item }}
                  style={styles.imageThumbnail}
                  resizeMode="cover"
                />
              </TouchableHighlight>
            )}
          />
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
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
  imageContainer: {
    marginBottom: 20,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#8e24aa',
    overflow: 'hidden',
  },
  profileImage: {
    width: 150,
    height: 150,
    backgroundColor: '#ccc',
    borderRadius: 75,
  },
  myImagesButton: {
    backgroundColor: '#8e24aa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  myImagesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  input: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: '#8e24aa',
    height: 50,
    width: '90%',
    padding: 10,
    marginBottom: 15,
    borderRadius: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#8e24aa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8e24aa',
  },
  imageRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  imageThumbnailContainer: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
});