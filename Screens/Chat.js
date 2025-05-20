
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ImageBackground,
  Modal,
  TouchableHighlight,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import firebase from '../Config';
import * as Location from 'expo-location';
import { pickImage, pickFile, uploadToSupabase } from './Utils/MediaUtils';
import ImageListModal from './Modals/ImageListModal';
import FileListModal from './Modals/FileListModal';

const database = firebase.database();
const ref_database = database.ref();
const ref_lesdiscussions = ref_database.child('Listes_discussion');
const ref_users = ref_database.child('ListUsers');
const EMOJIS = ['😊', '👍', '❤️', '😂', '😢', '😮'];

export default function Chat(props) {
  const currentid = props.route.params.currentid;
  const secondid = props.route.params.secondid;
  const secondphoto = props.route.params.secondphoto;
  const secondpseudo = props.route.params.secondpseudo;
  const phone = props.route.params.phoneNumber;
  const idDesc = currentid > secondid ? currentid + secondid : secondid + currentid;
  const ref_unediscussion = ref_lesdiscussions.child(idDesc);
  const ref_Messages = ref_unediscussion.child('Messages');
  const ref_istyping = ref_unediscussion.child(secondid + 'isTyping');
  const ref_backgroundImageUrl = ref_unediscussion.child('backgroundImage');

  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [secondUserName, setSecondUserName] = useState('User');
  const [isConnected, setIsConnected] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageListVisible, setImageListVisible] = useState(false);
  const [fileListVisible, setFileListVisible] = useState(false);
  const [uploadMenuVisible, setUploadMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  useEffect(() => {
      ref_backgroundImageUrl.on('value', (snapshot) => {
        const data = snapshot.val();
        if (snapshot.hasChild("fils")) {
        setImageBackground();
      }
      });
      return () => {
        ref_backgroundImageUrl.off();
      };
    }, []);
  useEffect(() => {
    ref_users.child(secondid).on('value', (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        setSecondUserName(userData.nom || 'User');
        setIsConnected(userData.connected || false);
      }
    });
    return () => {
      ref_users.child(secondid).off();
    };
  }, [secondid]);

  useEffect(() => {
    ref_istyping.on('value', (snapshot) => {
      setIsTyping(snapshot.val());
    });
    return () => {
      ref_istyping.off();
    };
  }, []);

  useEffect(() => {
    ref_Messages.on('value', (snapshot) => {
      const d = [];
      snapshot.forEach((un_msg) => {
        d.push({ id: un_msg.key, ...un_msg.val() });
      });
      setMessages(d);
    });
    return () => {
      ref_Messages.off();
    };
  }, []);
  const setImageBackground = async () => {
    const uri = await pickImage();
    if (!uri) return;
    const imageUrl = await uploadToSupabase(uri, 'imagesBackground');
    if (imageUrl) {
      const key = ref_backgroundImageUrl.push().key;
      ref_backgroundImageUrl.child(key).set({
        imageUrl,
        type: 'image',
      });
    }
  };
  const sendMessage = () => {
    if (!message.trim()) return;
    const key = ref_Messages.push().key;
    const ref_unmsg = ref_Messages.child(key);
    ref_unmsg.set({
      body: message,
      time: new Date().toLocaleString(),
      sender: currentid,
      receiver: secondid,
      replyTo: replyingTo?.messageId || null,
      reactions: {},
      isEdited: false,
      type: 'text',
    });
    ref_unediscussion.child(currentid + 'isTyping').set(false);
    setMessage('');
    setReplyingTo(null);
  };

  const sendLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;
      const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

      const key = ref_Messages.push().key;
      ref_Messages.child(key).set({
        body: locationUrl,
        time: new Date().toLocaleString(),
        sender: currentid,
        receiver: secondid,
        type: 'location',
      });
      ref_unediscussion.child(currentid + 'isTyping').set(false);
    } catch (error) {
      console.error(error);
      alert('Error getting location');
    }
    setUploadMenuVisible(false);
  };

  const sendImage = async () => {
    const uri = await pickImage();
    if (!uri) return;
    const imageUrl = await uploadToSupabase(uri, 'lesimages');
    if (imageUrl) {
      const key = ref_Messages.push().key;
      ref_Messages.child(key).set({
        imageUrl,
        time: new Date().toLocaleString(),
        sender: currentid,
        receiver: secondid,
        type: 'image',
      });
    }
    setUploadMenuVisible(false);
  };

  const sendFile = async () => {
    console.log('Starting sendFile...');
    const file = await pickFile();
    console.log('Picked file:', file);

    if (file && file.uri) {
      console.log('Uploading file:', file.name, file.uri);
      const fileUrl = await uploadToSupabase(file.uri, 'lesfichiers');
      console.log('Upload result:', fileUrl);

      if (fileUrl) {
        const message = {
          fileUrl,
          fileName: file.name,
          sender: currentid,
          receiver: secondid,
          time: new Date().toLocaleString(),
          type: 'file',
        };
        console.log('Sending file message:', message);

        try {
          await ref_Messages.push(message);
          console.log('File message sent to Firebase');
          setUploadMenuVisible(false);
        } catch (error) {
          console.error('Firebase write error:', error.message);
        }
      } else {
        console.log('File upload failed, no URL returned');
      }
    } else {
      console.log('No file selected or picker canceled');
    }
  };

  const deleteMessage = (messageId) => {
    ref_Messages.child(messageId).remove().catch((err) => alert('Error deleting message: ' + err.message));
    setContextMenu(null);
  };

  const updateMessage = (messageId, newBody) => {
    ref_Messages
      .child(messageId)
      .update({
        body: newBody,
        isEdited: true,
        time: new Date().toLocaleString(),
      })
      .catch((err) => alert('Error updating message: ' + err.message));
    setEditingMessage(null);
  };

  const toggleEmojiReaction = (messageId, emoji) => {
    if (!messageId) {
      alert('Error: No message selected for reaction');
      setShowEmojiPicker(false);
      setContextMenu(null);
      return;
    }
    const reactionRef = ref_Messages.child(messageId).child('reactions').child(currentid);
    reactionRef.once('value', (snapshot) => {
      const currentReaction = snapshot.val();
      if (currentReaction === emoji) {
        reactionRef.remove().catch((err) => alert('Error removing reaction: ' + err.message));
      } else {
        reactionRef.set(emoji).catch((err) => alert('Error adding reaction: ' + err.message));
      }
    });
    setShowEmojiPicker(false);
    setContextMenu(null);
  };

 const MessageItem = ({ item }) => {
  const isSender = item.sender === currentid;
  return (
    <TouchableOpacity
      onLongPress={(e) => {
        setContextMenu({
          messageId: item.id,
          x: e.nativeEvent.pageX,
          y: e.nativeEvent.pageY,
          isSender,
          type: item.type,
        });
      }}
      style={[styles.messageContainer, isSender ? styles.senderMessage : styles.receiverMessage]}
    >
      <View style={isSender ? styles.senderMessageInner : styles.receiverMessageInner}>
        {item.replyTo && (
          <Text style={styles.replyReference}>
            {messages.find((m) => m.id === item.replyTo)?.body || 'Original message deleted'}
          </Text>
        )}
        {item.type === 'image' && item.imageUrl ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(item.imageUrl);
              setModalVisible(true);
            }}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: 150, height: 150, borderRadius: 8 }}
            />
          </TouchableOpacity>
        ) : item.type === 'file' && item.fileUrl ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(item.fileUrl)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(240,240,240,0.9)',
              padding: 10,
              borderRadius: 8,
              marginTop: 5,
            }}
          >
            <Ionicons name="document-text-outline" size={20} color="#8e24aa" />
            <Text
              style={{
                marginLeft: 8,
                color: '#8e24aa',
                textDecorationLine: 'underline',
              }}
            >
              📄 {item.fileName || 'Fichier'}
            </Text>
          </TouchableOpacity>
        ) : item.type === 'location' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#e6f0ff',
              padding: 10,
              borderRadius: 8,
              marginTop: 5,
              maxWidth: 250,
            }}
          >
            <Ionicons name="location" size={20} color="#8e24aa" style={{ marginRight: 8 }} />
            <TouchableOpacity onPress={() => Linking.openURL(item.body)}>
              <Text style={{ color: '#8e24aa', textDecorationLine: 'underline', fontWeight: '500' }}>
                View Location on Map
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.messageText, isSender ? styles.senderText : styles.receiverText]}>
            {item.body}
            {item.isEdited && <Text style={styles.editedTag}> (edited)</Text>}
          </Text>
        )}
        {Object.keys(item.reactions || {}).length > 0 && (
          <View style={styles.reactionContainer}>
            {Object.entries(item.reactions).map(([userId, emoji]) => (
              <TouchableOpacity
                key={userId}
                onPress={() => toggleEmojiReaction(item.id, emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={[styles.timeText, isSender ? styles.senderText : styles.receiverText]}>
          {item.time}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
  return (
    <ImageBackground source={require('../assets/back.jpg')} style={styles.background} resizeMode="cover">
      
      <LinearGradient
        colors={['#6a1b9a', '#ab47bc']}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => props.navigation.goBack()} style={{ marginRight: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image
          source={secondphoto ? { uri: secondphoto } : require('../assets/profile.png')}
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
        />
        <Text style={styles.topBarText}>{secondpseudo}</Text>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4caf50' : '#f44336' }]} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ marginHorizontal: 10 }}
            onPress={() => {
              const tel = Platform.OS === 'android' ? `tel:${phone}` : `telprompt:${phone}`;
              Linking.openURL(tel);
            }}
          >
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginHorizontal: 10 }}
            onPress={() => {
              alert('Video call feature coming soon!');
            }}
          >
            <Ionicons name="videocam" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
          style={{ marginHorizontal: 10 }}
            onPress={() => {
              sendImage
            }}
            
          >
            <Ionicons name="image" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {menuVisible && (
        <View style={styles.topBarMenu}>
          <TouchableHighlight
            underlayColor="#ab47bc33"
            onPress={() => {
              setMenuVisible(false);
              setImageListVisible(true);
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuText}>View Images</Text>
          </TouchableHighlight>
          <TouchableHighlight
            underlayColor="#ab47bc33"
            onPress={() => {
              setMenuVisible(false);
              setFileListVisible(true);
            }}
            style={styles.menuItem}
          >
            <Text style={styles.menuText}>View Files</Text>
          </TouchableHighlight>
        </View>
      )}

      {isTyping && <Text style={styles.typingIndicator}>{secondUserName} is typing...</Text>}

      {replyingTo && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyText}>Replying to: {replyingTo.body}</Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        {/* Messages List */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageItem item={item} />}
        />

        <Modal
          visible={!!contextMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setContextMenu(null)}
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setContextMenu(null)}>
            {contextMenu && (
              <View
                style={[
                  styles.contextMenu,
                  {
                    top: contextMenu.y,
                    left: contextMenu.x > 200 ? contextMenu.x - 150 : contextMenu.x,
                  },
                ]}
              >
                {contextMenu.isSender ? (
                  <>
                    <TouchableHighlight
                      underlayColor="#ab47bc33"
                      onPress={() => deleteMessage(contextMenu.messageId)}
                    >
                      <Text style={styles.contextMenuItem}>Delete</Text>
                    </TouchableHighlight>
                    {contextMenu.type !== 'image' && contextMenu.type !== 'file' && contextMenu.type !== 'location' && (
                      <TouchableHighlight
                        underlayColor="#ab47bc33"
                        onPress={() => {
                          const msg = messages.find((m) => m.id === contextMenu.messageId);
                          setEditingMessage({ messageId: msg.id, body: msg.body });
                          setContextMenu(null);
                        }}
                      >
                        <Text style={styles.contextMenuItem}>Edit</Text>
                      </TouchableHighlight>
                    )}
                  </>
                ) : (
                  <>
                    <TouchableHighlight
                      underlayColor="#ab47bc33"
                      onPress={() => {
                        setShowEmojiPicker(true);
                      }}
                    >
                      <Text style={styles.contextMenuItem}>Add Reaction</Text>
                    </TouchableHighlight>
                    <TouchableHighlight
                      underlayColor="#ab47bc33"
                      onPress={() => {
                        const msg = messages.find((m) => m.id === contextMenu.messageId);
                        setReplyingTo({ messageId: msg.id, body: msg.body });
                        setContextMenu(null);
                      }}
                    >
                      <Text style={styles.contextMenuItem}>Reply</Text>
                    </TouchableHighlight>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={showEmojiPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiPicker}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => {
                  if (contextMenu) {
                    toggleEmojiReaction(contextMenu.messageId, emoji);
                  } else {
                    setMessage((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }
                }}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Modal>

        <View style={styles.inputContainer}>
          {editingMessage ? (
            <TextInput
              style={styles.input}
              value={editingMessage.body}
              onChangeText={(text) => setEditingMessage({ ...editingMessage, body: text })}
              placeholder="Edit message"
              autoFocus
            />
          ) : (
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                ref_unediscussion.child(currentid + 'isTyping').set(!!text);
              }}
              placeholder="Type a message"
            />
          )}
          <TouchableOpacity
            style={styles.sendButton}
            activeOpacity={0.7}
            onPress={() => {
              if (editingMessage) {
                updateMessage(editingMessage.messageId, editingMessage.body);
              } else {
                sendMessage();
              }
            }}
          >
            <Ionicons
              name={editingMessage ? 'checkmark' : 'send'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          {!editingMessage && (
            <>
              <TouchableOpacity
                style={styles.emojiButton}
                activeOpacity={0.7}
                onPress={() => setShowEmojiPicker(true)}
              >
                <Ionicons name="happy-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachButton}
                activeOpacity={0.7}
                onPress={() => setUploadMenuVisible(!uploadMenuVisible)}
              >
                <Ionicons name="attach" size={24} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {uploadMenuVisible && (
          <View style={styles.uploadMenu}>
            <TouchableHighlight
              underlayColor="#ab47bc33"
              onPress={sendImage}
              style={styles.uploadMenuItem}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="image" size={20} color="#8e24aa" />
                <Text style={styles.uploadMenuText}>Send Image</Text>
              </View>
            </TouchableHighlight>
            <TouchableHighlight
              underlayColor="#ab47bc33"
              onPress={sendFile}
              style={styles.uploadMenuItem}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document" size={20} color="#8e24aa" />
                <Text style={styles.uploadMenuText}>Send File</Text>
              </View>
            </TouchableHighlight>
            <TouchableHighlight
              underlayColor="#ab47bc33"
              onPress={sendLocation}
              style={styles.uploadMenuItem}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location" size={20} color="#8e24aa" />
                <Text style={styles.uploadMenuText}>Send Location</Text>
              </View>
            </TouchableHighlight>
          </View>
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 20 }}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={{ width: '90%', height: '70%', resizeMode: 'contain' }}
          />
        </View>
      </Modal>

      <ImageListModal
        visible={imageListVisible}
        onClose={() => setImageListVisible(false)}
        messages={messages}
        onImagePress={(imageUrl) => {
          setSelectedImage(imageUrl);
          setModalVisible(true);
        }}
      />
      <FileListModal
        visible={fileListVisible}
        onClose={() => setFileListVisible(false)}
        messages={messages}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  topBarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  topBarMenu: {
    position: 'absolute',
    top: 60,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 20,
  },
  menuItem: {
    paddingVertical: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  messageContainer: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  senderMessage: {
    alignSelf: 'flex-end',
  },
  receiverMessage: {
    alignSelf: 'flex-start',
  },
senderMessageInner: {
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#d3d3d3',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  receiverMessageInner: {
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#eceff1',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  messageText: {
    fontSize: 16,
  },
  senderText: {
    color: '#333',
  },
  receiverText: {
    color: '#333',
  },
  
  timeText: {
    fontSize: 10,
    marginTop: 4,
  },
  editedTag: {
    fontSize: 12,
    color: '#d1c4e9',
    marginLeft: 5,
  },
  reactionContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    marginLeft: 10,
    padding: 12,
    backgroundColor: '#8e24aa',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButton: {
    marginLeft: 10,
    padding: 12,
    backgroundColor: '#8e24aa',
    borderRadius: 25,
  },
  attachButton: {
    marginLeft: 10,
    padding: 12,
    backgroundColor: '#8e24aa',
    borderRadius: 25,
  },
  typingIndicator: {
    color: '#fff',
    fontStyle: 'italic',
    fontSize: 14,
    margin: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  replyText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  replyReference: {
    fontSize: 12,
    color: '#000',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: 150,
  },
  contextMenuItem: {
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    padding: 20,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  emoji: {
    fontSize: 30,
    margin: 10,
  },
  uploadMenu: {
    position: 'absolute',
    bottom: 70,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 10,
  },
  uploadMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  uploadMenuText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#8e24aa',
    fontWeight: '500',
  },
});