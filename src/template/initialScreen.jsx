import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Initial = () => {
    const navigation = useNavigation();
    const [jobOption, setJobOption] = useState(undefined); // Start with undefined

    // This effect runs once to load data from storage
    useEffect(() => {
        const loadDataFromStorage = async () => {
            try {
                const apiJobOption = await AsyncStorage.getItem('jobOption');
                console.log(`Job option found in storage: ${apiJobOption}`);
                setJobOption(apiJobOption);
            } catch (error) {
                console.error('Error loading user data from AsyncStorage', error);
                setJobOption(null); // Default to null on error
            }
        };

        loadDataFromStorage();
    }, []);

    // This second effect runs ONLY when the jobOption state changes
    useEffect(() => {
        // We wait until the storage check is complete (jobOption is not undefined)
        if (jobOption !== undefined) {
            if (jobOption === 'Employee' || jobOption === 'Entrepreneur' || jobOption === 'Freelancer') {
                navigation.reset({ index: 0, routes: [{ name: 'home1' }] });
            } else if (jobOption === 'Employer' || jobOption === 'Investor') {
                navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
            
            // --- ADDED: Logic for Placement Roles ---
            } else if (jobOption === 'placementDrive' || jobOption === 'Academy') {
                navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
            
            } else {
                // If jobOption is null or any other value, go to Onboarding/Login
                navigation.reset({ index: 0, routes: [{ name: 'OnboardingScreen' }] });
            }
        }
    }, [jobOption, navigation]);

    // Render a loading spinner while the check is in progress
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#ffffff" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
});

export default Initial;