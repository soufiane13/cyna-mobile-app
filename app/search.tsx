import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Modal, SafeAreaView 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import ProductCard from '../app/components/ProductCard';

export default function SearchScreen() {
  const router = useRouter();
  
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('TOUT');
  const [sortBy, setSortBy] = useState('recent');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await api.get('/products');
        setAllProducts(res.data || []);
      } catch (err: any) {
        setError("Impossible de charger les données.");
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  const filteredProducts = allProducts.filter(product => {
    const nom = product.nom || product.name || "";
    const desc = product.description || "";
    
    const matchesSearch = nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'TOUT' 
      || nom.toUpperCase().includes(activeCategory) 
      || desc.toUpperCase().includes(activeCategory);

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const priceA = parseFloat(a.prix || a.price || 0);
    const priceB = parseFloat(b.prix || b.price || 0);
    
    if (sortBy === 'price_asc') return priceA - priceB;
    if (sortBy === 'price_desc') return priceB - priceA;
    return b.id - a.id;
  });

  const categories = ['TOUT', 'SOC', 'EDR', 'XDR', 'AUDIT'];

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={24} color="#A0A0A0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recherche</Text>
        <TouchableOpacity onPress={() => setShowFiltersModal(true)} style={styles.iconBtn}>
          <Feather name="sliders" size={20} color="#06b6d4" />
        </TouchableOpacity>
      </View>

      {/* BARRE DE RECHERCHE */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#A0A0A0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une solution..."
          placeholderTextColor="#555"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearBtn}>
            <Feather name="x" size={16} color="#A0A0A0" />
          </TouchableOpacity>
        )}
      </View>

      {/* PILULES DE CATÉGORIES */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat}
              style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.resultsCountBar}>
        <Text style={styles.resultsText}>
          <Text style={styles.resultsNumber}>{filteredProducts.length}</Text> service(s) trouvé(s)
        </Text>
      </View>

      {/* LISTE RÉSULTATS */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#06b6d4" style={{marginTop: 40}} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="search" size={48} color="#2D333B" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Aucune correspondance</Text>
          </View>
        ) : (
          filteredProducts.map(product => <ProductCard key={product.id} product={product} />)
        )}
      </ScrollView>

      {/* MODAL DE TRI */}
      <Modal visible={showFiltersModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trier et Filtrer</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={24} color="#A0A0A0" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.sortOption, sortBy === 'recent' && styles.sortOptionActive]} onPress={() => setSortBy('recent')}>
              <Text style={[styles.sortOptionText, sortBy === 'recent' && styles.sortOptionTextActive]}>Plus récents d'abord</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortOption, sortBy === 'price_asc' && styles.sortOptionActive]} onPress={() => setSortBy('price_asc')}>
              <Text style={[styles.sortOptionText, sortBy === 'price_asc' && styles.sortOptionTextActive]}>Prix : Croissant</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sortOption, sortBy === 'price_desc' && styles.sortOptionActive]} onPress={() => setSortBy('price_desc')}>
              <Text style={[styles.sortOptionText, sortBy === 'price_desc' && styles.sortOptionTextActive]}>Prix : Décroissant</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFiltersModal(false)}>
              <Text style={styles.modalApplyBtnText}>APPLIQUER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2128', marginHorizontal: 20, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2D333B', paddingHorizontal: 16, height: 50 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, height: '100%' },
  clearBtn: { padding: 4 },
  categoriesWrapper: { marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#2D333B', paddingBottom: 16 },
  categoriesScroll: { paddingHorizontal: 20, gap: 10 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B' },
  categoryPillActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: '#06b6d4' },
  categoryText: { color: '#A0A0A0', fontSize: 12, fontWeight: 'bold' },
  categoryTextActive: { color: '#06b6d4' },
  resultsCountBar: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  resultsText: { color: '#A0A0A0', fontSize: 13, fontWeight: '500' },
  resultsNumber: { color: '#fff', fontWeight: '900', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 60 },
  emptyContainer: { alignItems: 'center', backgroundColor: '#1C2128', padding: 40, borderRadius: 20, borderWidth: 1, borderColor: '#2D333B', marginTop: 20 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 14, 20, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C2128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#2D333B' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  modalCloseBtn: { padding: 4 },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  sortOptionActive: { borderBottomColor: 'rgba(6, 182, 212, 0.3)' },
  sortOptionText: { color: '#A0A0A0', fontSize: 15, fontWeight: '600' },
  sortOptionTextActive: { color: '#06b6d4', fontWeight: 'bold' },
  modalApplyBtn: { backgroundColor: '#06b6d4', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  modalApplyBtnText: { color: '#0B0E14', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});