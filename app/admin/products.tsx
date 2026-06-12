import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, SafeAreaView, Modal, Switch 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

export default function AdminProductsScreen() {
  const router = useRouter();

  // --- ÉTATS ---
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'category', direction: 'asc' });

  // Modale (Ajout / Édition)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    name: '', description: '', price: '0', category: 'EDR', stock_virtuel: '100', image_url: '', requires_quote: false 
  });
  const [saving, setSaving] = useState(false);

  // --- CHARGEMENT ---
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger le catalogue.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE TRI ET FILTRES ---
  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortedProducts = () => {
    if (!Array.isArray(products)) return [];
    
    let filterData = products.filter(p => {
      const matchSearch = String(p.name || p.nom || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'all' || String(p.category || p.categorie || 'EDR').toUpperCase() === categoryFilter.toUpperCase();
      return matchSearch && matchCat;
    });
    
    return filterData.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      
      if (sortConfig.key === 'name') {
        valA = String(a.name || a.nom || '').toLowerCase();
        valB = String(b.name || b.nom || '').toLowerCase();
      } else if (sortConfig.key === 'price') {
        valA = parseFloat(a.price || a.prix || 0);
        valB = parseFloat(b.price || b.prix || 0);
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // --- ACTIONS (CRUD) ---
  const openModal = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || product.nom || '',
        description: product.description || '',
        price: String(product.price || product.prix || 0),
        category: product.category || 'EDR',
        stock_virtuel: String(product.stock_virtuel !== undefined ? product.stock_virtuel : 100),
        image_url: product.image_url || '',
        requires_quote: product.requires_quote || false
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '0', category: 'EDR', stock_virtuel: '100', image_url: '', requires_quote: false });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      return Alert.alert("Erreur", "Veuillez remplir le nom et la description.");
    }

    setSaving(true);
    const method = editingProduct ? 'put' : 'post';
    const url = editingProduct ? `/products/${editingProduct.id}` : '/products';
    const numericPrice = parseFloat(formData.price) || 0;

    const payload = {
      name: formData.name,
      nom: formData.name,
      description: formData.description,
      prix: numericPrice,
      price_monthly: numericPrice,
      price_yearly: numericPrice * 12 * 0.8,
      category: formData.category,
      stock_virtuel: parseInt(formData.stock_virtuel) || 0,
      image_url: formData.image_url,
      requires_quote: formData.requires_quote
    };

    try {
      await api[method](url, payload);
      setIsModalOpen(false);
      loadProducts();
      Alert.alert("Succès", `Service ${editingProduct ? 'modifié' : 'créé'} avec succès !`);
    } catch (err: any) {
      Alert.alert("Erreur serveur", err.response?.data?.message || "Impossible de sauvegarder le produit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = (id: string | number) => {
    Alert.alert(
      "Suppression",
      "Êtes-vous sûr de vouloir supprimer définitivement ce service ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => executeDelete(id) }
      ]
    );
  };

  const executeDelete = async (id: string | number) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
      Alert.alert("Succès", "Service supprimé.");
    } catch (err) {
      Alert.alert("Erreur", "Impossible de supprimer ce service.");
    }
  };

  const sortedProducts = getSortedProducts();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Feather name="arrow-left" size={24} color="#A0A0A0" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Catalogue</Text>
          <Text style={styles.headerSubtitle}>Total : {sortedProducts.length}</Text>
        </View>
        <TouchableOpacity onPress={() => openModal()} style={styles.btnAdd}>
          <Feather name="plus" size={20} color="#0B0E14" />
        </TouchableOpacity>
      </View>

      {/* FILTRES */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#A0A0A0" style={{ marginLeft: 12 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Rechercher un service..."
            placeholderTextColor="#555"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['all', 'EDR', 'XDR', 'SOC'].map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.filterPill, categoryFilter === cat && styles.filterPillActive]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.filterPillText, categoryFilter === cat && styles.filterPillTextActive]}>
                {cat === 'all' ? 'TOUTES CATÉGORIES' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTE PRODUITS */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
          </View>
        ) : sortedProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="grid" size={40} color="#2D333B" style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>Aucun service trouvé.</Text>
          </View>
        ) : (
          sortedProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
                  <View style={styles.productIconBox}>
                    <Text style={styles.productIconText}>{String(product.name || product.nom || 'CY').substring(0,2).toUpperCase()}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name || product.nom}</Text>
                    <Text style={styles.productCat}>{product.category || 'N/A'}</Text>
                  </View>
                </View>
                {product.stock_virtuel > 0 
                  ? <View style={styles.badgeActive}><Text style={styles.badgeActiveText}>ACTIF</Text></View>
                  : <View style={styles.badgeOut}><Text style={styles.badgeOutText}>ÉPUISÉ</Text></View>
                }
              </View>

              <View style={styles.productFooter}>
                <View>
                  {product.requires_quote ? (
                    <Text style={styles.priceQuote}>SUR DEVIS</Text>
                  ) : (
                    <Text style={styles.productPrice}>{parseFloat(product.price || product.prix || 0).toFixed(2)} € <Text style={styles.priceUnit}>/ mois</Text></Text>
                  )}
                  <Text style={styles.stockText}>Stock: {product.stock_virtuel}</Text>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => openModal(product)} style={styles.actionBtnEdit}>
                    <Feather name="edit-2" size={16} color="#06b6d4" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteConfirm(product.id)} style={styles.actionBtnDelete}>
                    <Feather name="trash-2" size={16} color="#FF3B3B" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODALE CRUD */}
      <Modal visible={isModalOpen} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Modifier le service' : 'Ajouter un service'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={{padding: 4}}>
                <Feather name="x" size={24} color="#A0A0A0" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>NOM DU SERVICE</Text>
                <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
              </View>
              
              <View>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} />
              </View>

              <View style={{flexDirection: 'row', gap: 12}}>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>PRIX MENSUEL (€)</Text>
                  <TextInput style={[styles.input, formData.requires_quote && styles.inputDisabled]} keyboardType="numeric" value={formData.price} editable={!formData.requires_quote} onChangeText={t => setFormData({...formData, price: t})} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>STOCK VIRTUEL</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={formData.stock_virtuel} onChangeText={t => setFormData({...formData, stock_virtuel: t})} />
                </View>
              </View>

              <View>
                <Text style={styles.label}>CATÉGORIE</Text>
                <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                  {['EDR', 'XDR', 'SOC'].map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.catSelectBtn, formData.category === cat && styles.catSelectBtnActive]}
                      onPress={() => setFormData({...formData, category: cat})}
                    >
                      <Text style={[styles.catSelectBtnText, formData.category === cat && styles.catSelectBtnTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.labelSwitch}>SUR DEVIS (PRIX CACHÉ)</Text>
                  <Text style={styles.descSwitch}>Masque le prix et force le contact.</Text>
                </View>
                <Switch 
                  value={formData.requires_quote} 
                  onValueChange={v => setFormData({...formData, requires_quote: v, price: v ? '0' : formData.price})} 
                  trackColor={{ false: "#2D333B", true: "#06b6d4" }}
                />
              </View>

              <View>
                <Text style={styles.label}>URL DE L'IMAGE (Optionnel)</Text>
                <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#555" value={formData.image_url} onChangeText={t => setFormData({...formData, image_url: t})} />
              </View>

              <TouchableOpacity style={styles.modalApplyBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#0B0E14" /> : <Text style={styles.modalApplyBtnText}>SAUVEGARDER</Text>}
              </TouchableOpacity>
            </ScrollView>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  btnBack: { padding: 8, marginRight: 12 },
  headerTitleBox: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'black', letterSpacing: 1 },
  headerSubtitle: { color: '#06b6d4', fontSize: 12, fontWeight: 'bold' },
  btnAdd: { backgroundColor: '#06b6d4', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  filtersContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B', backgroundColor: '#1C2128' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, height: 44, marginBottom: 16 },
  searchInput: { flex: 1, color: '#fff', paddingHorizontal: 12, fontSize: 14 },
  
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 8 },
  filterPillActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: '#06b6d4' },
  filterPillText: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  filterPillTextActive: { color: '#06b6d4' },

  listContent: { padding: 16, paddingBottom: 60 },
  centerContainer: { py: 40, alignItems: 'center' },
  emptyCard: { backgroundColor: '#1C2128', padding: 40, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2D333B' },
  emptyText: { color: '#A0A0A0', fontSize: 14 },

  productCard: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 16, padding: 16, marginBottom: 12 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  productIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', alignItems: 'center', justifyContent: 'center' },
  productIconText: { color: '#06b6d4', fontWeight: 'black', fontSize: 14 },
  productName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  productCat: { color: '#A0A0A0', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  
  badgeActive: { backgroundColor: 'rgba(0, 255, 148, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeActiveText: { color: '#00FF94', fontSize: 9, fontWeight: 'black' },
  badgeOut: { backgroundColor: 'rgba(255, 59, 59, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeOutText: { color: '#FF3B3B', fontSize: 9, fontWeight: 'black' },

  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  productPrice: { color: '#06b6d4', fontSize: 18, fontWeight: 'black', fontFamily: 'monospace' },
  priceUnit: { fontSize: 10, color: '#A0A0A0', fontFamily: 'sans-serif' },
  priceQuote: { color: '#F5A623', fontSize: 14, fontWeight: 'bold' },
  stockText: { color: '#555', fontSize: 11, marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtnEdit: { padding: 8, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: 8 },
  actionBtnDelete: { padding: 8, backgroundColor: 'rgba(255, 59, 59, 0.1)', borderRadius: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 14, 20, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C2128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#2D333B', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'black' },
  
  label: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, height: 48, paddingHorizontal: 16, color: '#fff', fontSize: 14 },
  inputDisabled: { opacity: 0.5 },

  catSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B' },
  catSelectBtnActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: '#06b6d4' },
  catSelectBtnText: { color: '#A0A0A0', fontSize: 12, fontWeight: 'bold' },
  catSelectBtnTextActive: { color: '#06b6d4' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0B0E14', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2D333B' },
  labelSwitch: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  descSwitch: { color: '#A0A0A0', fontSize: 11, marginTop: 4 },

  modalApplyBtn: { backgroundColor: '#06b6d4', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalApplyBtnText: { color: '#0B0E14', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});