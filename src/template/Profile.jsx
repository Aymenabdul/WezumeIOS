import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  View,
  TextInput,
  ImageBackground,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Back from 'react-native-vector-icons/AntDesign';
// No longer need apiClient or ActivityIndicator/Modal here

// --- Static Data (Unchanged) ---
const experienceOptions = [
  { label: '0-1 years', value: '0-1' }, { label: '1-3 years', value: '1-3' },
  { label: '3-5 years', value: '3-5' }, { label: '5-10 years', value: '5-10' },
  { label: '10-15 years', value: '10-15' }, { label: '15+ years', value: '15+' },
];
const cityOptions = ['New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata'];
const industries = [
  'Banking & Finance', 'Biotechnology', 'Construction', 'Consumer Goods', 'Education', 'Energy',
  'Healthcare', 'Media & Entertainment', 'Hospitality', 'Information Technology (IT)', 'Insurance',
  'Manufacturing', 'Non-Profit', 'Real Estate', 'Retail', 'Transportation', 'Travel & Tourism',
  'Textiles', 'Logistics & Supply Chain', 'Sports', 'E-commerce', 'Consulting', 'Advertising & Marketing',
  'Architecture', 'Arts & Design', 'Environmental Services', 'Human Resources', 'Legal',
  'Management', 'Telecommunications',
];

// --- Memoized Child Components (Unchanged) ---
const GlassInput = memo(({ value, onChangeText, placeholder }) => (
  <View style={styles.input.container}>
    <TextInput style={styles.input.text} placeholder={placeholder} placeholderTextColor="rgba(0, 0, 0, 0.4)" value={value} onChangeText={onChangeText} />
  </View>
));
const GlassDropdown = memo(({ label, selectedItems, onSelectItem, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const filteredOptions = useMemo(() => options.filter(opt => opt.label.toLowerCase().includes(searchText.toLowerCase())), [options, searchText]);
  const displayText = selectedItems.length > 0 ? selectedItems.join(', ') : label;
  return (
    <View>
      <TouchableOpacity onPress={() => setIsOpen(true)}>
        <View style={styles.input.container}>
          <Text style={styles.dropdown.buttonText} numberOfLines={1}>{displayText}</Text>
          <Icon name="chevron-down" size={24} color="#333" />
        </View>
      </TouchableOpacity>
      <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.dropdown.modalBackdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdown.modalContent}>
            <TextInput style={styles.dropdown.searchInput} placeholder={`Search ${label}...`} placeholderTextColor="rgba(0, 0, 0, 0.4)" value={searchText} onChangeText={setSearchText}/>
            <ScrollView nestedScrollEnabled>
              {filteredOptions.map(option => (
                <TouchableOpacity key={option.value} style={styles.dropdown.option} onPress={() => onSelectItem(option.value)}>
                  <Text style={styles.dropdown.optionText}>{option.label}</Text>
                  <Icon name={selectedItems.includes(option.value) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color="#007AFF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

// --- Main Component ---
const FilterScreen = () => {
  const [formState, setFormState] = useState({
    transcriptionKeywords: '',
    selectedJobId: '',
    college: '',
    experience: [],
    industry: [],
    city: [],
  });
  const navigation = useNavigation();

  const handleFormChange = useCallback((field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMultiSelect = useCallback((field, value) => {
    setFormState(prevState => {
      const currentSelection = prevState[field];
      const newSelection = currentSelection.includes(value) ? currentSelection.filter(item => item !== value) : [...currentSelection, value];
      return { ...prevState, [field]: newSelection };
    });
  }, []);

  const handleFilter = useCallback(() => {
    // ✅ FIX: This function is now much simpler.
    
    // 1. Build the filter criteria object.
    const filterData = {};
    if (formState.experience.length > 0) filterData.experience = formState.experience.join(',');
    if (formState.industry.length > 0) filterData.industry = formState.industry.join(',');
    if (formState.city.length > 0) filterData.city = formState.city.join(',');
    if (formState.transcriptionKeywords) filterData.transcriptionKeywords = formState.transcriptionKeywords;
    if (formState.selectedJobId) filterData.jobId = formState.selectedJobId;
    if (formState.college) filterData.college = formState.college;

    // 2. Navigate and pass ONLY the filter criteria. The results screen will do the fetching.
    navigation.navigate('Filtered', { 
        filterCriteria: filterData
    });
  }, [formState, navigation]);

  return (
    <ImageBackground style={styles.backgroundImage} source={require('./assets/login1.jpg')}>
      <View style={styles.header.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.header.backButton}>
          <Back name={'arrowleft'} size={30} color={'#FFFFFF'} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.formContainer}>
          <BlurView style={styles.glass.blurView} blurType="light" blurAmount={15} />
          <Text style={styles.header.title}>Find Your Match</Text>
          <GlassInput placeholder="Filter by keywords (e.g., sales, python)" value={formState.transcriptionKeywords} onChangeText={(text) => handleFormChange('transcriptionKeywords', text)}/>
          <GlassInput placeholder="Search by Job ID" value={formState.selectedJobId} onChangeText={(text) => handleFormChange('selectedJobId', text)} />
          <GlassDropdown label="Select Experience" options={experienceOptions} selectedItems={formState.experience} onSelectItem={(value) => handleMultiSelect('experience', value)} />
          <GlassDropdown label="Select Industry" options={industries.map(i => ({ label: i, value: i }))} selectedItems={formState.industry} onSelectItem={(value) => handleMultiSelect('industry', value)} />
          <GlassDropdown label="Select City" options={cityOptions.map(c => ({ label: c, value: c }))} selectedItems={formState.city} onSelectItem={(value) => handleMultiSelect('city', value)} />
        </View>

        <TouchableOpacity onPress={handleFilter}>
          <BlurView style={styles.filterButton.blur} blurType="light" blurAmount={15}>
            <Text style={styles.filterButton.text}>Filter</Text>
          </BlurView>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  backgroundImage: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 40 : 80 },
  header: { container: { position: 'absolute', top: Platform.OS === 'android' ? StatusBar.currentHeight : 40, left: 0, right: 0, zIndex: 1 }, backButton: { position: 'absolute', left: 20, top: 10, padding: 5 }, title: { fontSize: 29, fontWeight: 'bold', paddingBottom: '5%', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 } },
  formContainer: { borderRadius: 20, overflow: 'hidden', borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 1, padding: 20, marginBottom: 20 },
  input: { container: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', height: 55, paddingHorizontal: 15 }, text: { flex: 1, fontSize: 18, color: '#000000' } },
  glass: { blurView: { ...StyleSheet.absoluteFillObject } },
  dropdown: { buttonText: { flex: 1, fontSize: 18, color: '#333', fontWeight: '500' }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, modalContent: { width: '90%', maxHeight: '70%', borderRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden' }, searchInput: { height: 50, fontSize: 16, paddingHorizontal: 20, backgroundColor: '#f0f0f0', borderRadius: 10, margin: 10, color: '#000' }, option: { paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }, optionText: { fontSize: 18, fontWeight: '600', color: '#000' } },
  filterButton: { blur: { borderRadius: 15, overflow: 'hidden', borderColor: 'rgba(255, 255, 255, 0.3)', borderWidth: 1, paddingVertical: 15, alignItems: 'center', marginTop: 10 }, text: { color: '#FFFFFF', fontSize: 27, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 } },
});

export default FilterScreen;