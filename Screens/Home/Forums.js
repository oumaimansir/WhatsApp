
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import firebase from '../../Config';
import * as Location from 'expo-location';
import { pickImage, pickFile, uploadToSupabase } from '.././Utils/MediaUtils';
import ImageListModal from '.././Modals/ImageListModal';
import FileListModal from '.././Modals/FileListModal';

const database = firebase.database();
const ref_database = database.ref();
const ref_listComptes = ref_database.child('ListComptes');
const ref_listGroups = ref_database.child('ListGroups');
const EMOJIS = ['😊', '👍', '❤️', '😂', '😢', '😮'];

export default function Forums(props) {
  const currentid = props.route.params.currentid;
  const groupId = props.route.params.groupId;
  const groupName = props.route.params.groupName;
  const ref_group = ref_listGroups.child(groupId);
  const ref_Messages = ref_group.child('Messages');
  const ref_istyping = ref_group.child(currentid + 'isTyping');

  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState({});
  const [messages, setMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [imageListVisible, setImageListVisible] = useState(false);
  const [fileListVisible, setFileListVisible] = useState(false);
  const [uploadMenuVisible, setUploadMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [users, setUsers] = useState({});

  useEffect(() => {
    ref_listComptes.on('value', (snapshot) => {
      const userData = {};
      snapshot.forEach((user) => {
        userData[user.val().id] = user.val();
      });
      setUsers(userData);
    });
    return () => {
      ref_listComptes.off();
    };
  }, []);
  //istyping
  useEffect(() => {
    ref_group.on('value', (snapshot) => {
      const groupData = snapshot.val();
      if (groupData) {
        const typingStatus = {};
        Object.keys(groupData.members || {}).forEach((userId) => {
          typingStatus[userId] = groupData[userId + 'isTyping'] || false;
        });
        setIsTyping(typingStatus);
      }
    });
    return () => {
      ref_group.off();
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

  const sendMessage = () => {
    if (!message.trim()) return;
    const key = ref_Messages.push().key;
    const ref_unmsg = ref_Messages.child(key);
    ref_unmsg.set({
      body: message,
      time: new Date().toLocaleString(),
      sender: currentid,
      replyTo: replyingTo?.messageId || null,
      reactions: {},
      isEdited: false,
      type: 'text',
    });
    ref_istyping.set(false);
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
        type: 'location',
      });
      ref_istyping.set(false);
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
    const senderName = users[item.sender]?.pseudo || 'Unknown';
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
          <Text style={styles.senderName}>{senderName}</Text>
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
              style={styles.fileContainer}
            >
              <Ionicons name="document-text-outline" size={20} color="#8e24aa" />
              <Text style={styles.fileText}>
                📄 {item.fileName || 'Fichier'}
              </Text>
            </TouchableOpacity>
          ) : item.type === 'location' ? (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={20} color="#8e24aa" style={{ marginRight: 8 }} />
              <TouchableOpacity onPress={() => Linking.openURL(item.body)}>
                <Text style={styles.locationText}>
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

  // Typing  text
  const typingUsers = Object.keys(isTyping).filter(id => isTyping[id] && id !== currentid);
  const typingText = typingUsers.length > 0
    ? typingUsers.length > 2
      ? 'Multiple users are typing...'
      : typingUsers.map(id => users[id]?.pseudo || 'Unknown').join(' and ') + ' typing...'
    : null;

  return (
    <ImageBackground source={require('../../assets/back.jpg')} style={styles.background} resizeMode="cover">
      
      <LinearGradient
        colors={['#6a1b9a', '#ab47bc']}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => props.navigation.goBack()} style={{ marginRight: 10 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Ionicons name="people" size={40} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.topBarText}>{groupName}</Text>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={{ padding: 5 }}>
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {menuVisible && (
        <View style={styles.topBarMenu}>
          <TouchableHighlight
            onPress={() => {
              setMenuVisible(false);
              setImageListVisible(true);
            }}
            style={styles.menuItem}
            underlayColor="#ab47bc33"
          >
            <Text style={styles.menuText}>View Images</Text>
          </TouchableHighlight>
          <TouchableHighlight
            onPress={() => {
              setMenuVisible(false);
              setFileListVisible(true);
            }}
            style={styles.menuItem}
            underlayColor="#ab47bc33"
          >
            <Text style={styles.menuText}>View Files</Text>
          </TouchableHighlight>
        </View>
      )}

      {typingText && <Text style={styles.typingIndicator}>{typingText}</Text>}

      {replyingTo && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyText}>Replying to: {replyingTo.body}</Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={20} color="white" />
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
              placeholderTextColor="#888"
              autoFocus
            />
          ) : (
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                ref_istyping.set(!!text);
              }}
              placeholder="Type a message"
              placeholderTextColor="#888"
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
              color="white"
            />
          </TouchableOpacity>
          {!editingMessage && (
            <>
              <TouchableOpacity
                style={styles.emojiButton}
                activeOpacity={0.7}
                onPress={() => setShowEmojiPicker(true)}
              >
                <Ionicons name="happy-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachButton}
                activeOpacity={0.7}
                onPress={() => setUploadMenuVisible(!uploadMenuVisible)}
              >
                <Ionicons name="attach" size={24} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {uploadMenuVisible && (
          <View style={styles.uploadMenu}>
            <TouchableHighlight
              onPress={sendImage}
              style={styles.uploadMenuItem}
              underlayColor="#ab47bc33"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="image" size={20} color="#8e24aa" />
                <Text style={styles.uploadMenuText}>Send Image</Text>
              </View>
            </TouchableHighlight>
            <TouchableHighlight
              onPress={sendFile}
              style={styles.uploadMenuItem}
              underlayColor="#ab47bc33"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document" size={20} color="#8e24aa" />
                <Text style={styles.uploadMenuText}>Send File</Text>
              </View>
            </TouchableHighlight>
            <TouchableHighlight
              onPress={sendLocation}
              style={styles.uploadMenuItem}
              underlayColor="#ab47bc33"
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
        <View style={styles.imagePreviewModal}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 20 }}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="white" />
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
    paddingVertical: 15,
    paddingHorizontal: 20,
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
  },
  topBarMenu: {
    position: 'absolute',
    top: 70,
    right: 20,
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
    paddingHorizontal: 10,
  },
  menuText: {
    fontSize: 16,
    color: '#8e24aa',
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
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8e24aa',
    marginBottom: 5,
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
    color: '#bbdefb',
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
    borderColor: '#8e24aa',
    alignSelf: 'flex-start',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  fileText: {
    marginLeft: 8,
    color: '#8e24aa',
    textDecorationLine: 'underline',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    maxWidth: 250,
  },
  locationText: {
    color: '#8e24aa',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
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
    margin: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 10,
    alignSelf: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  replyText: {
    color: '#fff',
    fontSize: 14,
  },
  replyReference: {
    fontSize: 12,
    color: '#8e24aa',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: 150,
  },
  contextMenuItem: {
    padding: 15,
    fontSize: 16,
    color: '#8e24aa',
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
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emoji: {
    fontSize: 30,
    margin: 10,
  },
  uploadMenu: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 10,
  },
  uploadMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  uploadMenuText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#8e24aa',
  },
  imagePreviewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});