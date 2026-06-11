import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import ProductCard from '../app/components/ProductCard';

export default function HomeScreen() {
  const router = useRouter();
  
  const [products, setProducts] = useState<any[]>([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Chargement parallèle (NestJS) ──
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productRes, alertRes] = await Promise.all([
          api.get('/products').catch(() => ({ data: [] })),
          api.get('/alert').catch(() => ({ data: { message: '' } }))
        ]);
        
        setProducts(productRes.data);
        if (alertRes.data?.message) {
          setAlertMessage(alertRes.data.message);
        }
      } catch (err) {
        console.error('Erreur de chargement API :', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* ── ALERTE DYNAMIQUE ── */}
      {alertMessage ? (
        <View style={styles.alertBanner}>
          <View style={styles.alertDotContainer}>
            <View style={styles.alertDot} />
          </View>
          <Text style={styles.alertText} numberOfLines={1}>{alertMessage}</Text>
        </View>
      ) : null}

      {/* ── HERO SECTION ── */}
      <View style={styles.heroSection}>
        <Feather name="shield" size={48} color="#06b6d4" style={{ marginBottom: 16 }} />
        <Text style={styles.heroTitle}>Sécurisez votre <Text style={{ color: '#06b6d4' }}>infrastructure</Text></Text>
        <Text style={styles.heroSubtitle}>Les solutions SOC et cyberdéfense les plus avancées pour votre entreprise.</Text>
      </View>

      {/* ── TOP PRODUITS ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Feather name="shield" size={24} color="#06b6d4" />
          <Text style={styles.sectionTitle}>Top Produits</Text>
        </View>
        <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push('/category')}>
          <Text style={styles.seeAllText}>TOUT VOIR</Text>
          <Feather name="arrow-right" size={14} color="#06b6d4" />
        </TouchableOpacity>
      </View>

      {/* ── LISTE DES PRODUITS ── */}
      <View style={styles.productList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Chargement du catalogue...</Text>
          </View>
        ) : products.length > 0 ? (
          products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="zap-off" size={48} color="#2D333B" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
            <Text style={styles.emptySubtitle}>Vérifiez la connexion au backend NestJS.</Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  content: { padding: 20, paddingBottom: 40 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)', padding: 12, borderRadius: 12, marginBottom: 24 },
  alertDotContainer: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#06b6d4' },
  alertText: { color: '#06b6d4', fontWeight: 'bold', flex: 1 },
  heroSection: { alignItems: 'center', backgroundColor: '#1C2128', padding: 30, borderRadius: 20, borderWidth: 1, borderColor: '#2D333B', marginBottom: 30 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  heroSubtitle: { color: '#A0A0A0', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#2D333B', paddingBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { color: '#06b6d4', fontSize: 12, fontWeight: 'bold' },
  productList: { width: '100%' },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { color: '#06b6d4', marginTop: 12, fontWeight: 'bold' },
  emptyState: { backgroundColor: '#1C2128', padding: 40, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2D333B' },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#A0A0A0', fontSize: 12, textAlign: 'center' },
});