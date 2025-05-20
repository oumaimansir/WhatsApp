import React from 'react';
import { Modal, View, TouchableOpacity, FlatList, Text, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FileListModal = ({ visible, onClose, messages }) => {
  const fileMessages = messages.filter((msg) => msg.type === 'file');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>📁 Files</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="black" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={fileMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => Linking.openURL(item.fileUrl)}
              style={styles.fileItem}
            >
              <Ionicons name="document" size={24} color="#1a3cc1" />
              <Text style={styles.fileText}>
                {item.fileName || 'Unnamed file'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
};

export default FileListModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  fileText: {
    marginLeft: 10,
    color: '#1a3cc1',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});