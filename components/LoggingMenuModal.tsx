import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationContainerRef } from '@react-navigation/native';

type LoggingMenuModalProps = {
    visible: boolean;
    onClose: () => void;
    navigationRef: React.RefObject<NavigationContainerRef<any>>;
};

export default function LoggingMenuModal({ visible, onClose, navigationRef }: LoggingMenuModalProps) {
    const handleOption = (action: 'camera' | 'gallery' | 'manual') => {
        onClose();
        setTimeout(() => {
            // Use root ref: navigate to Nutrition tab inside MainApp (modal is outside tab navigator)
            navigationRef.current?.navigate('MainApp', {
                screen: 'Nutrition',
                params: { loggingAction: action },
            });
        }, 150);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Log food</Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => handleOption('camera')}
                        >
                            <View style={styles.menuItemIcon}>
                                <Ionicons name="camera" size={24} color="#0090A3" />
                            </View>
                            <Text style={styles.menuItemText}>Log food with your camera</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => handleOption('gallery')}
                        >
                            <View style={styles.menuItemIcon}>
                                <Ionicons name="image" size={24} color="#0090A3" />
                            </View>
                            <Text style={styles.menuItemText}>Log food with an existing pic</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => handleOption('manual')}
                        >
                            <View style={styles.menuItemIcon}>
                                <Ionicons name="add-circle" size={24} color="#0090A3" />
                            </View>
                            <Text style={styles.menuItemText}>Log food manually</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: '#fff',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    modalContent: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2A2A2A',
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        marginBottom: 12,
    },
    menuItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E6F7F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuItemText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#2A2A2A',
    },
    cancelButton: {
        marginTop: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
});
