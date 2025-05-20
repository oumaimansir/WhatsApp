
import React, { useState, useEffect } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
  Linking,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import firebase from "../../Config";

const database = firebase.database();
const ref_database = database.ref();
const ref_listComptes = ref_database.child("ListComptes");
const ref_listGroups = ref_database.child("ListGroups");

export default function ListUsers(props) {
  const currentUserId = props.route.params.currentUserId;
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState({ pseudo: 'User', urlimage: null });

  // Fetch current user data
  useEffect(() => {
    ref_listComptes.child(currentUserId).on("value", (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        setCurrentUser({
          pseudo: userData.pseudo || 'User',
          urlimage: userData.urlimage || null,
        });
      }
    });

    return () => {
      ref_listComptes.child(currentUserId).off();
    };
  }, [currentUserId]);

  // Fetch users
  useEffect(() => {
    ref_listComptes.on("value", (snapshot) => {
      var d = [];
      snapshot.forEach((un_compte) => {
        if (un_compte.val().id !== currentUserId)
          d.push(un_compte.val());
      });
      setData(d);
      setFilteredData(d);
    });

    return () => {
      ref_listComptes.off();
    };
  }, []);

  // Fetch groups
  useEffect(() => {
    ref_listGroups.on("value", (snapshot) => {
      var g = [];
      snapshot.forEach((group) => {
        g.push({ id: group.key, ...group.val() });
      });
      setGroups(g);
    });

    return () => {
      ref_listGroups.off();
    };
  }, []);

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(user =>
        user.pseudo.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchQuery, data]);

  // Create group
  const createGroup = () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }
    const selectedUserIds = Object.keys(selectedUsers).filter(id => selectedUsers[id]);
    if (selectedUserIds.length === 0) {
      Alert.alert("Error", "Select at least one user");
      return;
    }

    const groupData = {
      name: groupName,
      members: { [currentUserId]: true },
    };
    selectedUserIds.forEach(id => {
      groupData.members[id] = true;
    });

    ref_listGroups.push(groupData)
      .then(() => {
        setModalVisible(false);
        setGroupName('');
        setSelectedUsers({});
        Alert.alert("Success", "Group created!");
      })
      .catch((error) => Alert.alert("Error", "Failed to create group: " + error.message));
  };

  const joinGroup = (groupId) => {
    ref_listGroups.child(groupId).child('members').child(currentUserId).set(true)
      .then(() => Alert.alert("Success", "Joined group!"))
      .catch((error) => Alert.alert("Error", "Failed to join group: " + error.message));
  };

  const quitGroup = (groupId) => {
    ref_listGroups.child(groupId).child('members').child(currentUserId).remove()
      .then(() => Alert.alert("Success", "Left group!"))
      .catch((error) => Alert.alert("Error", "Failed to leave group: " + error.message));
  };

  return (
    <ImageBackground
      source={require("../../assets/back.jpg")}
      style={styles.container}
    >
      <LinearGradient
        colors={['#6a1b9a', '#ab47bc']}
        style={styles.header}
      >
        <Text style={styles.headerText}>WhatsUp</Text>
        <TouchableOpacity style={styles.userProfile}>
          <Image
            source={
              currentUser.urlimage
                ? { uri: currentUser.urlimage }
                : require("../../assets/profile.png")
            }
            style={styles.userImageHeader}
          />
          <Text style={styles.userNameHeader}>{currentUser.pseudo}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.usersHeader}>
        <Text style={styles.sectionTitle}>Users</Text>
      </View>
      <FlatList
        data={filteredData}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <TouchableHighlight
              underlayColor="#ab47bc33"
              onPress={() => {
                props.navigation.navigate("Chat", {
                  currentid: currentUserId,
                  secondid: item.id,
                  secondphoto: item.urlimage || null,
                  secondpseudo: item.pseudo || "User",
                  phoneNumber: item.numero || "",
                });
              }}
            >
              <Image
                source={
                  item.urlimage
                    ? { uri: item.urlimage }
                    : require("../../assets/profile.png")
                }
                style={styles.userImage}
              />
            </TouchableHighlight>
            <Text style={styles.userText}>{item.pseudo}</Text>
            <View style={[styles.statusDot, { backgroundColor: item.connected ? "#4caf50" : "#f44336" }]} />
            <TouchableHighlight
              underlayColor="#ab47bc33"
              onPress={() => {
                const tel = Platform.OS === "android" ? `tel:${item.numero}` : `telprompt:${item.numero}`;
                Linking.openURL(tel);
              }}
            >
              <Ionicons name="call" size={24} color="#8e24aa" />
              
            </TouchableHighlight>
            <TouchableHighlight
              underlayColor="#ab47bc33"
              onPress={() => {
                props.navigation.navigate("SendSms", {
                  phoneNumber: item.numero || "",
                });
                }}
                >
                  
              <Ionicons name="sms" size={24} color="#8e24aa" />
            </TouchableHighlight>
          </View>
        )}
        style={styles.list}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.groupsHeader}>
        <Text style={styles.sectionTitle}>Groups</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.createGroupButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={groups}
        renderItem={({ item }) => {
          const isMember = item.members && item.members[currentUserId];
          return (
            <View style={styles.groupItem}>
              <TouchableHighlight
                underlayColor="#ab47bc33"
                onPress={() => {
                  props.navigation.navigate("Forums", {
                    currentid: currentUserId,
                    groupId: item.id,
                    groupName: item.name,
                  });
                }}
              >
                <View style={styles.groupInfo}>
                  <Ionicons name="people" size={30} color="#8e24aa" style={{ marginRight: 10 }} />
                  <Text style={styles.groupText}>{item.name}</Text>
                </View>
              </TouchableHighlight>
              {isMember ? (
                <TouchableOpacity
                  onPress={() => quitGroup(item.id)}
                  style={[styles.actionButton, { backgroundColor: '#f44336' }]}
                >
                  <Text style={styles.actionText}>Quit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => joinGroup(item.id)}
                  style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
                >
                  <Text style={styles.actionText}>Join</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        style={styles.list}
        keyExtractor={(item) => item.id}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Group Name"
              placeholderTextColor="#888"
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={styles.modalSubtitle}>Select Members</Text>
            <FlatList
              data={data}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberItem}
                  onPress={() => {
                    setSelectedUsers({
                      ...selectedUsers,
                      [item.id]: !selectedUsers[item.id],
                    });
                  }}
                >
                  <Text style={styles.memberText}>{item.pseudo}</Text>
                  <Ionicons
                    name={selectedUsers[item.id] ? "checkbox" : "square-outline"}
                    size={24}
                    color="#8e24aa"
                  />
                </TouchableOpacity>
              )}
              style={styles.memberList}
              keyExtractor={(item) => item.id}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createGroup}
                style={styles.createButton}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
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
  headerText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  userProfile: {
    flexDirection: "row",
    alignItems: "center",
  },
  userImageHeader: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  userNameHeader: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    margin: 10,
    paddingHorizontal: 15,
    width: "90%",
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 10,
  },
  usersHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    width: "98%",
    marginVertical: 8,
    marginLeft: 15,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  groupsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "98%",
    marginVertical: 8,
    marginLeft: 15,
  },
  createGroupButton: {
    backgroundColor: "#8e24aa",
    padding: 8,
    borderRadius: 20,
  },
  list: {
    width: "98%",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  userItem: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.9)",
    margin: 5,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userText: {
    flex: 1,
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  groupItem: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.9)",
    margin: 5,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  memberText: {
    fontSize: 16,
    color: "#333",
  },
  memberList: {
    maxHeight: 300,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  createButton: {
    backgroundColor: "#8e24aa",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});