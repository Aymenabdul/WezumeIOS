import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Back from 'react-native-vector-icons/AntDesign';
import UserIcon from 'react-native-vector-icons/FontAwesome';
import VideoIcon from 'react-native-vector-icons/Feather';
import RecruiterIcon from 'react-native-vector-icons/FontAwesome5';
import apiClient from './api';

const Analytic = () => {
    const navigation = useNavigation();
    const [totalCounts, setTotalCounts] = useState({
        videos: 0,
        users: 0,
        recruiters: 0,
    });
    const [users, setUsers] = useState([]);
    const [recruiters, setRecruiters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [countsError, setCountsError] = useState(false);
    const [usersError, setUsersError] = useState(false);
    const [recruitersError, setRecruitersError] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setCountsError(false);
        setUsersError(false);
        setRecruitersError(false);
        
        const countPromises = [
            apiClient.get('/api/videos/video-count'),
            apiClient.get('/api/users/signup-count'),
            apiClient.get('/api/users/recruiters-count'),
        ];
        
        const dataPromises = [
            apiClient.get('/api/weekly-active-users'),
            apiClient.get('/api/users/recruiters'),
        ];
        
        try {
            const [countsResults, dataResults] = await Promise.all([
                Promise.allSettled(countPromises),
                Promise.allSettled(dataPromises)
            ]);
            
            if (countsResults[0].status === 'fulfilled' && countsResults[1].status === 'fulfilled' && countsResults[2].status === 'fulfilled') {
                setTotalCounts({
                    videos: countsResults[0].value.data,
                    users: countsResults[1].value.data,
                    recruiters: countsResults[2].value.data,
                });
            } else {
                setCountsError(true);
            }
            
            if (dataResults[0].status === 'fulfilled') {
                setUsers(dataResults[0].value.data);
            } else {
                setUsersError(true);
            }
            
            if (dataResults[1].status === 'fulfilled') {
                setRecruiters(dataResults[1].value.data);
            } else {
                setRecruitersError(true);
            }

        } catch (err) {
            console.error('Unexpected error during data fetch:', err);
            setCountsError(true);
            setUsersError(true);
            setRecruitersError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const renderProgressBar = (count, max) => {
        const progress = Math.min((count / max) * 100, 100);
        let color = 'green';
        if (count < max * 0.3) {
            color = 'red';
        } else if (count <= max * 0.7) {
            color = 'orange';
        }

        return (
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
        );
    }
    
    return (
        <View style={styles.mainContainer}>
            <ImageBackground source={require('./assets/login.jpg')} style={styles.backgroundImage}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Back name={'leftcircle'} size={24} color="#ffffff" />
                </TouchableOpacity>
            </ImageBackground>

            <ScrollView style={styles.scrollContainer}>
                <View style={styles.analyticsCard}>
                    <Text style={styles.cardTitle}>Platform Overview</Text>
                    {countsError ? (
                        <Text style={styles.partialErrorText}>Failed to load platform counts.</Text>
                    ) : (
                        <>
                            <View style={styles.progressItem}>
                                <View style={styles.progressHeader}>
                                    <View style={styles.progressLabelContainer}>
                                        <UserIcon name="user" size={16} color="#4a90e2" />
                                        <Text style={styles.progressLabel}>Users</Text>
                                    </View>
                                    <Text style={styles.progressCount}>{totalCounts.users}/1k</Text>
                                </View>
                                {renderProgressBar(totalCounts.users, 1000)}
                            </View>

                            <View style={styles.progressItem}>
                                <View style={styles.progressHeader}>
                                    <View style={styles.progressLabelContainer}>
                                        <VideoIcon name="video" size={16} color="#4a90e2" />
                                        <Text style={styles.progressLabel}>Videos</Text>
                                    </View>
                                    <Text style={styles.progressCount}>{totalCounts.videos}/1K</Text>
                                </View>
                                {renderProgressBar(totalCounts.videos, 1000)}
                            </View>

                            <View style={styles.progressItem}>
                                <View style={styles.progressHeader}>
                                    <View style={styles.progressLabelContainer}>
                                        <RecruiterIcon name="user-tie" size={16} color="#4a90e2" />
                                        <Text style={styles.progressLabel}>Recruiters</Text>
                                    </View>
                                    <Text style={styles.progressCount}>{totalCounts.recruiters}/1K</Text>
                                </View>
                                {renderProgressBar(totalCounts.recruiters, 1000)}
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.logCard}>
                    <Text style={styles.cardTitle}>User Activity Log</Text>
                    {usersError ? (
                        <Text style={styles.partialErrorText}>Failed to load user activity log.</Text>
                    ) : (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>User ID</Text>
                                <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Name</Text>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Job</Text>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Active Time</Text>
                            </View>
                            <ScrollView style={styles.tableBody}>
                                {users.map((item, index) => (
                                    <View key={item.userId} style={[styles.tableRow, index % 2 !== 0 && styles.tableRowAlt]}>
                                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.userId}</Text>
                                        <Text style={[styles.tableCell, { flex: 2.5 }]}>{item.name}</Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]}>{item.jobOption}</Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]}>{item.formattedTime}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </View>

                <View style={styles.logCard}>
                    <Text style={styles.cardTitle}>Recruiter Log</Text>
                    {recruitersError ? (
                        <Text style={styles.partialErrorText}>Failed to load recruiter log.</Text>
                    ) : (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Recruiter ID</Text>
                                <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Name</Text>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Job</Text>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Company</Text>
                            </View>
                            <ScrollView style={styles.tableBody}>
                                {recruiters.map((item, index) => (
                                    <View key={item.id} style={[styles.tableRow, index % 2 !== 0 && styles.tableRowAlt]}>
                                        <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.id}</Text>
                                        <Text style={[styles.tableCell, { flex: 2.5 }]}>{item.firstName}</Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]}>{item.jobOption}</Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]}>{item.currentEmployer}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </View>
                
                <TouchableOpacity onPress={fetchData} style={styles.bottomRetryButton}>
                    <Text style={styles.bottomRetryText}>Refresh Data</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f0f4f7', // Lighter, more modern gray
    },
    backgroundImage: {
        height: 150,
        justifyContent: 'flex-start',
        paddingTop: 50,
        paddingLeft: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        flex: 1,
        padding: 15,
        marginTop: -30,
    },
    analyticsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 6,
    },
    logCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 6,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2c3e50', // Darker text for better contrast
        marginBottom: 15,
    },
    progressItem: {
        marginBottom: 15,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressLabel: {
        color: '#5c5c5c', // Neutral gray for labels
        fontSize: 15,
        fontWeight: '600',
    },
    progressCount: {
        color: '#5c5c5c',
        fontSize: 15,
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#e9eef2', // Lighter bar background
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa', // Lighter header
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    tableHeaderText: {
        fontWeight: '700',
        color: '#4a90e2', // Brand color for headers
        textAlign: 'center',
    },
    tableBody: {
        maxHeight: 250,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb', // Lighter border
    },
    tableRowAlt: {
        backgroundColor: '#fefefe',
    },
    tableCell: {
        color: '#34495e', // Darker cell text
        fontSize: 12,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f7',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#5c5c5c',
    },
    partialErrorText: {
        color: '#e74c3c', // Red for errors
        fontSize: 14,
        textAlign: 'center',
        padding: 10,
    },
    bottomRetryButton: {
        backgroundColor: '#4a90e2',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#4a90e2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 8,
        marginBottom:'10%',
    },
    bottomRetryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f7',
    },
    errorText: {
        fontSize: 16,
        color: '#e74c3c',
        marginBottom: 10,
    },
    retryButton: {
        color: '#4a90e2',
        textDecorationLine: 'underline',
        fontWeight: 'bold',
    },
});

export default Analytic;