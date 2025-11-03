import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface MenuScreenProps {
  navigation: any;
}

export default function MenuScreen({ navigation }: MenuScreenProps) {
  const menuItems = [
    {
      title: 'Goals',
      subtitle: 'Nutrition Goals & Targets',
      icon: 'target',
      iconType: 'MaterialCommunityIcons',
      onPress: () => navigation.navigate('Goals'),
    },
    {
      title: 'Profile',
      subtitle: 'Profile Settings',
      icon: 'person-outline',
      iconType: 'Ionicons',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      title: 'Account',
      subtitle: 'Account Settings & Logout',
      icon: 'settings-outline',
      iconType: 'Ionicons',
      onPress: () => navigation.navigate('Account'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Menu</Text>
        
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.iconContainer}>
                    {item.iconType === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons name={item.icon as any} size={24} color="#0090A3" />
                    ) : (
                      <Ionicons name={item.icon as any} size={24} color="#0090A3" />
                    )}
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CDC4B7" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CDC4B7',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A2A2A',
    marginBottom: 30,
  },
  menuContainer: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#D0C7B8',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3EEE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
